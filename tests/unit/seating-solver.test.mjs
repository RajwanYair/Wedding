/**
 * tests/unit/seating-solver.test.mjs — S110 greedy seating solver.
 */
import { describe, it, expect } from "vitest";
import { solveSeating } from "../../src/services/seating-solver.js";

describe("S110 — solveSeating", () => {
  it("seats a single group at the smallest fitting table", () => {
    const guests = [
      { id: "a", family: "F1" },
      { id: "b", family: "F1" },
    ];
    const tables = [
      { id: "t1", capacity: 1 },
      { id: "t2", capacity: 4 },
    ];
    const r = solveSeating(guests, tables);
    expect(r.assignments.find((x) => x.guestId === "a")?.tableId).toBe("t2");
    expect(r.assignments.find((x) => x.guestId === "b")?.tableId).toBe("t2");
    expect(r.score).toBeGreaterThan(0);
  });

  it("splits a group when no single table fits and reports group_split", () => {
    const guests = [
      { id: "a", family: "F1" },
      { id: "b", family: "F1" },
      { id: "c", family: "F1" },
    ];
    const tables = [
      { id: "t1", capacity: 2 },
      { id: "t2", capacity: 1 },
    ];
    const r = solveSeating(guests, tables);
    expect(r.assignments.every((a) => a.tableId !== null)).toBe(true);
    expect(r.unsatisfied.some((u) => u.reason === "group_split")).toBe(true);
  });

  it("respects avoidWith when placing groups", () => {
    const guests = [
      { id: "a", family: "F1" },
      { id: "b", family: "F2", avoidWith: ["a"] },
    ];
    const tables = [
      { id: "t1", capacity: 1 },
      { id: "t2", capacity: 1 },
    ];
    const r = solveSeating(guests, tables);
    const ta = r.assignments.find((x) => x.guestId === "a")?.tableId;
    const tb = r.assignments.find((x) => x.guestId === "b")?.tableId;
    expect(ta).not.toBe(tb);
  });

  it("flags unplaced guests with no_capacity", () => {
    const guests = [{ id: "a" }, { id: "b" }];
    const tables = [{ id: "t1", capacity: 1 }];
    const r = solveSeating(guests, tables);
    expect(r.unsatisfied.some((u) => u.reason === "no_capacity")).toBe(true);
  });

  it("empty guest list returns score=1", () => {
    const r = solveSeating([], [{ id: "t1", capacity: 5 }]);
    expect(r.score).toBe(1);
    expect(r.assignments).toEqual([]);
  });

  it("is deterministic across runs", () => {
    const guests = [
      { id: "a", family: "F1" },
      { id: "b", family: "F1" },
      { id: "c", family: "F2" },
    ];
    const tables = [
      { id: "t1", capacity: 2 },
      { id: "t2", capacity: 2 },
    ];
    const r1 = solveSeating(guests, tables);
    const r2 = solveSeating(guests, tables);
    expect(r1.assignments).toEqual(r2.assignments);
  });
});
