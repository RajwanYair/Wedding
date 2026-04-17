/**
 * tests/unit/guests-helpers.test.mjs — Unit tests for Sprint 5 guest helpers
 * Covers: getGuestsByGroup · getGuestsNeedingFollowup · getSeatingGaps ·
 *         getGuestResponseTimeline · getDuplicateGuests
 *
 * @vitest-environment happy-dom
 * Run: npm test
 */

import { describe, it, expect, beforeEach } from "vitest";
import { initStore, storeSet } from "../../src/core/store.js";
import { makeGuest } from "./helpers.js";
import {
  getGuestsByGroup,
  getGuestsNeedingFollowup,
  getSeatingGaps,
  getGuestResponseTimeline,
  getDuplicateGuests,
  getPlusOneStats,
  getGuestsMissingMeal,
  getGiftSummary,
  getGuestAge,
  getChildrenCount,
} from "../../src/sections/guests.js";

function seedStore() {
  initStore({
    guests: { value: [] },
    tables: { value: [] },
    weddingInfo: { value: {} },
  });
}

// ── getGuestsByGroup ───────────────────────────────────────────────────────────────

describe("getGuestsByGroup", () => {
  beforeEach(() => seedStore());

  it("returns empty groups when no guests", () => {
    const groups = getGuestsByGroup();
    expect(groups.family).toEqual([]);
    expect(groups.friends).toEqual([]);
    expect(groups.work).toEqual([]);
    expect(groups.other).toEqual([]);
  });

  it("groups guests correctly", () => {
    storeSet("guests", [
      makeGuest({ group: "family" }),
      makeGuest({ group: "family" }),
      makeGuest({ group: "friends" }),
      makeGuest({ group: "work" }),
    ]);
    const groups = getGuestsByGroup();
    expect(groups.family).toHaveLength(2);
    expect(groups.friends).toHaveLength(1);
    expect(groups.work).toHaveLength(1);
    expect(groups.other).toHaveLength(0);
  });

  it("puts unknown group into 'other'", () => {
    storeSet("guests", [makeGuest({ group: "vip" })]);
    const groups = getGuestsByGroup();
    expect(groups.other).toHaveLength(1);
  });

  it("puts guests with no group into 'other'", () => {
    storeSet("guests", [makeGuest({ group: undefined })]);
    const groups = getGuestsByGroup();
    expect(groups.other).toHaveLength(1);
  });
});

// ── getGuestsNeedingFollowup ─────────────────────────────────────────────

describe("getGuestsNeedingFollowup", () => {
  beforeEach(() => seedStore());

  it("returns empty when no RSVP deadline set", () => {
    expect(getGuestsNeedingFollowup()).toEqual([]);
  });

  it("returns empty when deadline is in the future", () => {
    const future = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    storeSet("weddingInfo", { rsvpDeadline: future });
    storeSet("guests", [makeGuest({ status: "pending" })]);
    expect(getGuestsNeedingFollowup()).toEqual([]);
  });

  it("returns pending guests when deadline passed", () => {
    storeSet("weddingInfo", { rsvpDeadline: "2020-01-01" });
    storeSet("guests", [
      makeGuest({ status: "pending", phone: "972501234567" }),
      makeGuest({ status: "confirmed", phone: "972501234568" }),
      makeGuest({ status: "pending", phone: "" }),
    ]);
    const result = getGuestsNeedingFollowup();
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("pending");
  });
});

// ── getSeatingGaps ──────────────────────────────────────────────────────

describe("getSeatingGaps", () => {
  beforeEach(() => seedStore());

  it("returns empty when no tables", () => {
    expect(getSeatingGaps()).toEqual([]);
  });

  it("returns tables with remaining capacity", () => {
    storeSet("tables", [
      { id: "t1", name: "Table 1", capacity: 10 },
      { id: "t2", name: "Table 2", capacity: 8 },
    ]);
    storeSet("guests", [
      makeGuest({ tableId: "t1", count: 5 }),
      makeGuest({ tableId: "t1", count: 3 }),
      // Total on t1: 8/10 = 2 remaining
      // Total on t2: 0/8 = 8 remaining
    ]);
    const gaps = getSeatingGaps();
    expect(gaps).toHaveLength(2);
    const t1 = gaps.find((g) => g.table.id === "t1");
    expect(t1.remaining).toBe(2);
    const t2 = gaps.find((g) => g.table.id === "t2");
    expect(t2.remaining).toBe(8);
  });

  it("excludes full tables", () => {
    storeSet("tables", [{ id: "t1", name: "Full", capacity: 2 }]);
    storeSet("guests", [makeGuest({ tableId: "t1", count: 2 })]);
    const gaps = getSeatingGaps();
    expect(gaps).toHaveLength(0);
  });
});

