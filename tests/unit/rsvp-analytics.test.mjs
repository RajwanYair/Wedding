/**
 * tests/unit/rsvp-analytics.test.mjs — Sprint 51 / B6
 * Unit tests for src/services/rsvp-analytics.js
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore } from "../../src/core/store.js";

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

const { getRsvpFunnel, getRsvpConversionRates, unseatedConfirmedCount } =
  await import("../../src/services/rsvp-analytics.js");

const GUESTS = [
  { id: "g1", status: "confirmed", phone: "054-100-0001", tableId: "t1", count: 2 },
  { id: "g2", status: "confirmed", phone: "054-100-0002", tableId: null },
  { id: "g3", status: "pending", phone: "054-100-0003", tableId: null },
  { id: "g4", status: "declined", phone: "", tableId: null },
  { id: "g5", status: "pending", phone: null, tableId: null },
];

function seed(guests = GUESTS) {
  initStore({ guests: { value: guests }, weddingInfo: { value: {} } });
}

beforeEach(() => seed());

describe("getRsvpFunnel", () => {
  it("counts invited as total guests", () => {
    expect(getRsvpFunnel().invited).toBe(5);
  });

  it("counts reachable as guests with non-empty phone", () => {
    // g1, g2, g3 have phone; g4 empty string; g5 null
    expect(getRsvpFunnel().reachable).toBe(3);
  });

  it("counts responded as guests with status != pending", () => {
    // g1 confirmed, g2 confirmed, g4 declined = 3
    expect(getRsvpFunnel().responded).toBe(3);
  });

  it("counts confirmed correctly", () => {
    expect(getRsvpFunnel().confirmed).toBe(2);
  });

  it("sums attending using count field (defaults to 1)", () => {
    // g1 count=2, g2 count=undefined → 1; total = 3
    expect(getRsvpFunnel().attending).toBe(3);
  });

  it("counts seated as confirmed with tableId", () => {
    // only g1 has tableId
    expect(getRsvpFunnel().seated).toBe(1);
  });

  it("returns all zeros for empty store", () => {
    seed([]);
    const f = getRsvpFunnel();
    expect(f.invited).toBe(0);
    expect(f.confirmed).toBe(0);
    expect(f.seated).toBe(0);
  });

  it("works with object store (not array)", () => {
    initStore({ guests: { value: { g1: GUESTS[0], g2: GUESTS[1] } }, weddingInfo: { value: {} } });
    expect(getRsvpFunnel().invited).toBe(2);
  });
});

describe("getRsvpConversionRates", () => {
  it("returns values between 0 and 1", () => {
    const rates = getRsvpConversionRates();
    for (const v of Object.values(rates)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("returns 0 for all rates when no guests", () => {
    seed([]);
    const rates = getRsvpConversionRates();
    for (const v of Object.values(rates)) {
      expect(v).toBe(0);
    }
  });

  it("calculates overallRate as confirmed/invited", () => {
    const rates = getRsvpConversionRates();
    expect(rates.overallRate).toBeCloseTo(2 / 5);
  });

  it("calculates invitedToReachable correctly", () => {
    const rates = getRsvpConversionRates();
    expect(rates.invitedToReachable).toBeCloseTo(3 / 5);
  });
});

describe("unseatedConfirmedCount", () => {
  it("returns count of confirmed guests without tableId", () => {
    // g2 is confirmed with no tableId
    expect(unseatedConfirmedCount()).toBe(1);
  });

  it("returns 0 when all confirmed are seated", () => {
    seed([{ id: "g1", status: "confirmed", phone: "054-1", tableId: "t1", count: 1 }]);
    expect(unseatedConfirmedCount()).toBe(0);
  });

  it("returns 0 for empty store", () => {
    seed([]);
    expect(unseatedConfirmedCount()).toBe(0);
  });
});
