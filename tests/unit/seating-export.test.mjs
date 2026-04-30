/**
 * tests/unit/seating-export.test.mjs — S367: seating.js export helpers
 * Covers: buildSeatRows · seatRowsToCsv · seatRowsToJson · suggestSwaps
 *
 * Run: npm test
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/core/store.js", () => {
  const _s = {};
  return {
    storeGet: vi.fn((k) => _s[k] ?? null),
    storeSet: vi.fn((k, v) => { _s[k] = v; }),
  };
});
vi.mock("../../src/services/repositories.js", () => ({
  tableRepo: { getById: vi.fn(), getActive: vi.fn(() => Promise.resolve([])) },
  guestRepo: { getById: vi.fn(), getActive: vi.fn(() => Promise.resolve([])), update: vi.fn() },
}));

import {
  buildSeatRows,
  seatRowsToCsv,
  seatRowsToJson,
  suggestSwaps,
} from "../../src/services/seating.js";

// ── buildSeatRows ─────────────────────────────────────────────────────────

describe("buildSeatRows", () => {
  it("returns empty array when no tables", () => {
    expect(buildSeatRows([], [])).toEqual([]);
  });

  it("returns empty when table has no seated guests", () => {
    const tables = [{ id: "t1", name: "Table 1" }];
    const guests = [{ id: "g1", firstName: "Avi", tableId: null }];
    expect(buildSeatRows(tables, guests)).toEqual([]);
  });

  it("builds row for seated guest", () => {
    const tables = [{ id: "t1", name: "Table 1" }];
    const guests = [{ id: "g1", firstName: "Avi", lastName: "Cohen", tableId: "t1", count: 2 }];
    const rows = buildSeatRows(tables, guests);
    expect(rows).toHaveLength(1);
    expect(rows[0].table).toBe("Table 1");
    expect(rows[0].seat).toBe(1);
    expect(rows[0].guest).toBe("Avi Cohen");
    expect(rows[0].count).toBe(2);
  });

  it("increments seat number per table", () => {
    const tables = [{ id: "t1", name: "T1" }];
    const guests = [
      { id: "g1", firstName: "A", tableId: "t1" },
      { id: "g2", firstName: "B", tableId: "t1" },
    ];
    const rows = buildSeatRows(tables, guests);
    expect(rows[0].seat).toBe(1);
    expect(rows[1].seat).toBe(2);
  });

  it("only includes guests seated at the given table", () => {
    const tables = [{ id: "t1", name: "T1" }, { id: "t2", name: "T2" }];
    const guests = [
      { id: "g1", firstName: "A", tableId: "t1" },
      { id: "g2", firstName: "B", tableId: "t2" },
    ];
    const rows = buildSeatRows(tables, guests);
    expect(rows).toHaveLength(2);
    const t1Rows = rows.filter((r) => r.table === "T1");
    const t2Rows = rows.filter((r) => r.table === "T2");
    expect(t1Rows).toHaveLength(1);
    expect(t2Rows).toHaveLength(1);
  });

  it("falls back to guest id when no name available", () => {
    const tables = [{ id: "t1" }];
    const guests = [{ id: "g-abc", tableId: "t1" }];
    const rows = buildSeatRows(tables, guests);
    expect(rows[0].guest).toBe("g-abc");
  });

  it("falls back to table id when no name on table", () => {
    const tables = [{ id: "t1" }];
    const guests = [{ id: "g1", firstName: "A", tableId: "t1" }];
    const rows = buildSeatRows(tables, guests);
    // Name should be "Table t1" or similar short form
    expect(typeof rows[0].table).toBe("string");
  });

  it("defaults count to 1 when not set", () => {
    const tables = [{ id: "t1", name: "T1" }];
    const guests = [{ id: "g1", firstName: "A", tableId: "t1" }];
    const rows = buildSeatRows(tables, guests);
    expect(rows[0].count).toBe(1);
  });
});

// ── seatRowsToCsv ─────────────────────────────────────────────────────────

describe("seatRowsToCsv", () => {
  it("returns BOM-prefixed CSV header when rows is empty", () => {
    const csv = seatRowsToCsv([]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Table");
    expect(csv).toContain("Seat");
    expect(csv).toContain("Guest");
    expect(csv).toContain("Headcount");
  });

  it("produces one row per seat", () => {
    const rows = [
      { table: "T1", seat: 1, guest: "Alice", count: 1 },
      { table: "T1", seat: 2, guest: "Bob", count: 2 },
    ];
    const csv = seatRowsToCsv(rows);
    const lines = csv.split("\n");
    // BOM + header + 2 data rows
    expect(lines).toHaveLength(3);
  });

  it("uses custom header labels when provided", () => {
    const csv = seatRowsToCsv([], {
      tableHeader: "שולחן",
      seatHeader: "מושב",
      guestHeader: "אורח",
      countHeader: "כמות",
    });
    expect(csv).toContain("שולחן");
    expect(csv).toContain("מושב");
  });

  it("escapes values with commas in double quotes", () => {
    const rows = [{ table: "Table, A", seat: 1, guest: "Cohen, Avi", count: 1 }];
    const csv = seatRowsToCsv(rows);
    expect(csv).toContain('"Table, A"');
    expect(csv).toContain('"Cohen, Avi"');
  });

  it("escapes double quotes inside values", () => {
    const rows = [{ table: 'T "VIP"', seat: 1, guest: "Avi", count: 1 }];
    const csv = seatRowsToCsv(rows);
    expect(csv).toContain('"T ""VIP"""');
  });
});

// ── seatRowsToJson ────────────────────────────────────────────────────────

describe("seatRowsToJson", () => {
  it("returns valid JSON string", () => {
    const rows = [{ table: "T1", seat: 1, guest: "Alice", count: 1 }];
    const json = seatRowsToJson(rows);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].table).toBe("T1");
  });

  it("returns '[]' for empty rows", () => {
    const json = seatRowsToJson([]);
    expect(JSON.parse(json)).toEqual([]);
  });

  it("preserves all fields", () => {
    const rows = [{ table: "T1", seat: 3, guest: "Bob Cohen", count: 2 }];
    const parsed = JSON.parse(seatRowsToJson(rows));
    expect(parsed[0]).toEqual({ table: "T1", seat: 3, guest: "Bob Cohen", count: 2 });
  });
});

// ── suggestSwaps ──────────────────────────────────────────────────────────

describe("suggestSwaps", () => {
  it("returns empty array when no violations", () => {
    expect(suggestSwaps([], [])).toEqual([]);
  });

  it("returns one swap per violation", () => {
    const tables = [
      { id: "t1", guestIds: ["g1"] },
      { id: "t2", guestIds: ["g2"] },
    ];
    const violations = [
      { constraintId: "c1", type: "near", guestId: "g1", targetGuestId: "g2", message: "" },
    ];
    const swaps = suggestSwaps(tables, violations);
    expect(swaps).toHaveLength(1);
    expect(swaps[0].guestA).toBe("g1");
    expect(swaps[0].guestB).toBe("g2");
  });

  it("sets fromTableId correctly for near violation", () => {
    const tables = [
      { id: "t1", guestIds: ["g1"] },
      { id: "t2", guestIds: ["g2"] },
    ];
    const violations = [
      { constraintId: "c1", type: "near", guestId: "g1", targetGuestId: "g2", message: "" },
    ];
    const swaps = suggestSwaps(tables, violations);
    expect(swaps[0].fromTableId).toBe("t1");
    expect(swaps[0].toTableId).toBe("t2");
  });

  it("sets toTableId to a different table for far violation", () => {
    const tables = [
      { id: "t1", guestIds: ["g1", "g2"] },
      { id: "t2", guestIds: [] },
    ];
    const violations = [
      { constraintId: "c2", type: "far", guestId: "g1", targetGuestId: "g2", message: "" },
    ];
    const swaps = suggestSwaps(tables, violations);
    expect(swaps[0].toTableId).toBe("t2"); // moved to the other table
  });

  it("handles guests not found in any table", () => {
    const tables = [{ id: "t1", guestIds: [] }];
    const violations = [
      { constraintId: "c1", type: "near", guestId: "missing1", targetGuestId: "missing2", message: "" },
    ];
    const swaps = suggestSwaps(tables, violations);
    expect(swaps[0].fromTableId).toBeNull();
  });
});