// ── getGuestResponseTimeline ─────────────────────────────────────────────

describe("getGuestResponseTimeline", () => {
  beforeEach(() => seedStore());

  it("returns empty when no guests", () => {
    expect(getGuestResponseTimeline()).toEqual([]);
  });

  it("groups RSVP dates by day", () => {
    storeSet("guests", [
      makeGuest({ rsvpDate: "2026-01-15T10:00:00Z" }),
      makeGuest({ rsvpDate: "2026-01-15T14:00:00Z" }),
      makeGuest({ rsvpDate: "2026-01-16T09:00:00Z" }),
    ]);
    const timeline = getGuestResponseTimeline();
    expect(timeline).toHaveLength(2);
    expect(timeline[0]).toEqual({ date: "2026-01-15", count: 2 });
    expect(timeline[1]).toEqual({ date: "2026-01-16", count: 1 });
  });

  it("skips guests without rsvpDate", () => {
    storeSet("guests", [
      makeGuest({ rsvpDate: "2026-01-15T10:00:00Z" }),
      makeGuest({ rsvpDate: undefined }),
    ]);
    const timeline = getGuestResponseTimeline();
    expect(timeline).toHaveLength(1);
  });

  it("returns dates in sorted order", () => {
    storeSet("guests", [
      makeGuest({ rsvpDate: "2026-03-01T10:00:00Z" }),
      makeGuest({ rsvpDate: "2026-01-01T10:00:00Z" }),
      makeGuest({ rsvpDate: "2026-02-01T10:00:00Z" }),
    ]);
    const timeline = getGuestResponseTimeline();
    expect(timeline[0].date).toBe("2026-01-01");
    expect(timeline[2].date).toBe("2026-03-01");
  });
});

// ── getDuplicateGuests ──────────────────────────────────────────────────

describe("getDuplicateGuests", () => {
  beforeEach(() => seedStore());

  it("returns empty when no duplicates", () => {
    storeSet("guests", [
      makeGuest({ firstName: "A", phone: "972501111111" }),
      makeGuest({ firstName: "B", phone: "972502222222" }),
    ]);
    expect(getDuplicateGuests()).toEqual([]);
  });

  it("finds duplicates by phone", () => {
    storeSet("guests", [
      makeGuest({ id: "g1", firstName: "Dan", phone: "972501234567" }),
      makeGuest({ id: "g2", firstName: "Daniel", phone: "972501234567" }),
    ]);
    const dupes = getDuplicateGuests();
    expect(dupes.some((d) => d.reason === "phone")).toBe(true);
  });

  it("finds duplicates by name", () => {
    storeSet("guests", [
      makeGuest({ id: "g1", firstName: "Dan", lastName: "Cohen", phone: "972501111111" }),
      makeGuest({ id: "g2", firstName: "Dan", lastName: "Cohen", phone: "972502222222" }),
    ]);
    const dupes = getDuplicateGuests();
    expect(dupes.some((d) => d.reason === "name")).toBe(true);
  });

  it("is case-insensitive for name matching", () => {
    storeSet("guests", [
      makeGuest({ id: "g1", firstName: "dan", lastName: "cohen", phone: "972501111111" }),
      makeGuest({ id: "g2", firstName: "Dan", lastName: "Cohen", phone: "972502222222" }),
    ]);
    const dupes = getDuplicateGuests();
    expect(dupes.some((d) => d.reason === "name")).toBe(true);
  });

  it("ignores guests without phone for phone matching", () => {
    storeSet("guests", [
      makeGuest({ id: "g1", firstName: "A", phone: "" }),
      makeGuest({ id: "g2", firstName: "B", phone: "" }),
    ]);
    const dupes = getDuplicateGuests();
    expect(dupes.filter((d) => d.reason === "phone")).toHaveLength(0);
  });
});

