/**
 * tests/unit/whatsapp-section.test.mjs — S341: data helpers in src/sections/whatsapp.js
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Store ─────────────────────────────────────────────────────────────────

const _store = new Map();

vi.mock("../../src/core/store.js", () => ({
  storeGet: (k) => _store.get(k) ?? null,
  storeSet: vi.fn((k, v) => _store.set(k, v)),
  storeSubscribe: vi.fn(() => () => {}),
  storeSubscribeScoped: vi.fn(() => () => {}),
  cleanupScope: vi.fn(),
}));

// ── Deps ──────────────────────────────────────────────────────────────────

vi.mock("../../src/core/i18n.js", () => ({ t: (k) => k }));
vi.mock("../../src/core/dom.js", () => ({ el: new Proxy({}, { get: () => null }) }));
vi.mock("../../src/core/sync.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(),
}));
vi.mock("../../src/core/storage.js", () => ({
  readBrowserStorageJson: vi.fn(() => []),
  writeBrowserStorage: vi.fn(),
  readBrowserStorage: vi.fn(() => null),
}));
vi.mock("../../src/utils/phone.js", () => ({
  cleanPhone: (p) => p.replace(/\D/g, ""),
}));
vi.mock("../../src/services/wa-messaging.js", () => ({
  personalizeMessage: (tpl, guest) =>
    tpl.replace(/\{name\}/g, guest.firstName || ""),
  getVariableHints: () => [],
}));
vi.mock("../../src/core/section-base.js", () => ({
  BaseSection: class {
    constructor(_name) {}
    subscribe() {}
  },
  fromSection: (_s) => ({ mount: vi.fn(), unmount: vi.fn(), capabilities: [] }),
}));
vi.mock("../../src/core/events.js", () => ({ on: vi.fn() }));

import {
  getWhatsAppLink,
  buildWhatsAppMessage,
  markGuestSent,
  getUnsentCount,
  getThankYouCount,
  getWhatsAppSendRate,
  getMessageStatsByGroup,
  generateICS,
} from "../../src/sections/whatsapp.js";

// ── Helpers ───────────────────────────────────────────────────────────────

const mkGuest = (overrides = {}) => ({
  id: "g1",
  firstName: "Yair",
  lastName: "Rajwan",
  phone: "0501234567",
  status: "confirmed",
  sent: false,
  checkedIn: false,
  group: "family",
  tableId: null,
  ...overrides,
});

beforeEach(() => {
  _store.clear();
  vi.clearAllMocks();
});

// ── getWhatsAppLink ───────────────────────────────────────────────────────

describe("getWhatsAppLink", () => {
  it("returns null for missing guest", () => {
    _store.set("guests", []);
    expect(getWhatsAppLink("nonexistent")).toBeNull();
  });

  it("returns null for guest with no phone", () => {
    _store.set("guests", [mkGuest({ phone: "" })]);
    expect(getWhatsAppLink("g1")).toBeNull();
  });

  it("returns wa.me URL for valid guest", () => {
    _store.set("guests", [mkGuest({ phone: "0501234567" })]);
    _store.set("weddingInfo", { date: "2024-06-15", venue: "Tel Aviv" });
    const link = getWhatsAppLink("g1");
    expect(link).toMatch(/^https:\/\/wa\.me\//);
  });
});

// ── buildWhatsAppMessage ──────────────────────────────────────────────────

describe("buildWhatsAppMessage", () => {
  it("returns null for missing guest", () => {
    _store.set("guests", []);
    expect(buildWhatsAppMessage("nonexistent")).toBeNull();
  });

  it("returns null for guest without phone", () => {
    _store.set("guests", [mkGuest({ phone: "" })]);
    expect(buildWhatsAppMessage("g1")).toBeNull();
  });

  it("returns message and link for valid guest", () => {
    _store.set("guests", [mkGuest()]);
    _store.set("weddingInfo", { date: "2024-06-15", venue: "Park" });
    const result = buildWhatsAppMessage("g1", "Hello {name}!");
    expect(result).not.toBeNull();
    expect(result.message).toContain("Yair");
    expect(result.link).toMatch(/^https:\/\/wa\.me\//);
  });

  it("uses default template when none provided", () => {
    _store.set("guests", [mkGuest()]);
    _store.set("weddingInfo", {});
    const result = buildWhatsAppMessage("g1");
    expect(result).not.toBeNull();
    expect(typeof result.message).toBe("string");
    expect(typeof result.link).toBe("string");
  });
});

// ── markGuestSent ─────────────────────────────────────────────────────────

describe("markGuestSent", () => {
  it("marks a guest as sent", () => {
    _store.set("guests", [mkGuest({ id: "g1", sent: false })]);
    markGuestSent("g1");
    expect(_store.get("guests")[0].sent).toBe(true);
  });

  it("does not double-mark already sent guest", () => {
    _store.set("guests", [mkGuest({ id: "g1", sent: true, sentAt: "2024-01-01" })]);
    markGuestSent("g1");
    // sentAt should NOT have been updated (same as before)
    expect(_store.get("guests")[0].sentAt).toBe("2024-01-01");
  });

  it("is a no-op for non-existent guest id", () => {
    _store.set("guests", [mkGuest()]);
    expect(() => markGuestSent("unknown")).not.toThrow();
  });
});

// ── getUnsentCount ────────────────────────────────────────────────────────

describe("getUnsentCount", () => {
  it("returns 0 for empty guest list", () => {
    _store.set("guests", []);
    expect(getUnsentCount()).toBe(0);
  });

  it("counts guests with phone and not yet sent", () => {
    _store.set("guests", [
      mkGuest({ id: "g1", phone: "050", sent: false }),
      mkGuest({ id: "g2", phone: "051", sent: true }),
      mkGuest({ id: "g3", phone: "052", sent: false }),
    ]);
    expect(getUnsentCount()).toBe(2);
  });

  it("excludes declined guests", () => {
    _store.set("guests", [
      mkGuest({ id: "g1", phone: "050", sent: false, status: "declined" }),
    ]);
    expect(getUnsentCount()).toBe(0);
  });

  it("excludes guests without phone", () => {
    _store.set("guests", [mkGuest({ phone: "", sent: false })]);
    expect(getUnsentCount()).toBe(0);
  });
});

// ── getThankYouCount ──────────────────────────────────────────────────────

describe("getThankYouCount", () => {
  it("returns 0 for empty guest list", () => {
    _store.set("guests", []);
    expect(getThankYouCount()).toBe(0);
  });

  it("counts checked-in confirmed guests without thankYouSent", () => {
    _store.set("guests", [
      mkGuest({ id: "g1", phone: "050", checkedIn: true, status: "confirmed", thankYouSent: false }),
      mkGuest({ id: "g2", phone: "051", checkedIn: true, status: "confirmed", thankYouSent: true }),
      mkGuest({ id: "g3", phone: "052", checkedIn: false, status: "confirmed", thankYouSent: false }),
    ]);
    expect(getThankYouCount()).toBe(1);
  });
});

// ── getWhatsAppSendRate ───────────────────────────────────────────────────

describe("getWhatsAppSendRate", () => {
  it("returns zeros for empty guest list", () => {
    _store.set("guests", []);
    expect(getWhatsAppSendRate()).toEqual({ eligible: 0, sent: 0, rate: 0 });
  });

  it("calculates send rate correctly", () => {
    _store.set("guests", [
      mkGuest({ id: "g1", phone: "050", sent: true }),
      mkGuest({ id: "g2", phone: "051", sent: true }),
      mkGuest({ id: "g3", phone: "052", sent: false }),
      mkGuest({ id: "g4", phone: "053", sent: false }),
    ]);
    const r = getWhatsAppSendRate();
    expect(r.eligible).toBe(4);
    expect(r.sent).toBe(2);
    expect(r.rate).toBe(50);
  });

  it("excludes declined guests from eligible", () => {
    _store.set("guests", [
      mkGuest({ id: "g1", phone: "050", sent: false, status: "declined" }),
      mkGuest({ id: "g2", phone: "051", sent: true, status: "confirmed" }),
    ]);
    const r = getWhatsAppSendRate();
    expect(r.eligible).toBe(1);
    expect(r.sent).toBe(1);
    expect(r.rate).toBe(100);
  });
});

// ── getMessageStatsByGroup ────────────────────────────────────────────────

describe("getMessageStatsByGroup", () => {
  it("returns empty array for no eligible guests", () => {
    _store.set("guests", []);
    expect(getMessageStatsByGroup()).toEqual([]);
  });

  it("groups stats by guest group", () => {
    _store.set("guests", [
      mkGuest({ id: "g1", phone: "050", group: "family", sent: true }),
      mkGuest({ id: "g2", phone: "051", group: "family", sent: false }),
      mkGuest({ id: "g3", phone: "052", group: "friends", sent: false }),
    ]);
    const stats = getMessageStatsByGroup();
    const family = stats.find((s) => s.group === "family");
    const friends = stats.find((s) => s.group === "friends");
    expect(family.total).toBe(2);
    expect(family.sent).toBe(1);
    expect(family.pending).toBe(1);
    expect(friends.total).toBe(1);
    expect(friends.pending).toBe(1);
  });

  it("uses 'other' for guests without a group", () => {
    _store.set("guests", [mkGuest({ phone: "050", group: undefined })]);
    const stats = getMessageStatsByGroup();
    expect(stats[0].group).toBe("other");
  });

  it("excludes guests without phones", () => {
    _store.set("guests", [mkGuest({ phone: "" })]);
    expect(getMessageStatsByGroup()).toHaveLength(0);
  });
});

// ── generateICS ───────────────────────────────────────────────────────────

describe("generateICS", () => {
  it("returns null when no date is set", () => {
    _store.set("weddingInfo", {});
    expect(generateICS()).toBeNull();
  });

  it("returns null for invalid date", () => {
    _store.set("weddingInfo", { date: "not-a-date" });
    expect(generateICS()).toBeNull();
  });

  it("generates valid ICS content for valid date", () => {
    _store.set("weddingInfo", {
      date: "2025-06-15",
      groom: "David",
      bride: "Sarah",
      venue: "Park Hotel",
    });
    const ics = generateICS();
    expect(ics).not.toBeNull();
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("includes LOCATION when venue is set", () => {
    _store.set("weddingInfo", { date: "2025-06-15", venue: "Park Hotel" });
    const ics = generateICS();
    expect(ics).toContain("LOCATION:Park Hotel");
  });
});
