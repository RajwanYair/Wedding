/**
 * tests/unit/rsvp-analytics.test.mjs — Sprint 13 (session)
 *
 * Tests for src/utils/rsvp-analytics.js — computeRsvpRates,
 * computeMealDistribution, rsvpSubmissionsByDate,
 * totalExpectedCount, guestStatsBySide.
 */

import { describe, it, expect } from "vitest";
import { makeGuest } from "./helpers.js";
import {
  computeRsvpRates,
  computeMealDistribution,
  rsvpSubmissionsByDate,
  totalExpectedCount,
  guestStatsBySide,
} from "../../src/utils/rsvp-analytics.js";


// ── computeRsvpRates ───────────────────────────────────────────────────

describe("computeRsvpRates", () => {
  it("returns all zeros for empty list", () => {
    const r = computeRsvpRates([]);
    expect(r.total).toBe(0);
    expect(r.responseRate).toBe(0);
    expect(r.confirmationRate).toBe(0);
  });

  it("counts confirmed guests correctly", () => {
    const guests = [makeGuest({ status: "confirmed" }), makeGuest({ status: "confirmed" }), makeGuest({ status: "pending" })];
    const r = computeRsvpRates(guests);
    expect(r.confirmed).toBe(2);
    expect(r.pending).toBe(1);
    expect(r.total).toBe(3);
  });

  it("counts declined guests correctly", () => {
    const guests = [makeGuest({ status: "declined" }), makeGuest({ status: "confirmed" })];
    const r = computeRsvpRates(guests);
    expect(r.declined).toBe(1);
  });

  it("counts maybe guests correctly", () => {
    const guests = [makeGuest({ status: "maybe" }), makeGuest({ status: "maybe" })];
    const r = computeRsvpRates(guests);
    expect(r.maybe).toBe(2);
  });

  it("responseRate is 100 when all confirmed", () => {
    const guests = [makeGuest({ status: "confirmed" }), makeGuest({ status: "confirmed" })];
    expect(computeRsvpRates(guests).responseRate).toBe(100);
  });

  it("responseRate is 0 when all pending", () => {
    const guests = [makeGuest({ status: "pending" }), makeGuest({ status: "pending" })];
    expect(computeRsvpRates(guests).responseRate).toBe(0);
  });

  it("responseRate rounds to nearest integer", () => {
    // 1 confirmed out of 3 = 33.33% → 33
    const guests = [makeGuest({ status: "confirmed" }), makeGuest({ status: "pending" }), makeGuest({ status: "pending" })];
    expect(computeRsvpRates(guests).confirmationRate).toBe(33);
  });

  it("declineRate is 50 when half declined", () => {
    const guests = [makeGuest({ status: "declined" }), makeGuest({ status: "confirmed" })];
    expect(computeRsvpRates(guests).declineRate).toBe(50);
  });
});

// ── computeMealDistribution ────────────────────────────────────────────

describe("computeMealDistribution", () => {
  it("returns empty object for empty list", () => {
    expect(computeMealDistribution([])).toEqual({});
  });

  it("only counts confirmed guests", () => {
    const guests = [
      makeGuest({ status: "confirmed", meal: "regular" }),
      makeGuest({ status: "pending", meal: "vegan" }),
    ];
    const dist = computeMealDistribution(guests);
    expect(dist.regular).toBe(1);
    expect(dist.vegan).toBeUndefined();
  });

  it("groups by meal type", () => {
    const guests = [
      makeGuest({ status: "confirmed", meal: "vegetarian" }),
      makeGuest({ status: "confirmed", meal: "vegetarian" }),
      makeGuest({ status: "confirmed", meal: "vegan" }),
    ];
    const dist = computeMealDistribution(guests);
    expect(dist.vegetarian).toBe(2);
    expect(dist.vegan).toBe(1);
  });

  it("defaults to 'regular' when meal is missing", () => {
    const guests = [makeGuest({ status: "confirmed", meal: null })];
    expect(computeMealDistribution(guests).regular).toBe(1);
  });
});

// ── rsvpSubmissionsByDate ──────────────────────────────────────────────

describe("rsvpSubmissionsByDate", () => {
  it("returns empty object for empty list", () => {
    expect(rsvpSubmissionsByDate([])).toEqual({});
  });

  it("skips guests without rsvpDate", () => {
    const guests = [makeGuest({ rsvpDate: null }), makeGuest({ rsvpDate: undefined })];
    expect(rsvpSubmissionsByDate(guests)).toEqual({});
  });

  it("counts submissions per date", () => {
    const guests = [
      makeGuest({ rsvpDate: "2024-06-01T10:00:00" }),
      makeGuest({ rsvpDate: "2024-06-01T14:00:00" }),
      makeGuest({ rsvpDate: "2024-06-02T09:00:00" }),
    ];
    const result = rsvpSubmissionsByDate(guests);
    expect(result["2024-06-01"]).toBe(2);
    expect(result["2024-06-02"]).toBe(1);
  });

  it("normalizes datetime to date-only string", () => {
    const guests = [makeGuest({ rsvpDate: "2024-07-15T23:59:59Z" })];
    const result = rsvpSubmissionsByDate(guests);
    expect(result["2024-07-15"]).toBe(1);
  });
});

// ── totalExpectedCount ─────────────────────────────────────────────────

describe("totalExpectedCount", () => {
  it("returns 0 for empty list", () => {
    expect(totalExpectedCount([])).toBe(0);
  });

  it("sums guest count + children", () => {
    const guests = [makeGuest({ count: 2, children: 1 }), makeGuest({ count: 3, children: 0 })];
    expect(totalExpectedCount(guests)).toBe(6);
  });

  it("defaults missing count to 1", () => {
    const guests = [makeGuest({ count: null })];
    expect(totalExpectedCount(guests)).toBe(1);
  });

  it("defaults missing children to 0", () => {
    const guests = [makeGuest({ count: 2, children: undefined })];
    expect(totalExpectedCount(guests)).toBe(2);
  });
});

// ── guestStatsBySide ───────────────────────────────────────────────────

describe("guestStatsBySide", () => {
  it("returns empty object for empty list", () => {
    expect(guestStatsBySide([])).toEqual({});
  });

  it("groups by side", () => {
    const guests = [
      makeGuest({ side: "groom", status: "confirmed" }),
      makeGuest({ side: "bride", status: "pending" }),
      makeGuest({ side: "groom", status: "pending" }),
    ];
    const stats = guestStatsBySide(guests);
    expect(stats.groom.total).toBe(2);
    expect(stats.groom.confirmed).toBe(1);
    expect(stats.groom.pending).toBe(1);
    expect(stats.bride.total).toBe(1);
    expect(stats.bride.pending).toBe(1);
  });

  it("defaults unknown side to 'unknown'", () => {
    const guests = [makeGuest({ side: null, status: "confirmed" })];
    const stats = guestStatsBySide(guests);
    expect(stats.unknown.total).toBe(1);
  });

  it("counts all three sides independently", () => {
    const guests = [
      makeGuest({ side: "groom" }), makeGuest({ side: "bride" }), makeGuest({ side: "mutual" }),
    ];
    const stats = guestStatsBySide(guests);
    expect(Object.keys(stats)).toHaveLength(3);
  });
});
