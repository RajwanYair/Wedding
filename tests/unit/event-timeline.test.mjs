import { describe, it, expect } from "vitest";
import {
  sortItems,
  findConflicts,
  totalSpan,
  insertWithShift,
} from "../../src/utils/event-timeline.js";

const item = (id, start, duration) => ({ id, title: id, startMinute: start, duration });

describe("event-timeline", () => {
  it("sortItems orders by start time", () => {
    const out = sortItems([item("b", 30, 10), item("a", 0, 10)]);
    expect(out.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("sortItems breaks ties by duration then id", () => {
    const out = sortItems([item("b", 0, 20), item("a", 0, 10), item("c", 0, 10)]);
    expect(out.map((i) => i.id)).toEqual(["a", "c", "b"]);
  });

  it("sortItems does not mutate input", () => {
    const arr = [item("b", 30, 10), item("a", 0, 10)];
    const copy = [...arr];
    sortItems(arr);
    expect(arr).toEqual(copy);
  });

  it("findConflicts detects overlaps", () => {
    const conflicts = findConflicts([item("a", 0, 30), item("b", 20, 10)]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toEqual({ aId: "a", bId: "b", kind: "overlap" });
  });

  it("findConflicts no overlap when adjacent", () => {
    expect(findConflicts([item("a", 0, 30), item("b", 30, 10)])).toEqual([]);
  });

  it("findConflicts detects duplicate ids", () => {
    const conflicts = findConflicts([item("a", 0, 10), item("a", 30, 10)]);
    expect(conflicts.some((c) => c.kind === "duplicate-id")).toBe(true);
  });

  it("totalSpan computes earliest-to-latest minutes", () => {
    expect(totalSpan([item("a", 10, 20), item("b", 60, 30)])).toBe(80);
  });

  it("totalSpan returns 0 for empty input", () => {
    expect(totalSpan([])).toBe(0);
  });

  it("insertWithShift inserts at position when no overlap", () => {
    const out = insertWithShift([item("a", 0, 10)], item("b", 30, 10));
    expect(out.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("insertWithShift pushes later items when overlap", () => {
    const out = insertWithShift([item("a", 0, 10), item("b", 20, 10)], item("new", 5, 30));
    expect(out.find((i) => i.id === "new").startMinute).toBe(5);
    expect(out.find((i) => i.id === "b").startMinute).toBeGreaterThanOrEqual(35);
  });

  it("insertWithShift appends when start past all items", () => {
    const out = insertWithShift([item("a", 0, 10)], item("b", 100, 10));
    expect(out.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("insertWithShift validates duration", () => {
    expect(() => insertWithShift([], { id: "x", title: "x", startMinute: 0, duration: 0 })).toThrow(
      RangeError,
    );
  });

  it("insertWithShift validates id", () => {
    expect(() => insertWithShift([], { startMinute: 0, duration: 5 })).toThrow(TypeError);
  });
});
