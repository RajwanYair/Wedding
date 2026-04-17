/**
 * tests/unit/list-diff.test.mjs — Sprint 154
 */

import { describe, it, expect } from "vitest";
import { diffLists, isItemEqual, getChangedItems } from "../../src/utils/list-diff.js";

const item = (id, val = 1) => ({ id, val });

describe("diffLists", () => {
  it("returns all items as added when prev is empty", () => {
    const { added, removed, moved, same } = diffLists([], [item("a"), item("b")], "id");
    expect(added).toHaveLength(2);
    expect(removed).toHaveLength(0);
    expect(moved).toHaveLength(0);
    expect(same).toHaveLength(0);
  });

  it("returns all items as removed when next is empty", () => {
    const { added, removed } = diffLists([item("a"), item("b")], [], "id");
    expect(added).toHaveLength(0);
    expect(removed).toHaveLength(2);
  });

  it("detects added items correctly", () => {
    const prev = [item("a"), item("b")];
    const next = [item("a"), item("b"), item("c")];
    const { added } = diffLists(prev, next, "id");
    expect(added.map((x) => x.id)).toEqual(["c"]);
  });

  it("detects removed items correctly", () => {
    const prev = [item("a"), item("b"), item("c")];
    const next = [item("a"), item("c")];
    const { removed } = diffLists(prev, next, "id");
    expect(removed.map((x) => x.id)).toEqual(["b"]);
  });

  it("detects same items (same position)", () => {
    const prev = [item("a"), item("b")];
    const next = [item("a"), item("b")];
    const { same, moved } = diffLists(prev, next, "id");
    expect(same).toHaveLength(2);
    expect(moved).toHaveLength(0);
  });

  it("detects moved items (different position)", () => {
    const prev = [item("a"), item("b"), item("c")];
    const next = [item("c"), item("a"), item("b")];
    const { moved } = diffLists(prev, next, "id");
    expect(moved.length).toBeGreaterThan(0);
  });

  it("handles empty prev and empty next", () => {
    const result = diffLists([], [], "id");
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
  });

  it("supports custom keyProp", () => {
    const prev = [{ uid: "x", v: 1 }];
    const next = [{ uid: "x", v: 1 }, { uid: "y", v: 2 }];
    const { added } = diffLists(prev, next, "uid");
    expect(added).toHaveLength(1);
    expect(added[0].uid).toBe("y");
  });
});

describe("isItemEqual", () => {
  it("returns true for identical objects", () => {
    expect(isItemEqual({ a: 1 }, { a: 1 })).toBe(true);
  });

  it("returns false for different objects", () => {
    expect(isItemEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it("returns true for same primitive", () => {
    expect(isItemEqual(42, 42)).toBe(true);
  });

  it("returns false for different primitives", () => {
    expect(isItemEqual("x", "y")).toBe(false);
  });

  it("returns true for same reference", () => {
    const obj = { a: 1 };
    expect(isItemEqual(obj, obj)).toBe(true);
  });

  it("handles nested objects", () => {
    expect(isItemEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
    expect(isItemEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
  });
});

describe("getChangedItems", () => {
  it("returns items whose content changed", () => {
    const prev = [item("a", 1), item("b", 2)];
    const next = [item("a", 1), item("b", 99)];
    const changed = getChangedItems(prev, next);
    expect(changed).toHaveLength(1);
    expect(changed[0].id).toBe("b");
  });

  it("returns empty when nothing changed", () => {
    const data = [item("a", 1), item("b", 2)];
    expect(getChangedItems(data, data)).toHaveLength(0);
  });

  it("excludes newly added items (no prev)", () => {
    const prev = [item("a", 1)];
    const next = [item("a", 1), item("b", 2)];
    const changed = getChangedItems(prev, next);
    expect(changed).toHaveLength(0);
  });

  it("excludes removed items", () => {
    const prev = [item("a", 1), item("b", 2)];
    const next = [item("a", 1)];
    const changed = getChangedItems(prev, next);
    expect(changed).toHaveLength(0);
  });
});
