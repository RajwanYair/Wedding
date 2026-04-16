/**
 * tests/unit/checkin.integration.test.mjs — Integration tests for checkin section
 * Covers: checkInGuest · setCheckinSearch · exportCheckinReport · resetAllCheckins · getCheckinStats
 *
 * @vitest-environment happy-dom
 * Run: npm test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initStore, storeGet, storeSet } from "../../src/core/store.js";
import {
  checkInGuest,
  exportCheckinReport,
  resetAllCheckins,
  getCheckinStats,
  getCheckinRateBySide,
  getCheckinRateByTable,
  getVipNotCheckedIn,
  getAccessibilityNotCheckedIn,
  getCheckinTimeline,
} from "../../src/sections/checkin.js";

beforeEach(() => {
  vi.useFakeTimers();
  initStore({ guests: { value: [] } });
  storeSet("guests", []);
});

afterEach(() => {
  vi.useRealTimers();
});

function makeGuest(overrides = {}) {
  return {
    id: `g-${Math.random().toString(36).slice(2)}`,
    firstName: "Test",
    lastName: "User",
    phone: "",
    status: "confirmed",
    count: 1,
    checkedIn: false,
    ...overrides,
  };
}

// ── checkInGuest ──────────────────────────────────────────────────────────────

describe("checkInGuest", () => {
  it("marks a guest as checked in", () => {
    const g = makeGuest();
    storeSet("guests", [g]);
    checkInGuest(g.id);
    expect(storeGet("guests")[0].checkedIn).toBe(true);
  });

  it("sets checkedInAt timestamp on check-in", () => {
    const g = makeGuest();
    storeSet("guests", [g]);
    checkInGuest(g.id);
    expect(storeGet("guests")[0].checkedInAt).toBeTruthy();
  });

  it("does nothing for unknown guest id", () => {
    const g = makeGuest();
    storeSet("guests", [g]);
    checkInGuest("nonexistent-id");
    expect(storeGet("guests")[0].checkedIn).toBe(false);
  });

  it("is idempotent — checking in twice keeps checkedIn true", () => {
    const g = makeGuest();
    storeSet("guests", [g]);
    checkInGuest(g.id);
    checkInGuest(g.id);
    expect(storeGet("guests")[0].checkedIn).toBe(true);
  });
});

// ── resetAllCheckins ──────────────────────────────────────────────────────────

describe("resetAllCheckins", () => {
  it("resets all guests checkedIn flags to false", () => {
    storeSet("guests", [
      makeGuest({ checkedIn: true, checkedInAt: "2024-01-01T10:00:00Z" }),
      makeGuest({ id: "g2", checkedIn: true, checkedInAt: "2024-01-01T11:00:00Z" }),
    ]);
    resetAllCheckins();
    const guests = storeGet("guests");
    expect(guests.every((g) => g.checkedIn === false)).toBe(true);
    expect(guests.every((g) => g.checkedInAt === undefined)).toBe(true);
  });
});

// ── exportCheckinReport ───────────────────────────────────────────────────────

describe("exportCheckinReport", () => {
  it("runs without throwing for confirmed guests list", () => {
    storeSet("guests", [makeGuest({ status: "confirmed", checkedIn: true, checkedInAt: "2024-01-01T10:00:00Z" })]);
    // exportCheckinReport triggers download and returns undefined
    expect(() => exportCheckinReport()).not.toThrow();
  });
});

// ── getCheckinStats ───────────────────────────────────────────────────────────

describe("getCheckinStats", () => {
  it("returns zeros for empty guest list", () => {
    const stats = getCheckinStats();
    expect(stats.total).toBe(0);
    expect(stats.checkedIn).toBe(0);
    expect(stats.checkinRate).toBe(0);
    expect(stats.remaining).toBe(0);
  });

  it("counts only confirmed guests in total seats", () => {
    storeSet("guests", [
      makeGuest({ status: "confirmed", count: 2, checkedIn: false }),
      makeGuest({ id: "g2", status: "pending", count: 3, checkedIn: false }),
    ]);
    const stats = getCheckinStats();
    // Only confirmed (count=2) counted in total
    expect(stats.total).toBe(2);
  });

  it("counts checkedIn guests by seat count", () => {
    storeSet("guests", [
      makeGuest({ status: "confirmed", count: 2, checkedIn: true }),
      makeGuest({ id: "g2", status: "confirmed", count: 1, checkedIn: false }),
    ]);
    const stats = getCheckinStats();
    expect(stats.total).toBe(3);
    expect(stats.checkedIn).toBe(2);
    expect(stats.remaining).toBe(1);
  });

  it("calculates checkinRate as percentage", () => {
    storeSet("guests", [
      makeGuest({ status: "confirmed", count: 1, checkedIn: true }),
      makeGuest({ id: "g2", status: "confirmed", count: 1, checkedIn: true }),
      makeGuest({ id: "g3", status: "confirmed", count: 2, checkedIn: false }),
    ]);
    const stats = getCheckinStats();
    // 2 checked in out of 4 total → 50%
    expect(stats.checkinRate).toBe(50);
  });

  it("returns 100% checkinRate when all confirmed guests arrived", () => {
    storeSet("guests", [
      makeGuest({ status: "confirmed", count: 1, checkedIn: true }),
    ]);
    const stats = getCheckinStats();
    expect(stats.checkinRate).toBe(100);
  });
});

// ── getCheckinRateBySide ──────────────────────────────────────────────────
describe("getCheckinRateBySide", () => {
  it("returns empty when no confirmed guests", () => {
    storeSet("guests", [makeGuest({ status: "pending" })]);
    expect(getCheckinRateBySide()).toHaveLength(0);
  });

  it("groups check-in rate by side", () => {
    storeSet("guests", [
      makeGuest({ side: "groom", checkedIn: true }),
      makeGuest({ side: "groom", checkedIn: false }),
      makeGuest({ side: "bride", checkedIn: true }),
    ]);
    const rates = getCheckinRateBySide();
    const groom = rates.find((r) => r.side === "groom");
    expect(groom.rate).toBe(50);
    const bride = rates.find((r) => r.side === "bride");
    expect(bride.rate).toBe(100);
  });
});

// ── getCheckinRateByTable ─────────────────────────────────────────────────
describe("getCheckinRateByTable", () => {
  it("returns empty when no seated confirmed guests", () => {
    storeSet("guests", [makeGuest({ tableId: "" })]);
    expect(getCheckinRateByTable()).toHaveLength(0);
  });

  it("calculates arrival rate per table", () => {
    initStore({ guests: { value: [] }, tables: { value: [] } });
    storeSet("tables", [{ id: "t1", name: "Head Table" }]);
    storeSet("guests", [
      makeGuest({ tableId: "t1", checkedIn: true }),
      makeGuest({ tableId: "t1", checkedIn: false }),
    ]);
    const rates = getCheckinRateByTable();
    expect(rates).toHaveLength(1);
    expect(rates[0].tableName).toBe("Head Table");
    expect(rates[0].rate).toBe(50);
  });
});

// ── getVipNotCheckedIn ────────────────────────────────────────────────────
describe("getVipNotCheckedIn", () => {
  it("returns VIP confirmed guests who haven't arrived", () => {
    storeSet("guests", [
      makeGuest({ id: "v1", vip: true, firstName: "VIP", checkedIn: false }),
      makeGuest({ id: "v2", vip: true, checkedIn: true }),
      makeGuest({ id: "v3", vip: false, checkedIn: false }),
    ]);
    const result = getVipNotCheckedIn();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("v1");
  });
});

// ── getAccessibilityNotCheckedIn ──────────────────────────────────────────
describe("getAccessibilityNotCheckedIn", () => {
  it("returns accessibility guests not checked in", () => {
    storeSet("guests", [
      makeGuest({ id: "a1", accessibility: "wheelchair", checkedIn: false }),
      makeGuest({ id: "a2", accessibility: "wheelchair", checkedIn: true }),
      makeGuest({ id: "a3", accessibility: "", checkedIn: false }),
    ]);
    const result = getAccessibilityNotCheckedIn();
    expect(result).toHaveLength(1);
    expect(result[0].accessibility).toBe("wheelchair");
  });
});

// ── getCheckinTimeline ────────────────────────────────────────────────────
describe("getCheckinTimeline", () => {
  it("returns empty when no checkin times", () => {
    storeSet("guests", [makeGuest({ checkedIn: true })]);
    expect(getCheckinTimeline()).toHaveLength(0);
  });

  it("buckets check-ins by hour", () => {
    storeSet("guests", [
      makeGuest({ checkedIn: true, checkinTime: "2025-06-15T18:30:00Z" }),
      makeGuest({ checkedIn: true, checkinTime: "2025-06-15T18:45:00Z" }),
      makeGuest({ checkedIn: true, checkinTime: "2025-06-15T19:10:00Z" }),
    ]);
    const timeline = getCheckinTimeline();
    expect(timeline.length).toBeGreaterThanOrEqual(1);
  });
});
