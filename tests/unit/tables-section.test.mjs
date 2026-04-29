/**
 * tests/unit/tables-section.test.mjs — S342: data helpers in src/sections/tables.js
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
vi.mock("../../src/utils/misc.js", () => ({ uid: () => "uid-tbl-001" }));
vi.mock("../../src/utils/sanitize.js", () => ({
  sanitize: (data, _schema) => ({ value: data, errors: [] }),
}));
vi.mock("../../src/services/seating.js", () => ({
  validateSeating: () => [],
  buildSeatRows: () => [],
  seatRowsToCsv: () => "",
  seatRowsToJson: () => "[]",
  downloadTextFile: vi.fn(),
}));
vi.mock("../../src/core/section-base.js", () => ({
  BaseSection: class {
    constructor(_name) {}
    subscribe() {}
  },
  fromSection: (_s) => ({ mount: vi.fn(), unmount: vi.fn(), capabilities: [] }),
}));
vi.mock("../../src/core/events.js", () => ({ on: vi.fn() }));

// Stub window.print for printSeatingChart / printPlaceCards / printTableSigns
vi.stubGlobal("print", vi.fn());
afterEach(() => vi.unstubAllGlobals());

// Stub URL for CSV/JSON exports
vi.stubGlobal("URL", {
  createObjectURL: vi.fn(() => "blob:mock"),
  revokeObjectURL: vi.fn(),
});

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

// ── Helpers ───────────────────────────────────────────────────────────────

const mkTable = (overrides = {}) => ({
  id: "t1",
  name: "Table 1",
  capacity: 10,
  shape: "round",
  ...overrides,
});

const mkGuest = (overrides = {}) => ({
  id: "g1",
  firstName: "Yair",
  status: "confirmed",
  tableId: null,
  count: 1,
  group: "family",
  side: "groom",
  meal: "regular",
  ...overrides,
});

beforeEach(() => {
  _store.clear();
  vi.clearAllMocks();
});

// ── saveTable ─────────────────────────────────────────────────────────────

describe("saveTable", () => {
  it("adds a new table to the store", () => {
    _store.set("tables", []);
    const result = saveTable({ name: "VIP", capacity: 8 });
    expect(result.ok).toBe(true);
    expect(_store.get("tables")).toHaveLength(1);
    expect(_store.get("tables")[0].name).toBe("VIP");
  });

  it("updates an existing table when existingId provided", () => {
    _store.set("tables", [mkTable({ id: "t1", name: "Old Name" })]);
    saveTable({ name: "New Name", capacity: 12 }, "t1");
    expect(_store.get("tables")[0].name).toBe("New Name");
  });

  it("returns ok:false for non-existent existingId", () => {
    _store.set("tables", []);
    const result = saveTable({ name: "X", capacity: 10 }, "nonexistent");
    expect(result.ok).toBe(false);
  });
});

// ── deleteTable ───────────────────────────────────────────────────────────

describe("deleteTable", () => {
  it("removes the table with the given id", () => {
    _store.set("tables", [mkTable({ id: "t1" }), mkTable({ id: "t2" })]);
    _store.set("guests", []);
    deleteTable("t1");
    expect(_store.get("tables")).toHaveLength(1);
    expect(_store.get("tables")[0].id).toBe("t2");
  });

  it("unassigns guests from the deleted table", () => {
    _store.set("tables", [mkTable({ id: "t1" })]);
    _store.set("guests", [mkGuest({ id: "g1", tableId: "t1" })]);
    deleteTable("t1");
    expect(_store.get("guests")[0].tableId).toBeNull();
  });

  it("leaves guests from other tables untouched", () => {
    _store.set("tables", [mkTable({ id: "t1" }), mkTable({ id: "t2" })]);
    _store.set("guests", [
      mkGuest({ id: "g1", tableId: "t1" }),
      mkGuest({ id: "g2", tableId: "t2" }),
    ]);
    deleteTable("t1");
    expect(_store.get("guests").find((g) => g.id === "g2").tableId).toBe("t2");
  });
});

// ── autoAssignTables ──────────────────────────────────────────────────────

describe("autoAssignTables", () => {
  it("assigns unassigned guests to tables with capacity", () => {
    _store.set("tables", [mkTable({ id: "t1", capacity: 5 })]);
    _store.set("guests", [mkGuest({ id: "g1", tableId: null, status: "confirmed" })]);
    autoAssignTables();
    expect(_store.get("guests")[0].tableId).toBe("t1");
  });

  it("does not assign declined guests", () => {
    _store.set("tables", [mkTable({ id: "t1", capacity: 5 })]);
    _store.set("guests", [mkGuest({ id: "g1", tableId: null, status: "declined" })]);
    autoAssignTables();
    expect(_store.get("guests")[0].tableId).toBeNull();
  });

  it("does not reassign already-assigned guests", () => {
    _store.set("tables", [mkTable({ id: "t1", capacity: 5 }), mkTable({ id: "t2", capacity: 5 })]);
    _store.set("guests", [mkGuest({ id: "g1", tableId: "t1" })]);
    autoAssignTables();
    expect(_store.get("guests")[0].tableId).toBe("t1");
  });

  it("does not assign guests when all tables are full", () => {
    _store.set("tables", [mkTable({ id: "t1", capacity: 1 })]);
    _store.set("guests", [
      mkGuest({ id: "g1", tableId: "t1" }), // fills table
      mkGuest({ id: "g2", tableId: null, status: "confirmed" }),
    ]);
    autoAssignTables();
    expect(_store.get("guests").find((g) => g.id === "g2").tableId).toBeNull();
  });
});

// ── getTableStats ─────────────────────────────────────────────────────────

describe("getTableStats", () => {
  it("returns zeros for empty store", () => {
    _store.set("tables", []);
    _store.set("guests", []);
    expect(getTableStats()).toEqual({
      totalTables: 0,
      totalCapacity: 0,
      totalSeated: 0,
      available: 0,
    });
  });

  it("calculates totals correctly", () => {
    _store.set("tables", [
      mkTable({ id: "t1", capacity: 10 }),
      mkTable({ id: "t2", capacity: 8 }),
    ]);
    _store.set("guests", [
      mkGuest({ id: "g1", tableId: "t1", count: 1 }),
      mkGuest({ id: "g2", tableId: "t1", count: 1 }),
      mkGuest({ id: "g3", tableId: null }),
    ]);
    const stats = getTableStats();
    expect(stats.totalTables).toBe(2);
    expect(stats.totalCapacity).toBe(18);
    expect(stats.totalSeated).toBe(2);
    expect(stats.available).toBe(16);
  });
});

// ── getTablesWithMixedDiets ───────────────────────────────────────────────

describe("getTablesWithMixedDiets", () => {
  it("returns empty when all guests have same meal", () => {
    _store.set("tables", [mkTable({ id: "t1" })]);
    _store.set("guests", [
      mkGuest({ id: "g1", tableId: "t1", meal: "regular" }),
      mkGuest({ id: "g2", tableId: "t1", meal: "regular" }),
    ]);
    expect(getTablesWithMixedDiets()).toHaveLength(0);
  });

  it("returns tables with mixed diets", () => {
    _store.set("tables", [mkTable({ id: "t1" })]);
    _store.set("guests", [
      mkGuest({ id: "g1", tableId: "t1", meal: "regular" }),
      mkGuest({ id: "g2", tableId: "t1", meal: "vegetarian" }),
    ]);
    const mixed = getTablesWithMixedDiets();
    expect(mixed).toHaveLength(1);
    expect(mixed[0].tableId).toBe("t1");
    expect(mixed[0].meals).toContain("regular");
    expect(mixed[0].meals).toContain("vegetarian");
  });
});

// ── getTableUtilization ───────────────────────────────────────────────────

describe("getTableUtilization", () => {
  it("returns empty array for no tables", () => {
    _store.set("tables", []);
    _store.set("guests", []);
    expect(getTableUtilization()).toEqual([]);
  });

  it("calculates utilization percentage", () => {
    _store.set("tables", [mkTable({ id: "t1", capacity: 10 })]);
    _store.set("guests", [
      mkGuest({ id: "g1", tableId: "t1" }),
      mkGuest({ id: "g2", tableId: "t1" }),
      mkGuest({ id: "g3", tableId: "t1" }),
      mkGuest({ id: "g4", tableId: "t1" }),
      mkGuest({ id: "g5", tableId: "t1" }),
    ]);
    const util = getTableUtilization();
    expect(util[0].seated).toBe(5);
    expect(util[0].utilization).toBe(50);
  });
});

// ── getTableSideBalance ───────────────────────────────────────────────────

describe("getTableSideBalance", () => {
  it("returns empty array for no tables", () => {
    _store.set("tables", []);
    _store.set("guests", []);
    expect(getTableSideBalance()).toEqual([]);
  });

  it("counts groom/bride/mutual correctly", () => {
    _store.set("tables", [mkTable({ id: "t1" })]);
    _store.set("guests", [
      mkGuest({ id: "g1", tableId: "t1", side: "groom" }),
      mkGuest({ id: "g2", tableId: "t1", side: "bride" }),
      mkGuest({ id: "g3", tableId: "t1", side: "mutual" }),
      mkGuest({ id: "g4", tableId: "t1", side: undefined }),
    ]);
    const balance = getTableSideBalance();
    expect(balance[0].groom).toBe(1);
    expect(balance[0].bride).toBe(1);
    expect(balance[0].mutual).toBe(2); // mutual + undefined
  });
});

// ── getOverCapacityTables ─────────────────────────────────────────────────

describe("getOverCapacityTables", () => {
  it("returns empty array when no tables are over capacity", () => {
    _store.set("tables", [mkTable({ id: "t1", capacity: 5 })]);
    _store.set("guests", [mkGuest({ id: "g1", tableId: "t1" })]);
    expect(getOverCapacityTables()).toHaveLength(0);
  });

  it("detects over-capacity tables", () => {
    _store.set("tables", [mkTable({ id: "t1", capacity: 2 })]);
    _store.set("guests", [
      mkGuest({ id: "g1", tableId: "t1" }),
      mkGuest({ id: "g2", tableId: "t1" }),
      mkGuest({ id: "g3", tableId: "t1" }),
    ]);
    const over = getOverCapacityTables();
    expect(over).toHaveLength(1);
    expect(over[0].tableId).toBe("t1");
    expect(over[0].over).toBe(1);
  });
});

// ── getUnseatedGuestBreakdown ─────────────────────────────────────────────

describe("getUnseatedGuestBreakdown", () => {
  it("returns zeros for no unseated guests", () => {
    _store.set("guests", [mkGuest({ tableId: "t1", status: "confirmed" })]);
    const bd = getUnseatedGuestBreakdown();
    expect(bd.total).toBe(0);
    expect(bd.bySide).toEqual({});
    expect(bd.byGroup).toEqual({});
  });

  it("counts unseated confirmed guests", () => {
    _store.set("guests", [
      mkGuest({ id: "g1", tableId: null, status: "confirmed", side: "groom", group: "family" }),
      mkGuest({ id: "g2", tableId: null, status: "confirmed", side: "bride", group: "friends" }),
      mkGuest({ id: "g3", tableId: null, status: "pending" }), // pending, not counted
      mkGuest({ id: "g4", tableId: "t1", status: "confirmed" }), // seated, not counted
    ]);
    const bd = getUnseatedGuestBreakdown();
    expect(bd.total).toBe(2);
    expect(bd.bySide.groom).toBe(1);
    expect(bd.bySide.bride).toBe(1);
    expect(bd.byGroup.family).toBe(1);
    expect(bd.byGroup.friends).toBe(1);
  });
});
