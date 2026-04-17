/**
 * tests/unit/seating-algorithm.test.mjs — Sprint 93
 */

import { describe, it, expect } from "vitest";
import {
  autoAssignSeating,
  validateSeating,
} from "../../src/utils/seating-algorithm.js";

const TABLES = [
  { id: "t1", capacity: 8 },
  { id: "t2", capacity: 6 },
  { id: "t3", capacity: 4 },
];

function makeGuest(overrides) {
  return {
    id: "g" + Math.random().toString(36).slice(2, 6),
    count: 1,
    tableId: null,
    status: "confirmed",
    group: "friends",
    side: "groom",
    ...overrides,
  };
}

describe("autoAssignSeating", () => {
  it("returns empty array when no guests", () => {
    expect(autoAssignSeating([], TABLES)).toEqual([]);
  });

  it("returns empty array when no tables", () => {
    const guests = [makeGuest({})];
    expect(autoAssignSeating(guests, [])).toEqual([]);
  });

  it("assigns confirmed unassigned guests", () => {
    const guests = [makeGuest({}), makeGuest({})];
    const assignments = autoAssignSeating(guests, TABLES);
    expect(assignments.length).toBe(2);
  });

  it("does not move already-assigned guests", () => {
    const guests = [makeGuest({ tableId: "t1" }), makeGuest({})];
    const assignments = autoAssignSeating(guests, TABLES);
    const ids = assignments.map((a) => a.guestId);
    expect(ids).not.toContain(guests[0].id);
  });

  it("skips non-confirmed guests by default", () => {
    const guests = [makeGuest({ status: "pending" }), makeGuest({ status: "confirmed" })];
    const assignments = autoAssignSeating(guests, TABLES);
    expect(assignments.length).toBe(1);
    expect(assignments[0].guestId).toBe(guests[1].id);
  });

  it("assigns non-confirmed when onlyConfirmed=false", () => {
    const guests = [makeGuest({ status: "pending" })];
    const assignments = autoAssignSeating(guests, TABLES, { onlyConfirmed: false });
    expect(assignments.length).toBe(1);
  });

  it("respects table capacity", () => {
    const smallTable = [{ id: "t1", capacity: 2 }];
    const guests = [
      makeGuest({ count: 2 }),
      makeGuest({ count: 2 }),
    ];
    const assignments = autoAssignSeating(guests, smallTable);
    // Only 1 guest of count 2 can fit in capacity 2
    expect(assignments.length).toBe(1);
  });

  it("respects group count > 1", () => {
    const guests = [makeGuest({ count: 5 })];
    const assignments = autoAssignSeating(guests, [{ id: "t1", capacity: 8 }]);
    expect(assignments.length).toBe(1);
    expect(assignments[0].tableId).toBe("t1");
  });
});

describe("validateSeating", () => {
  it("returns valid:true for valid seating", () => {
    const guests = [makeGuest({ count: 2 })];
    const assignments = [{ guestId: guests[0].id, tableId: "t1" }];
    const { valid, violations } = validateSeating(assignments, guests, TABLES);
    expect(valid).toBe(true);
    expect(violations).toEqual([]);
  });

  it("detects over-capacity violations", () => {
    const guests = [
      makeGuest({ count: 5 }),
      makeGuest({ count: 4 }),
    ];
    const assignments = [
      { guestId: guests[0].id, tableId: "t3" },
      { guestId: guests[1].id, tableId: "t3" },
    ];
    const { valid, violations } = validateSeating(assignments, guests, TABLES);
    expect(valid).toBe(false);
    expect(violations.length).toBeGreaterThan(0);
  });

  it("reports unknown table", () => {
    const guests = [makeGuest({ count: 1 })];
    const assignments = [{ guestId: guests[0].id, tableId: "bad-table" }];
    const { valid, violations } = validateSeating(assignments, guests, TABLES);
    expect(valid).toBe(false);
    expect(violations[0]).toMatch(/Unknown table/);
  });
});
