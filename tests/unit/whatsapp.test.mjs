/**
 * tests/unit/whatsapp.test.mjs — Unit tests for whatsapp section
 * Covers: buildWhatsAppMessage · getWhatsAppLink · markGuestSent ·
 *         getUnsentCount · generateICS · getScheduledQueue · getThankYouCount
 *
 * @vitest-environment happy-dom
 * Run: npm test
 */

import { describe, it, expect, beforeEach } from "vitest";
import { initStore, storeGet, storeSet } from "../../src/core/store.js";
import {
  buildWhatsAppMessage,
  getWhatsAppLink,
  markGuestSent,
  getUnsentCount,
  generateICS,
  getScheduledQueue,
  getThankYouCount,
  getWhatsAppSendRate,
  getMessageStatsByGroup,
} from "../../src/sections/whatsapp.js";

function seedStore() {
  initStore({
    guests: { value: [] },
    weddingInfo: { value: {} },
  });
}

function makeGuest(overrides = {}) {
  return {
    id: `g_${Math.random().toString(36).slice(2)}`,
    firstName: "יאיר",
    lastName: "רג'ואן",
    phone: "972501234567",
    status: "pending",
    sent: false,
    ...overrides,
  };
}

// ── buildWhatsAppMessage ─────────────────────────────────────────────────

describe("buildWhatsAppMessage", () => {
  beforeEach(() => seedStore());

  it("returns null for non-existent guest", () => {
    expect(buildWhatsAppMessage("nonexistent")).toBeNull();
  });

  it("returns null for guest without phone", () => {
    const g = makeGuest({ phone: "" });
    storeSet("guests", [g]);
    expect(buildWhatsAppMessage(g.id)).toBeNull();
  });

  it("returns message and link for valid guest", () => {
    const g = makeGuest({ id: "g1" });
    storeSet("guests", [g]);
    storeSet("weddingInfo", { groom: "אליאור", bride: "טובה" });
    const result = buildWhatsAppMessage("g1");
    expect(result).not.toBeNull();
    expect(result.message).toBeDefined();
    expect(result.link).toContain("https://wa.me/972501234567");
  });

  it("uses custom template when provided", () => {
    const g = makeGuest({ id: "g2", firstName: "Dan" });
    storeSet("guests", [g]);
    const result = buildWhatsAppMessage("g2", "Hello {name}!");
    expect(result.message).toContain("Dan");
  });
});

// ── getWhatsAppLink ──────────────────────────────────────────────────────

describe("getWhatsAppLink", () => {
  beforeEach(() => seedStore());

  it("returns null for missing guest", () => {
    expect(getWhatsAppLink("noexist")).toBeNull();
  });

  it("returns wa.me URL with encoded message", () => {
    const g = makeGuest({ id: "g3" });
    storeSet("guests", [g]);
    storeSet("weddingInfo", { groom: "Test", bride: "User" });
    const link = getWhatsAppLink("g3");
    expect(link).toContain("https://wa.me/");
    expect(link).toContain("text=");
  });
});

// ── markGuestSent ────────────────────────────────────────────────────────

describe("markGuestSent", () => {
  beforeEach(() => seedStore());

  it("marks a guest as sent", () => {
    const g = makeGuest({ id: "g4", sent: false });
    storeSet("guests", [g]);
    markGuestSent("g4");
    const updated = /** @type {any[]} */ (storeGet("guests"));
    expect(updated[0].sent).toBe(true);
  });

  it("does nothing for non-existent guest", () => {
    storeSet("guests", [makeGuest()]);
    markGuestSent("nonexistent"); // should not throw
    expect(storeGet("guests")).toHaveLength(1);
  });
});

// ── getUnsentCount ───────────────────────────────────────────────────────

describe("getUnsentCount", () => {
  beforeEach(() => seedStore());

  it("returns 0 when no guests", () => {
    expect(getUnsentCount()).toBe(0);
  });

  it("counts unsent guests with phone (excluding declined)", () => {
    storeSet("guests", [
      makeGuest({ sent: false, phone: "972501234567", status: "pending" }),
      makeGuest({ sent: true, phone: "972501234568" }),
      makeGuest({ sent: false, phone: "972501234569", status: "declined" }),
      makeGuest({ sent: false, phone: "" }),
    ]);
    expect(getUnsentCount()).toBe(1);
  });
});

