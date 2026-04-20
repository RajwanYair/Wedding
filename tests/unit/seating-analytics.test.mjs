/**
 * tests/unit/seating-analytics.test.mjs — Sprint 32
 *
 * Tests for src/utils/seating-analytics.js — computeSeatingHeatmap,
 * getImbalancedTables.
 */

import { describe, it, expect } from "vitest";
import { makeGuest, makeTable } from "./helpers.js";
import {
  computeSeatingHeatmap,
  getImbalancedTables,
} from "../../src/utils/seating-analytics.js";

// ── computeSeatingHeatmap ──────────────────────────────────────────────

describe("computeSeatingHeatmap()", () => {
  it("returns zero totals for empty guests and tables", () => {
    const h = computeSeatingHeatmap([], []);
    expect(h.totalSeats).toBe(0);
    expect(h.totalOccupied).toBe(0);
    expect(h.tables).toEqual([]);
    expect(h.overallPct).toBe(0);
  });

  it("counts empty tables when no guests assigned", () => {
    const tables = [makeTable({ id: "t1", capacity: 8 })];
    const h = computeSeatingHeatmap([], tables);
    expect(h.totalSeats).toBe(8);
    expect(h.totalOccupied).toBe(0);
    expect(h.tables[0].heatLevel).toBe("empty");
  });

  it("only counts confirmed guests for occupancy", () => {
    const tables = [makeTable({ id: "t1", capacity: 10 })];
    const guests = [
      makeGuest({ status: "confirmed", tableId: "t1", count: 2, children: 0 }),
      makeGuest({ status: "pending",   tableId: "t1", count: 3, children: 0 }),
    ];
    const h = computeSeatingHeatmap(guests, tables);
    expect(h.tables[0].occupied).toBe(2);
    expect(h.unassignedGuests).toBe(0);
  });

  it("tracks unassigned confirmed guests separately", () => {
    const tables = [makeTable({ id: "t1", capacity: 8 })];
    const guests = [
      makeGuest({ status: "confirmed", tableId: null, count: 2, children: 1 }),
    ];
    const h = computeSeatingHeatmap(guests, tables);
    expect(h.unassignedGuests).toBe(1);
    expect(h.unassignedHeads).toBe(3);
    expect(h.tables[0].occupied).toBe(0);
  });

  it("weights occupancy by head count (count + children)", () => {
    const tables = [makeTable({ id: "t1", capacity: 10 })];
    const guests = [
      makeGuest({ status: "confirmed", tableId: "t1", count: 2, children: 2 }),
    ];
    const h = computeSeatingHeatmap(guests, tables);
    expect(h.tables[0].occupied).toBe(4);
    expect(h.tables[0].occupancyPct).toBe(40);
  });

  it("assigns correct heat levels", () => {
    const tables = [
      makeTable({ id: "t1", capacity: 10 }),
      makeTable({ id: "t2", capacity: 10 }),
      makeTable({ id: "t3", capacity: 10 }),
      makeTable({ id: "t4", capacity: 10 }),
      makeTable({ id: "t5", capacity: 10 }),
    ];
    const confirmed = (tableId, count) =>
      makeGuest({ status: "confirmed", tableId, count, children: 0 });

    const guests = [
      // t1: 0  → empty
      // t2: 2  → 20% → low
      confirmed("t2", 2),
      // t3: 6  → 60% → medium
      confirmed("t3", 6),
      // t4: 9  → 90% → high
      confirmed("t4", 9),
      // t5: 10 → 100% → full
      confirmed("t5", 10),
    ];

    const h = computeSeatingHeatmap(guests, tables);
    const byId = Object.fromEntries(h.tables.map((t) => [t.tableId, t]));
    expect(byId.t1.heatLevel).toBe("empty");
    expect(byId.t2.heatLevel).toBe("low");
    expect(byId.t3.heatLevel).toBe("medium");
    expect(byId.t4.heatLevel).toBe("high");
    expect(byId.t5.heatLevel).toBe("full");
  });

  it("flags over-capacity tables with heatLevel=over", () => {
    const tables = [makeTable({ id: "t1", capacity: 4 })];
    const guests = [makeGuest({ status: "confirmed", tableId: "t1", count: 6, children: 0 })];
    const h = computeSeatingHeatmap(guests, tables);
    expect(h.tables[0].heatLevel).toBe("over");
  });

  it("builds meal breakdown per table", () => {
    const tables = [makeTable({ id: "t1", capacity: 10 })];
    const guests = [
      makeGuest({ status: "confirmed", tableId: "t1", meal: "vegan",     count: 2, children: 0 }),
      makeGuest({ status: "confirmed", tableId: "t1", meal: "vegetarian", count: 1, children: 0 }),
    ];
    const h = computeSeatingHeatmap(guests, tables);
    expect(h.tables[0].mealBreakdown.vegan).toBe(2);
    expect(h.tables[0].mealBreakdown.vegetarian).toBe(1);
  });

  it("computes overallPct across all tables", () => {
    const tables = [
      makeTable({ id: "t1", capacity: 10 }),
      makeTable({ id: "t2", capacity: 10 }),
    ];
    const guests = [makeGuest({ status: "confirmed", tableId: "t1", count: 5, children: 0 })];
    const h = computeSeatingHeatmap(guests, tables);
    // 5 occupied of 20 total = 25%
    expect(h.overallPct).toBe(25);
  });

  it("balanceScore is 100 for perfectly uniform occupancy", () => {
    const tables = [
      makeTable({ id: "t1", capacity: 10 }),
      makeTable({ id: "t2", capacity: 10 }),
    ];
    const guests = [
      makeGuest({ status: "confirmed", tableId: "t1", count: 5, children: 0 }),
      makeGuest({ status: "confirmed", tableId: "t2", count: 5, children: 0 }),
    ];
    expect(computeSeatingHeatmap(guests, tables).balanceScore).toBe(100);
  });

  it("balanceScore is lower when distribution is uneven", () => {
    const tables = [
      makeTable({ id: "t1", capacity: 10 }),
      makeTable({ id: "t2", capacity: 10 }),
    ];
    const guests = [
      makeGuest({ status: "confirmed", tableId: "t1", count: 10, children: 0 }),
      // t2 empty
    ];
    const h = computeSeatingHeatmap(guests, tables);
    expect(h.balanceScore).toBeLessThan(100);
  });
});