// ── getPlusOneStats ───────────────────────────────────────────────────────
describe("getPlusOneStats", () => {
  it("returns zeros when no guests", () => {
    storeSet("guests", []);
    const stats = getPlusOneStats();
    expect(stats.totalGuests).toBe(0);
    expect(stats.avgPartySize).toBe(0);
  });

  it("calculates party size metrics for confirmed guests", () => {
    storeSet("guests", [
      makeGuest({ status: "confirmed", count: 3 }),
      makeGuest({ status: "confirmed", count: 1 }),
      makeGuest({ status: "confirmed", count: 5 }),
      makeGuest({ status: "pending", count: 10 }), // not counted
    ]);
    const stats = getPlusOneStats();
    expect(stats.totalGuests).toBe(3);
    expect(stats.totalHeads).toBe(9);
    expect(stats.largestParty).toBe(5);
    expect(stats.avgPartySize).toBe(3);
  });
});

// ── getGuestsMissingMeal ──────────────────────────────────────────────────
describe("getGuestsMissingMeal", () => {
  it("returns confirmed guests with no or 'regular' meal", () => {
    storeSet("guests", [
      makeGuest({ id: "g1", status: "confirmed", meal: "" }),
      makeGuest({ id: "g2", status: "confirmed", meal: "regular" }),
      makeGuest({ id: "g3", status: "confirmed", meal: "vegan" }),
      makeGuest({ id: "g4", status: "pending" }),
    ]);
    const missing = getGuestsMissingMeal();
    expect(missing).toHaveLength(2);
    expect(missing.map((m) => m.id)).toContain("g1");
    expect(missing.map((m) => m.id)).toContain("g2");
  });
});

// ── getGiftSummary ────────────────────────────────────────────────────────
describe("getGiftSummary", () => {
  it("returns zeros when no gifts", () => {
    storeSet("guests", [makeGuest({})]);
    const s = getGiftSummary();
    expect(s.totalGifts).toBe(0);
    expect(s.giftCount).toBe(0);
  });

  it("summarizes gifts", () => {
    storeSet("guests", [
      makeGuest({ gift: 500 }),
      makeGuest({ gift: 1000 }),
      makeGuest({ gift: 0 }),
    ]);
    const s = getGiftSummary();
    expect(s.totalGifts).toBe(1500);
    expect(s.giftCount).toBe(2);
    expect(s.avgGift).toBe(750);
    expect(s.maxGift).toBe(1000);
  });
});

// ── getGuestAge ───────────────────────────────────────────────────────────
describe("getGuestAge", () => {
  it("returns empty when no guests have createdAt", () => {
    storeSet("guests", [makeGuest({ createdAt: null })]);
    expect(getGuestAge()).toHaveLength(0);
  });

  it("returns sorted by daysOld descending", () => {
    const now = Date.now();
    storeSet("guests", [
      makeGuest({ id: "g1", firstName: "New", createdAt: new Date(now - 86400000).toISOString() }),
      makeGuest({ id: "g2", firstName: "Old", createdAt: new Date(now - 86400000 * 30).toISOString() }),
    ]);
    const ages = getGuestAge();
    expect(ages).toHaveLength(2);
    expect(ages[0].id).toBe("g2"); // older first
    expect(ages[0].daysOld).toBeGreaterThanOrEqual(29);
  });
});

// ── getChildrenCount ──────────────────────────────────────────────────────
describe("getChildrenCount", () => {
  it("returns zeros when no confirmed guests with children", () => {
    storeSet("guests", [makeGuest({ status: "pending", children: 3 })]);
    expect(getChildrenCount().totalChildren).toBe(0);
  });

  it("counts children from confirmed guests", () => {
    storeSet("guests", [
      makeGuest({ status: "confirmed", children: 2 }),
      makeGuest({ status: "confirmed", children: 1 }),
      makeGuest({ status: "confirmed", children: 0 }),
    ]);
    const c = getChildrenCount();
    expect(c.totalChildren).toBe(3);
    expect(c.guestsWithChildren).toBe(2);
  });
});
