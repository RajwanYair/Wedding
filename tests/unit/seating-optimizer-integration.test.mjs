/**
 * S616 seating-optimizer wiring smoke test.
 *
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { initStore, storeSet, storeGet } from "../../src/core/store.js";

vi.mock("../../src/services/sheets.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(() => Promise.resolve()),
}));

const SECTION = readFileSync("src/sections/tables.js", "utf8");

describe("S616 seating-optimizer wiring", () => {
  beforeEach(() => {
    initStore({ guests: { value: [] }, tables: { value: [] } });
  });

  it("imports planSeating + applyPlan from utils/seating-optimizer.js", () => {
    expect(SECTION).toMatch(/from\s+"\.\.\/utils\/seating-optimizer\.js"/);
    expect(SECTION).toMatch(/planSeating/);
    expect(SECTION).toMatch(/applyPlan/);
  });

  it("buildSeatingPlan assigns confirmed guests within capacity", async () => {
    storeSet("tables", [{ id: "T1", capacity: 8 }, { id: "T2", capacity: 8 }]);
    storeSet("guests", [
      { id: "g1", status: "confirmed", groupId: "fam" },
      { id: "g2", status: "confirmed", groupId: "fam" },
      { id: "g3", status: "confirmed" },
    ]);
    const { buildSeatingPlan } = await import("../../src/sections/tables.js");
    const plan = buildSeatingPlan();
    expect(plan.assignments.length).toBe(3);
    expect(plan.unseated).toHaveLength(0);
  });

  it("commitSeatingPlan persists tableIds onto guests", async () => {
    storeSet("tables", [{ id: "T1", capacity: 4 }]);
    storeSet("guests", [{ id: "g1", status: "confirmed" }]);
    const { buildSeatingPlan, commitSeatingPlan } = await import(
      "../../src/sections/tables.js"
    );
    const plan = buildSeatingPlan();
    const r = commitSeatingPlan(plan);
    expect(r.assigned).toBe(1);
    const guests = /** @type {any[]} */ (storeGet("guests"));
    expect(guests[0].tableId).toBe("T1");
  });

  it("getRemainingSeatsByTable subtracts seated guests", async () => {
    storeSet("tables", [{ id: "T1", capacity: 4 }, { id: "T2", capacity: 4 }]);
    storeSet("guests", [
      { id: "g1", tableId: "T1" },
      { id: "g2", tableId: "T1" },
    ]);
    const { getRemainingSeatsByTable } = await import("../../src/sections/tables.js");
    const r = getRemainingSeatsByTable();
    expect(r.T1).toBe(2);
    expect(r.T2).toBe(4);
  });
});
