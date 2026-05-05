/**
 * tests/unit/s710-whatsapp-scheduler.test.mjs — S710 WhatsApp Scheduler A/B
 *
 * Tests for the WhatsApp message scheduler + A/B wiring in whatsapp.js.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/core/sync.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(),
}));
vi.mock("../../src/services/realtime.js", () => ({
  subscribeToTable: vi.fn(),
  unsubscribeAll: vi.fn(),
}));
vi.mock("../../src/core/ui.js", () => ({
  showToast: vi.fn(),
  announce: vi.fn(),
}));
vi.mock("../../src/services/wa-messaging.js", () => ({
  personalizeMessage: vi.fn((t) => t),
  getVariableHints: vi.fn(() => []),
}));

import { initStore } from "../../src/core/store.js";
import {
  scheduleWhatsAppMessage,
  createAbTestMessages,
  cancelScheduledMessage,
  getSchedulerQueue,
  getReadyMessages,
  getAbTestResults,
  getQueueSummary,
  resetSchedulerIdCounter,
} from "../../src/sections/whatsapp.js";

beforeEach(() => {
  initStore({ wedding_v1_wa_schedule: { value: [] } });
  resetSchedulerIdCounter(0);
});

describe("scheduleWhatsAppMessage", () => {
  it("adds a message to the queue", () => {
    scheduleWhatsAppMessage("+972541234567", "tmpl_invite", "2025-12-01T10:00:00Z");
    expect(getSchedulerQueue()).toHaveLength(1);
  });

  it("normalises the phone via cleanPhone", () => {
    scheduleWhatsAppMessage("054-123-4567", "tmpl_invite", "2025-12-01T10:00:00Z");
    const msg = getSchedulerQueue()[0];
    expect(msg.recipientPhone).toBe("972541234567");
  });

  it("sets default variant to control", () => {
    scheduleWhatsAppMessage("+972541234567", "tmpl_invite", "2025-12-01T10:00:00Z");
    expect(getSchedulerQueue()[0].variant).toBe("control");
  });

  it("accepts custom variant", () => {
    scheduleWhatsAppMessage("+972541234567", "tmpl_A", "2025-12-01T10:00:00Z", "A");
    expect(getSchedulerQueue()[0].variant).toBe("A");
  });

  it("returns the created message", () => {
    const msg = scheduleWhatsAppMessage("+972541234567", "tmpl_1", "2025-12-01T10:00:00Z");
    expect(msg.id).toMatch(/^sched_/);
    expect(msg.status).toBe("queued");
  });
});

describe("createAbTestMessages", () => {
  it("splits phones into A and B groups", () => {
    const phones = ["054-111-1111", "054-222-2222", "054-333-3333", "054-444-4444"];
    const { a, b } = createAbTestMessages(phones, "tmpl_A", "tmpl_B", "2025-12-01T10:00:00Z");
    expect(a).toHaveLength(2);
    expect(b).toHaveLength(2);
  });

  it("persists all messages to the queue", () => {
    const phones = ["054-111-1111", "054-222-2222", "054-333-3333"];
    createAbTestMessages(phones, "tmpl_A", "tmpl_B", "2025-12-01T10:00:00Z");
    expect(getSchedulerQueue()).toHaveLength(3);
  });

  it("assigns A variant to first group", () => {
    const { a } = createAbTestMessages(["054-111-1111"], "tmpl_A", "tmpl_B", "2025-12-01T10:00:00Z", 100);
    expect(a[0].variant).toBe("A");
    expect(a[0].templateId).toBe("tmpl_A");
  });

  it("assigns B variant to second group", () => {
    const { b } = createAbTestMessages(["054-111-1111", "054-222-2222"], "tmpl_A", "tmpl_B", "2025-12-01T10:00:00Z", 0);
    expect(b[0].variant).toBe("B");
  });

  it("respects custom split ratio", () => {
    const phones = Array.from({ length: 10 }, (_, i) => `05411${i}0000`);
    const { a, b } = createAbTestMessages(phones, "tmpl_A", "tmpl_B", "2025-12-01T10:00:00Z", 30);
    expect(a).toHaveLength(3);
    expect(b).toHaveLength(7);
  });
});

describe("cancelScheduledMessage", () => {
  it("cancels a queued message", () => {
    const msg = scheduleWhatsAppMessage("+972541234567", "t1", "2025-12-01T10:00:00Z");
    const ok = cancelScheduledMessage(msg.id);
    expect(ok).toBe(true);
    expect(getSchedulerQueue()[0].status).toBe("cancelled");
  });

  it("returns false for unknown id", () => {
    expect(cancelScheduledMessage("nope")).toBe(false);
  });
});

describe("getReadyMessages", () => {
  it("returns messages whose scheduledAt is in the past", () => {
    scheduleWhatsAppMessage("+972541234567", "t1", "2020-01-01T00:00:00Z");
    const ready = getReadyMessages(new Date("2025-01-01"));
    expect(ready).toHaveLength(1);
  });

  it("excludes future messages", () => {
    scheduleWhatsAppMessage("+972541234567", "t1", "2030-01-01T00:00:00Z");
    const ready = getReadyMessages(new Date("2025-01-01"));
    expect(ready).toHaveLength(0);
  });
});

describe("getAbTestResults", () => {
  it("returns empty for empty queue", () => {
    expect(getAbTestResults()).toEqual([]);
  });

  it("groups messages by variant", () => {
    const phones4 = ["054-111-1111", "054-222-2222", "054-333-3333", "054-444-4444"];
    createAbTestMessages(phones4, "tmpl_A", "tmpl_B", "2025-12-01T10:00:00Z");
    const stats = getAbTestResults();
    const variants = stats.map((s) => s.variant).sort();
    expect(variants).toContain("A");
    expect(variants).toContain("B");
  });
});

describe("getQueueSummary", () => {
  it("returns zero summary for empty queue", () => {
    const s = getQueueSummary();
    expect(s.total).toBe(0);
    expect(s.queued).toBe(0);
  });

  it("counts queued messages", () => {
    scheduleWhatsAppMessage("+972541234567", "t1", "2025-12-01T10:00:00Z");
    scheduleWhatsAppMessage("+972541234568", "t1", "2025-12-01T10:00:00Z");
    const s = getQueueSummary();
    expect(s.total).toBe(2);
    expect(s.queued).toBe(2);
  });
});
