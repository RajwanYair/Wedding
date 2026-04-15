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
