/**
 * tests/unit/tables.integration.test.mjs — Integration tests for tables section (S6.7)
 * Covers: saveTable · deleteTable · autoAssignTables · getTableStats
 *
 * @vitest-environment happy-dom
 * Run: npm test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initStore, storeGet, storeSet } from "../../src/core/store.js";
import {
  saveTable,
  deleteTable,
  autoAssignTables,
  getTableStats,
  getTablesWithMixedDiets,
  getTableUtilization,
  getTableSideBalance,
  getOverCapacityTables,
  getUnseatedGuestBreakdown,
} from "../../src/sections/tables.js";

beforeEach(() => {
  vi.useFakeTimers();
  initStore({ tables: { value: [] }, guests: { value: [] } });
  storeSet("tables", []);
  storeSet("guests", []);
});

afterEach(() => {
  vi.useRealTimers();
});

function makeTable(overrides = {}) {
  return { name: "Table 1", capacity: 8, shape: "round", ...overrides };
}

function makeGuest(overrides = {}) {
  return {
    id: `g${Math.random().toString(36).slice(2)}`,
    firstName: "Test",
    phone: "",
    count: 1,
    status: "confirmed",
    group: "friends",
    ...overrides,
  };
}

// ── saveTable ─────────────────────────────────────────────────────────────
describe("saveTable", () => {
  it("creates a new table and returns ok:true", () => {
    const result = saveTable(makeTable());
    expect(result.ok).toBe(true);
    expect(storeGet("tables").length).toBe(1);
  });

  it("stores provided shape value correctly", () => {
    saveTable({ name: "T1", capacity: 6, shape: "rect" });
    expect(storeGet("tables")[0].shape).toBe("rect");
  });

  it("rejects missing name", () => {
    const result = saveTable({ capacity: 8 });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("clamps capacity to min (1) when below minimum", () => {
    const result = saveTable({ name: "Table", capacity: 0 });
    // sanitize clamps number to min rather than rejecting
    expect(result.ok).toBe(true);
    expect(storeGet("tables")[0].capacity).toBe(1);
  });

  it("updates an existing table by ID", () => {
    saveTable(makeTable({ name: "Original" }));
    const id = storeGet("tables")[0].id;
    const result = saveTable({ name: "Updated", capacity: 10, shape: "rect" }, id);
    expect(result.ok).toBe(true);
    expect(storeGet("tables")[0].name).toBe("Updated");
    expect(storeGet("tables")[0].capacity).toBe(10);
  });

  it("returns error for unknown ID on update", () => {
    const result = saveTable(makeTable(), "nonexistent-id");
    expect(result.ok).toBe(false);
  });

  it("assigns a uid to new tables", () => {
    saveTable(makeTable({ name: "T1" }));
    saveTable(makeTable({ name: "T2" }));
    const tables = storeGet("tables");
    expect(tables[0].id).toBeTruthy();
    expect(tables[0].id).not.toBe(tables[1].id);
  });

  it("stores createdAt and updatedAt timestamps", () => {
    saveTable(makeTable());
    const tbl = storeGet("tables")[0];
    expect(tbl.createdAt).toBeTruthy();
    expect(tbl.updatedAt).toBeTruthy();
  });

  it("multiple tables can be saved", () => {
    saveTable(makeTable({ name: "T1" }));
    saveTable(makeTable({ name: "T2" }));
    saveTable(makeTable({ name: "T3" }));
    expect(storeGet("tables").length).toBe(3);
  });
});

// ── deleteTable ───────────────────────────────────────────────────────────
describe("deleteTable", () => {
  it("removes the table from the store", () => {
    saveTable(makeTable());
    const id = storeGet("tables")[0].id;
    deleteTable(id);
    expect(storeGet("tables").length).toBe(0);
  });

  it("unassigns seated guests when table is deleted", () => {
    saveTable(makeTable());
    const tid = storeGet("tables")[0].id;
    storeSet("guests", [makeGuest({ tableId: tid }), makeGuest({ tableId: tid })]);
    deleteTable(tid);
    expect(storeGet("guests").every((g) => !g.tableId)).toBe(true);
  });

  it("leaves other tables untouched", () => {
    saveTable(makeTable({ name: "Keep" }));
    saveTable(makeTable({ name: "Delete" }));
    const tables = storeGet("tables");
    deleteTable(tables[1].id);
    expect(storeGet("tables").length).toBe(1);
    expect(storeGet("tables")[0].name).toBe("Keep");
  });
});

// ── autoAssignTables ──────────────────────────────────────────────────────
describe("autoAssignTables", () => {
  it("assigns unassigned guests to available tables", () => {
    saveTable(makeTable({ capacity: 10 }));
    storeSet("guests", [makeGuest({ id: "g1" }), makeGuest({ id: "g2" })]);
    autoAssignTables();
    const guests = storeGet("guests");
    expect(guests.every((g) => g.tableId)).toBe(true);
  });

  it("does not assign declined guests", () => {
    saveTable(makeTable({ capacity: 10 }));
    storeSet("guests", [makeGuest({ id: "g1", status: "declined" })]);
    autoAssignTables();
    expect(storeGet("guests")[0].tableId).toBeFalsy();
  });

  it("respects table capacity limits", () => {
    saveTable(makeTable({ capacity: 1 }));
    storeSet("guests", [
      makeGuest({ id: "g1", count: 1 }),
      makeGuest({ id: "g2", count: 1 }),
    ]);
    autoAssignTables();
    const seated = storeGet("guests").filter((g) => g.tableId).length;
    expect(seated).toBe(1); // only one fits
  });

  it("prioritises family group over others", () => {
    saveTable(makeTable({ capacity: 1 })); // only 1 seat
    storeSet("guests", [
      makeGuest({ id: "g1", group: "other" }),
      makeGuest({ id: "g2", group: "family" }),
    ]);
    autoAssignTables();
    const guests = storeGet("guests");
    const family = guests.find((g) => g.id === "g2");
    expect(family.tableId).toBeTruthy();
  });
});

// ── getTableStats ─────────────────────────────────────────────────────────
describe("getTableStats", () => {
  it("returns zeros when no tables/guests", () => {
    const stats = getTableStats();
    expect(stats.totalTables).toBe(0);
    expect(stats.totalCapacity).toBe(0);
    expect(stats.totalSeated).toBe(0);
    expect(stats.available).toBe(0);
  });

  it("counts total tables and capacity", () => {
    saveTable(makeTable({ capacity: 8 }));
    saveTable(makeTable({ capacity: 10 }));
    const stats = getTableStats();
    expect(stats.totalTables).toBe(2);
    expect(stats.totalCapacity).toBe(18);
  });

  it("counts seated guests correctly", () => {
    saveTable(makeTable({ capacity: 10 }));
    const tid = storeGet("tables")[0].id;
    storeSet("guests", [
      makeGuest({ tableId: tid, count: 2 }),
      makeGuest({ count: 1 }), // unseated
    ]);
    const stats = getTableStats();
    expect(stats.totalSeated).toBe(2);
    expect(stats.available).toBe(8);
  });
});

// ── getTablesWithMixedDiets ───────────────────────────────────────────────
describe("getTablesWithMixedDiets", () => {
  it("returns empty when no mixed diets", () => {
    saveTable(makeTable());
    const tid = storeGet("tables")[0].id;
    storeSet("guests", [
      makeGuest({ tableId: tid, meal: "regular" }),
      makeGuest({ tableId: tid, meal: "regular" }),
    ]);
    expect(getTablesWithMixedDiets()).toEqual([]);
  });

  it("detects tables with mixed meals", () => {
    saveTable(makeTable());
    const tid = storeGet("tables")[0].id;
    storeSet("guests", [
      makeGuest({ tableId: tid, meal: "regular" }),
      makeGuest({ tableId: tid, meal: "vegan" }),
    ]);
    const mixed = getTablesWithMixedDiets();
    expect(mixed).toHaveLength(1);
    expect(mixed[0].meals).toContain("regular");
    expect(mixed[0].meals).toContain("vegan");
  });
});

// ── getTableUtilization ───────────────────────────────────────────────────
describe("getTableUtilization", () => {
  it("computes utilization for each table", () => {
    saveTable(makeTable({ capacity: 10 }));
    const tid = storeGet("tables")[0].id;
    storeSet("guests", [
      makeGuest({ tableId: tid }),
      makeGuest({ tableId: tid }),
    ]);
    const util = getTableUtilization();
    expect(util).toHaveLength(1);
    expect(util[0].seated).toBe(2);
    expect(util[0].utilization).toBe(20);
  });

  it("returns 0 for empty table", () => {
    saveTable(makeTable({ capacity: 8 }));
    const util = getTableUtilization();
    expect(util[0].utilization).toBe(0);
  });
});

// ── getTableSideBalance ───────────────────────────────────────────────────
describe("getTableSideBalance", () => {
  it("counts groom, bride, mutual per table", () => {
    saveTable(makeTable());
    const tid = storeGet("tables")[0].id;
    storeSet("guests", [
      makeGuest({ tableId: tid, side: "groom" }),
      makeGuest({ tableId: tid, side: "bride" }),
      makeGuest({ tableId: tid, side: "mutual" }),
      makeGuest({ tableId: tid }), // no side = mutual
    ]);
    const bal = getTableSideBalance();
    expect(bal[0].groom).toBe(1);
    expect(bal[0].bride).toBe(1);
    expect(bal[0].mutual).toBe(2);
  });
});

// ── getOverCapacityTables ─────────────────────────────────────────────────
describe("getOverCapacityTables", () => {
  it("returns empty when all tables within capacity", () => {
    saveTable(makeTable({ capacity: 10 }));
    expect(getOverCapacityTables()).toEqual([]);
  });

  it("detects over-capacity tables", () => {
    saveTable(makeTable({ capacity: 2 }));
    const tid = storeGet("tables")[0].id;
    storeSet("guests", [
      makeGuest({ tableId: tid }),
      makeGuest({ tableId: tid }),
      makeGuest({ tableId: tid }),
    ]);
    const over = getOverCapacityTables();
    expect(over).toHaveLength(1);
    expect(over[0].over).toBe(1);
  });
});

// ── getUnseatedGuestBreakdown ─────────────────────────────────────────────
describe("getUnseatedGuestBreakdown", () => {
  it("returns zeros when all guests seated", () => {
    saveTable(makeTable());
    const tid = storeGet("tables")[0].id;
    storeSet("guests", [
      makeGuest({ tableId: tid, status: "confirmed" }),
    ]);
    expect(getUnseatedGuestBreakdown().total).toBe(0);
  });

  it("counts unseated confirmed guests by side and group", () => {
    storeSet("guests", [
      makeGuest({ status: "confirmed", side: "groom", group: "family" }),
      makeGuest({ status: "confirmed", side: "bride", group: "friends" }),
      makeGuest({ status: "confirmed", side: "groom", group: "family" }),
      makeGuest({ status: "pending" }), // not counted (not confirmed)
    ]);
    const bd = getUnseatedGuestBreakdown();
    expect(bd.total).toBe(3);
    expect(bd.bySide.groom).toBe(2);
    expect(bd.bySide.bride).toBe(1);
    expect(bd.byGroup.family).toBe(2);
    expect(bd.byGroup.friends).toBe(1);
  });
});