// ── getImbalancedTables ────────────────────────────────────────────────

describe("getImbalancedTables()", () => {
  const tables = [
    { tableId: "t1", occupancyPct: 10, tableName: "T1", capacity: 10, occupied: 1, available: 9, heatLevel: "low", mealBreakdown: {}, sideBreakdown: {} },
    { tableId: "t2", occupancyPct: 50, tableName: "T2", capacity: 10, occupied: 5, available: 5, heatLevel: "medium", mealBreakdown: {}, sideBreakdown: {} },
    { tableId: "t3", occupancyPct: 90, tableName: "T3", capacity: 10, occupied: 9, available: 1, heatLevel: "high", mealBreakdown: {}, sideBreakdown: {} },
    { tableId: "t4", occupancyPct: 100, tableName: "T4", capacity: 10, occupied: 10, available: 0, heatLevel: "full", mealBreakdown: {}, sideBreakdown: {} },
  ];

  it("returns most under-utilised tables first", () => {
    const { underutilised } = getImbalancedTables(tables, 2);
    expect(underutilised[0].tableId).toBe("t1");
    expect(underutilised[1].tableId).toBe("t2");
  });

  it("returns most over-utilised tables first", () => {
    const { overutilised } = getImbalancedTables(tables, 2);
    expect(overutilised[0].tableId).toBe("t4");
    expect(overutilised[1].tableId).toBe("t3");
  });

  it("returns empty arrays for empty input", () => {
    const r = getImbalancedTables([], 3);
    expect(r.underutilised).toHaveLength(0);
    expect(r.overutilised).toHaveLength(0);
  });
});
