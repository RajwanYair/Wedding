import { describe, it, expect } from "vitest";
import {
  remainingCapacity,
  planSeating,
  applyPlan,
} from "../../src/utils/seating-optimizer.js";

describe("seating-optimizer", () => {
  it("remainingCapacity subtracts seated guests", () => {
    const tables = [{ id: "t1", capacity: 4 }, { id: "t2", capacity: 6 }];
    const guests = [
      { id: "a", tableId: "t1" },
      { id: "b", tableId: "t1" },
      { id: "c" },
    ];
    const r = remainingCapacity(tables, guests);
    expect(r.get("t1")).toBe(2);
    expect(r.get("t2")).toBe(6);
  });

  it("remainingCapacity treats invalid capacity as 0", () => {
    const r = remainingCapacity([{ id: "t1", capacity: -3 }], []);
    expect(r.get("t1")).toBe(0);
  });

  it("planSeating places solo confirmed guests in available tables", () => {
    const tables = [{ id: "t1", capacity: 2 }];
    const guests = [
      { id: "a", status: "confirmed" },
      { id: "b", status: "confirmed" },
    ];
    const plan = planSeating(guests, tables);
    expect(plan.assignments).toHaveLength(2);
    expect(plan.unseated).toEqual([]);
  });

  it("planSeating skips non-confirmed when confirmedOnly default", () => {
    const plan = planSeating(
      [{ id: "a", status: "pending" }],
      [{ id: "t1", capacity: 4 }],
    );
    expect(plan.assignments).toEqual([]);
    expect(plan.unseated).toEqual([]);
  });

  it("planSeating includes pending when confirmedOnly false", () => {
    const plan = planSeating(
      [{ id: "a", status: "pending" }],
      [{ id: "t1", capacity: 4 }],
      { confirmedOnly: false },
    );
    expect(plan.assignments).toHaveLength(1);
  });

  it("planSeating keeps a group together at one table", () => {
    const tables = [
      { id: "t1", capacity: 4 },
      { id: "t2", capacity: 4 },
    ];
    const guests = [
      { id: "a", status: "confirmed", groupId: "fam" },
      { id: "b", status: "confirmed", groupId: "fam" },
      { id: "c", status: "confirmed", groupId: "fam" },
    ];
    const plan = planSeating(guests, tables);
    const tids = new Set(plan.assignments.map((a) => a.tableId));
    expect(tids.size).toBe(1);
  });

  it("planSeating prefers a table that already hosts the group", () => {
    const tables = [
      { id: "t1", capacity: 6 },
      { id: "t2", capacity: 6 },
    ];
    const guests = [
      { id: "x", tableId: "t2", groupId: "fam" },
      { id: "a", status: "confirmed", groupId: "fam" },
      { id: "b", status: "confirmed", groupId: "fam" },
    ];
    const plan = planSeating(guests, tables);
    expect(plan.assignments.every((a) => a.tableId === "t2")).toBe(true);
  });

  it("planSeating splits a group when no table fits whole", () => {
    const tables = [
      { id: "t1", capacity: 2 },
      { id: "t2", capacity: 2 },
    ];
    const guests = [
      { id: "a", status: "confirmed", groupId: "fam" },
      { id: "b", status: "confirmed", groupId: "fam" },
      { id: "c", status: "confirmed", groupId: "fam" },
    ];
    const plan = planSeating(guests, tables);
    expect(plan.assignments).toHaveLength(3);
    expect(plan.unseated).toEqual([]);
    const tids = new Set(plan.assignments.map((a) => a.tableId));
    expect(tids.size).toBe(2);
  });

  it("planSeating reports unseated when capacity exhausted", () => {
    const plan = planSeating(
      [
        { id: "a", status: "confirmed" },
        { id: "b", status: "confirmed" },
        { id: "c", status: "confirmed" },
      ],
      [{ id: "t1", capacity: 1 }],
    );
    expect(plan.assignments).toHaveLength(1);
    expect(plan.unseated).toHaveLength(2);
  });

  it("planSeating ignores already-seated guests", () => {
    const plan = planSeating(
      [{ id: "a", tableId: "t1", status: "confirmed" }],
      [{ id: "t1", capacity: 4 }],
    );
    expect(plan.assignments).toEqual([]);
  });

  it("applyPlan sets tableId on assigned guests", () => {
    const guests = [{ id: "a" }, { id: "b" }];
    const plan = { assignments: [{ guestId: "a", tableId: "t1" }], unseated: [] };
    const out = applyPlan(guests, plan);
    expect(out[0].tableId).toBe("t1");
    expect(out[1].tableId).toBeUndefined();
  });

  it("applyPlan returns a new array", () => {
    const guests = [{ id: "a" }];
    const out = applyPlan(guests, { assignments: [], unseated: [] });
    expect(out).not.toBe(guests);
  });
});
