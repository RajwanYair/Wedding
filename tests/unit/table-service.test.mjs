/**
 * tests/unit/table-service.test.mjs — Unit tests for table domain service (Sprint 26)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore, storeGet, storeSet } from "../../src/core/store.js";
import { makeGuest, makeTable } from "./helpers.js";

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

const {
  assignGuestToTable,
  unassignGuestFromTable,
  moveTable,
  getTableOccupancy,
  findAvailableTables,
  getCapacityReport,
  autoAssign,
  clearAssignments,
} = await import("../../src/services/table-service.js");

function seed(guests = [], tables = []) {
  initStore({
    guests: { value: guests },
    tables: { value: tables },
    vendors: { value: [] },
    expenses: { value: [] },
    timeline: { value: [] },
    timelineDone: { value: {} },
    rsvp_log: { value: [] },
    weddingInfo: { value: {} },
  });
}

// ── assignGuestToTable ────────────────────────────────────────────────────

describe("assignGuestToTable", () => {
  beforeEach(() =>
    seed(
      [makeGuest({ id: "g1", tableId: null }), makeGuest({ id: "g2", tableId: null })],
      [makeTable({ id: "t1", capacity: 2 })],
    ),
  );

  it("assigns guest to a table", async () => {
    await assignGuestToTable("g1", "t1");
    expect(storeGet("guests")[0].tableId).toBe("t1");
  });

  it("throws for unknown guest", async () => {
    await expect(assignGuestToTable("zzz", "t1")).rejects.toThrow("Guest not found");
  });

  it("throws for unknown table", async () => {
    await expect(assignGuestToTable("g1", "zzz")).rejects.toThrow("Table not found");
  });

  it("throws when table is at capacity", async () => {
    await assignGuestToTable("g1", "t1");
    await assignGuestToTable("g2", "t1");
    const g3 = makeGuest({ id: "g3", tableId: null });
    storeSet("guests", [...storeGet("guests"), g3]);
    await expect(assignGuestToTable("g3", "t1")).rejects.toThrow("at capacity");
  });

  it("force=true bypasses capacity check", async () => {
    await assignGuestToTable("g1", "t1");
    await assignGuestToTable("g2", "t1");
    const g3 = makeGuest({ id: "g3", tableId: null });
    storeSet("guests", [...storeGet("guests"), g3]);
    await assignGuestToTable("g3", "t1", { force: true });
    expect(storeGet("guests").find((g) => g.id === "g3").tableId).toBe("t1");
  });
});

// ── unassignGuestFromTable ────────────────────────────────────────────────

describe("unassignGuestFromTable", () => {
  beforeEach(() =>
    seed([makeGuest({ id: "g1", tableId: "t1" })], [makeTable({ id: "t1", capacity: 8 })]),
  );

  it("clears tableId", async () => {
    await unassignGuestFromTable("g1");
    expect(storeGet("guests")[0].tableId).toBeNull();
  });
});

// ── moveTable ─────────────────────────────────────────────────────────────

describe("moveTable", () => {
  beforeEach(() =>
    seed(
      [
        makeGuest({ id: "g1", tableId: "t1" }),
        makeGuest({ id: "g2", tableId: "t1" }),
        makeGuest({ id: "g3", tableId: "t2" }),
      ],
      [makeTable({ id: "t1", capacity: 8 }), makeTable({ id: "t2", capacity: 8 })],
    ),
  );

  it("moves all guests from source to target table", async () => {
    await moveTable("t1", "t2");
    const guests = storeGet("guests");
    expect(guests.find((g) => g.id === "g1").tableId).toBe("t2");
    expect(guests.find((g) => g.id === "g2").tableId).toBe("t2");
  });

  it("does not change guests already on the target table", async () => {
    await moveTable("t1", "t2");
    expect(storeGet("guests").find((g) => g.id === "g3").tableId).toBe("t2");
  });
});

// ── getTableOccupancy ─────────────────────────────────────────────────────

describe("getTableOccupancy", () => {
  beforeEach(() =>
    seed(
      [makeGuest({ id: "g1", tableId: "t1" }), makeGuest({ id: "g2", tableId: "t1" })],
      [makeTable({ id: "t1", capacity: 5 })],
    ),
  );

  it("returns seated / capacity / available", async () => {
    const o = await getTableOccupancy("t1");
    expect(o.capacity).toBe(5);
    expect(o.seated).toBe(2);
    expect(o.available).toBe(3);
  });

  it("throws for unknown table", async () => {
    await expect(getTableOccupancy("zzz")).rejects.toThrow("Table not found");
  });
});

// ── findAvailableTables ───────────────────────────────────────────────────

describe("findAvailableTables", () => {
  beforeEach(() =>
    seed(
      [makeGuest({ id: "g1", tableId: "t1" })],
      [makeTable({ id: "t1", capacity: 1 }), makeTable({ id: "t2", capacity: 4 })],
    ),
  );

  it("excludes full tables", async () => {
    const avail = await findAvailableTables(1);
    expect(avail.some((t) => t.id === "t1")).toBe(false);
    expect(avail.some((t) => t.id === "t2")).toBe(true);
  });

  it("respects minAvailable filter", async () => {
    // t2 has capacity=4, seated=0 → available=4, should show for minAvailable=3
    const avail = await findAvailableTables(3);
    expect(avail.some((t) => t.id === "t2")).toBe(true);
  });
});

// ── getCapacityReport ─────────────────────────────────────────────────────

describe("getCapacityReport", () => {
  beforeEach(() =>
    seed(
      [
        makeGuest({ id: "g1", tableId: "t1" }),
        makeGuest({ id: "g2", tableId: "t1" }),
        makeGuest({ id: "g3", tableId: "t2" }),
      ],
      [makeTable({ id: "t1", capacity: 4 }), makeTable({ id: "t2", capacity: 2 })],
    ),
  );

  it("computes totals correctly", async () => {
    const r = await getCapacityReport();
    expect(r.totalTables).toBe(2);
    expect(r.totalCapacity).toBe(6);
    expect(r.totalSeated).toBe(3);
    expect(r.totalAvailable).toBe(3);
  });

  it("computes occupancyRate", async () => {
    const r = await getCapacityReport();
    expect(r.occupancyRate).toBe(50);
  });

  it("byTable has correct per-table data", async () => {
    const r = await getCapacityReport();
    const t1 = r.byTable.find((t) => t.id === "t1");
    expect(t1.seated).toBe(2);
    expect(t1.available).toBe(2);
  });
});

// ── autoAssign ────────────────────────────────────────────────────────────

describe("autoAssign", () => {
  beforeEach(() =>
    seed(
      [
        makeGuest({ id: "g1", tableId: null }),
        makeGuest({ id: "g2", tableId: null }),
        makeGuest({ id: "g3", tableId: "t1" }), // already seated
      ],
      [makeTable({ id: "t1", capacity: 2 }), makeTable({ id: "t2", capacity: 2 })],
    ),
  );

  it("assigns unseated guests to available tables", async () => {
    const result = await autoAssign(["g1", "g2"]);
    expect(result.assigned).toBe(2);
    expect(result.unplaceable).toHaveLength(0);
  });

  it("skips already-seated guests", async () => {
    const result = await autoAssign(["g3"]);
    expect(result.skipped).toBe(1);
    expect(result.assigned).toBe(0);
  });

  it("reports unplaceable guests when no seats remain", async () => {
    // Fill both tables
    seed(
      [
        makeGuest({ id: "g1", tableId: "t1" }),
        makeGuest({ id: "g2", tableId: "t1" }),
        makeGuest({ id: "g3", tableId: null }),
      ],
      [makeTable({ id: "t1", capacity: 2 })],
    );
    const result = await autoAssign(["g3"]);
    expect(result.unplaceable).toContain("g3");
  });
});

// ── clearAssignments ──────────────────────────────────────────────────────

describe("clearAssignments", () => {
  beforeEach(() =>
    seed(
      [
        makeGuest({ id: "g1", tableId: "t1" }),
        makeGuest({ id: "g2", tableId: "t1" }),
        makeGuest({ id: "g3", tableId: "t2" }),
      ],
      [makeTable({ id: "t1", capacity: 4 }), makeTable({ id: "t2", capacity: 4 })],
    ),
  );

  it("clears assignments for specified guests only", async () => {
    await clearAssignments(["g1"]);
    const guests = storeGet("guests");
    expect(guests.find((g) => g.id === "g1").tableId).toBeNull();
    expect(guests.find((g) => g.id === "g2").tableId).toBe("t1");
  });

  it("clears all assignments when no ids provided", async () => {
    await clearAssignments();
    const guests = storeGet("guests");
    expect(guests.every((g) => g.tableId === null)).toBe(true);
  });
});
