/**
 * tests/unit/delivery-tracking.test.mjs — Unit tests for delivery tracking service (Sprint 46)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

import { initStore } from "../../src/core/store.js";
const {
  recordDelivery,
  getDeliveryHistory,
  getUndelivered,
  getLatestDelivery,
  getDeliveryStats,
  clearGuestDeliveries,
} = await import("../../src/services/outreach.js");

function seedStore() {
  initStore({
    deliveries: { value: [] },
    guests: { value: [] },
    campaigns: { value: [] },
    tables: { value: [] },
    vendors: { value: [] },
    expenses: { value: [] },
    weddingInfo: { value: {} },
  });
}

beforeEach(() => seedStore());

// ── recordDelivery ────────────────────────────────────────────────────────

describe("recordDelivery", () => {
  it("returns a record with required fields", () => {
    const rec = recordDelivery("g1", "whatsapp", "sent");
    expect(rec.id).toMatch(/^dlv_/);
    expect(rec.guestId).toBe("g1");
    expect(rec.channel).toBe("whatsapp");
    expect(rec.status).toBe("sent");
    expect(typeof rec.ts).toBe("number");
  });

  it("stores optional messageId and campaignId", () => {
    const rec = recordDelivery("g1", "email", "delivered", {
      messageId: "msg_123", campaignId: "c_abc",
    });
    expect(rec.messageId).toBe("msg_123");
    expect(rec.campaignId).toBe("c_abc");
  });

  it("persists multiple records", () => {
    recordDelivery("g1", "whatsapp", "sent");
    recordDelivery("g2", "email", "failed");
    const all = getDeliveryHistory("g1");
    expect(all).toHaveLength(1);
  });
});

// ── getDeliveryHistory ────────────────────────────────────────────────────

describe("getDeliveryHistory", () => {
  it("returns only records for the specified guest", () => {
    recordDelivery("g1", "whatsapp", "sent");
    recordDelivery("g2", "whatsapp", "sent");
    expect(getDeliveryHistory("g1")).toHaveLength(1);
    expect(getDeliveryHistory("g2")).toHaveLength(1);
  });

  it("returns empty array for unknown guest", () => {
    expect(getDeliveryHistory("__none__")).toEqual([]);
  });

  it("sorts newest first", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    recordDelivery("g1", "email", "sent");
    vi.setSystemTime(2000);
    recordDelivery("g1", "email", "delivered");
    vi.useRealTimers();
    const hist = getDeliveryHistory("g1");
    expect(hist[0].status).toBe("delivered");
  });
});

// ── getUndelivered ────────────────────────────────────────────────────────

describe("getUndelivered", () => {
  it("returns failed and bounced records", () => {
    recordDelivery("g1", "whatsapp", "sent");
    recordDelivery("g2", "whatsapp", "failed");
    recordDelivery("g3", "email", "bounced");
    const undelivered = getUndelivered();
    expect(undelivered).toHaveLength(2);
    expect(undelivered.map((r) => r.guestId).sort()).toEqual(["g2", "g3"]);
  });

  it("filters by channel", () => {
    recordDelivery("g1", "whatsapp", "failed");
    recordDelivery("g2", "email", "failed");
    const filtered = getUndelivered({ channel: "whatsapp" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].guestId).toBe("g1");
  });
});

// ── getLatestDelivery ─────────────────────────────────────────────────────

describe("getLatestDelivery", () => {
  it("returns the most recent record for guest+channel", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    recordDelivery("g1", "email", "sent");
    vi.setSystemTime(2000);
    recordDelivery("g1", "email", "delivered");
    vi.useRealTimers();
    const latest = getLatestDelivery("g1", "email");
    expect(latest?.status).toBe("delivered");
  });

  it("returns undefined when no records match", () => {
    expect(getLatestDelivery("g99", "sms")).toBeUndefined();
  });
});

// ── getDeliveryStats ──────────────────────────────────────────────────────

describe("getDeliveryStats", () => {
  it("counts all statuses", () => {
    recordDelivery("g1", "whatsapp", "sent");
    recordDelivery("g2", "whatsapp", "delivered");
    recordDelivery("g3", "email", "failed");
    const stats = getDeliveryStats();
    expect(stats.total).toBe(3);
    expect(stats.sent).toBe(1);
    expect(stats.delivered).toBe(1);
    expect(stats.failed).toBe(1);
  });

  it("filters by campaignId", () => {
    recordDelivery("g1", "whatsapp", "sent", { campaignId: "c1" });
    recordDelivery("g2", "whatsapp", "sent", { campaignId: "c2" });
    const stats = getDeliveryStats({ campaignId: "c1" });
    expect(stats.total).toBe(1);
  });
});

// ── clearGuestDeliveries ──────────────────────────────────────────────────

describe("clearGuestDeliveries", () => {
  it("removes all records for a guest", () => {
    recordDelivery("g1", "whatsapp", "sent");
    recordDelivery("g1", "email", "failed");
    recordDelivery("g2", "whatsapp", "sent");
    clearGuestDeliveries("g1");
    expect(getDeliveryHistory("g1")).toHaveLength(0);
    expect(getDeliveryHistory("g2")).toHaveLength(1);
  });
});