// ── generateICS ──────────────────────────────────────────────────────────

describe("generateICS", () => {
  beforeEach(() => seedStore());

  it("returns null when no date set", () => {
    storeSet("weddingInfo", {});
    expect(generateICS()).toBeNull();
  });

  it("returns null for invalid date", () => {
    storeSet("weddingInfo", { date: "not-a-date" });
    expect(generateICS()).toBeNull();
  });

  it("generates valid iCalendar format", () => {
    storeSet("weddingInfo", {
      date: "2026-05-07",
      groom: "אליאור",
      bride: "טובה",
      venue: "נוף הירדן",
    });
    const ics = generateICS();
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("VERSION:2.0");
  });

  it("includes venue as LOCATION", () => {
    storeSet("weddingInfo", { date: "2026-05-07", venue: "Test Venue" });
    const ics = generateICS();
    expect(ics).toContain("LOCATION:Test Venue");
  });
});

// ── getScheduledQueue ────────────────────────────────────────────────────

describe("getScheduledQueue", () => {
  beforeEach(() => seedStore());

  it("returns array", () => {
    const queue = getScheduledQueue();
    expect(Array.isArray(queue)).toBe(true);
  });
});

// ── getThankYouCount ─────────────────────────────────────────────────────

describe("getThankYouCount", () => {
  beforeEach(() => seedStore());

  it("returns 0 when no checked-in guests", () => {
    storeSet("guests", [makeGuest()]);
    expect(getThankYouCount()).toBe(0);
  });

  it("counts checked-in confirmed guests with phone", () => {
    storeSet("guests", [
      makeGuest({ checkedIn: true, phone: "972501234567", status: "confirmed" }),
      makeGuest({ checkedIn: true, phone: "", status: "confirmed" }),
      makeGuest({ checkedIn: false, phone: "972501234568", status: "confirmed" }),
    ]);
    const count = getThankYouCount();
    expect(count).toBe(1);
  });
});

// ── getWhatsAppSendRate ───────────────────────────────────────────────────
describe("getWhatsAppSendRate", () => {
  beforeEach(() => seedStore());

  it("returns 0 when no eligible guests", () => {
    storeSet("guests", []);
    const r = getWhatsAppSendRate();
    expect(r.eligible).toBe(0);
    expect(r.rate).toBe(0);
  });

  it("calculates send rate correctly", () => {
    storeSet("guests", [
      makeGuest({ phone: "972501111111", sent: true, status: "pending" }),
      makeGuest({ phone: "972502222222", sent: false, status: "pending" }),
      makeGuest({ phone: "972503333333", sent: true, status: "confirmed" }),
      makeGuest({ phone: "", sent: false, status: "pending" }), // no phone
      makeGuest({ phone: "972504444444", sent: false, status: "declined" }), // declined
    ]);
    const r = getWhatsAppSendRate();
    expect(r.eligible).toBe(3);
    expect(r.sent).toBe(2);
    expect(r.rate).toBe(67);
  });
});

// ── getMessageStatsByGroup ────────────────────────────────────────────────
describe("getMessageStatsByGroup", () => {
  beforeEach(() => seedStore());

  it("returns empty for no guests", () => {
    storeSet("guests", []);
    expect(getMessageStatsByGroup()).toHaveLength(0);
  });

  it("groups message stats by guest group sorted by most pending", () => {
    storeSet("guests", [
      makeGuest({ phone: "972501111111", group: "family", sent: true, status: "pending" }),
      makeGuest({ phone: "972502222222", group: "family", sent: false, status: "pending" }),
      makeGuest({ phone: "972503333333", group: "friends", sent: false, status: "pending" }),
      makeGuest({ phone: "972504444444", group: "friends", sent: false, status: "confirmed" }),
    ]);
    const stats = getMessageStatsByGroup();
    expect(stats).toHaveLength(2);
    expect(stats[0].group).toBe("friends"); // 2 pending
    expect(stats[0].pending).toBe(2);
    expect(stats[1].group).toBe("family");
    expect(stats[1].sent).toBe(1);
    expect(stats[1].pending).toBe(1);
  });
});
