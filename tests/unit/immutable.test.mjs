/**
 * tests/unit/immutable.test.mjs — Unit tests for immutable update helpers (Phase 2)
 *
 * Run: npm test
 */

import { describe, it, expect } from "vitest";
import {
  replaceById,
  removeById,
  updateById,
  insertSorted,
  appendUnique,
  toggleIn,
  omitKeys,
  pickKeys,
  deepClone,
  setIn,
  updateIn,
  deleteIn,
  mergeDeep,
} from "../../src/utils/immutable.js";

// ── replaceById ────────────────────────────────────────────────────────────

describe("replaceById", () => {
  const arr = [
    { id: "a", name: "Alice", age: 30 },
    { id: "b", name: "Bob", age: 25 },
    { id: "c", name: "Carol", age: 28 },
  ];

  it("returns a new array (no mutation)", () => {
    const result = replaceById(arr, "a", { name: "Alicia" });
    expect(result).not.toBe(arr);
  });

  it("replaces the matching item", () => {
    const result = replaceById(arr, "b", { age: 26 });
    expect(result[1]).toEqual({ id: "b", name: "Bob", age: 26 });
  });

  it("preserves unmodified items by reference", () => {
    const result = replaceById(arr, "b", { age: 26 });
    expect(result[0]).toBe(arr[0]);
    expect(result[2]).toBe(arr[2]);
  });

  it("returns original array when id not found", () => {
    const result = replaceById(arr, "z", { name: "Zeta" });
    expect(result).toBe(arr);
  });

  it("shallow-merges patch — does not deep-merge nested objects", () => {
    const deep = [{ id: "x", meta: { a: 1, b: 2 } }];
    const result = replaceById(deep, "x", { meta: { a: 99 } });
    expect(result[0].meta).toEqual({ a: 99 }); // b dropped — shallow merge
  });
});

// ── removeById ────────────────────────────────────────────────────────────

describe("removeById", () => {
  const arr = [{ id: "1" }, { id: "2" }, { id: "3" }];

  it("removes the matching item", () => {
    expect(removeById(arr, "2")).toEqual([{ id: "1" }, { id: "3" }]);
  });

  it("returns a new array", () => {
    expect(removeById(arr, "1")).not.toBe(arr);
  });

  it("returns original array when id not found", () => {
    expect(removeById(arr, "99")).toBe(arr);
  });

  it("handles empty array", () => {
    expect(removeById([], "x")).toEqual([]);
  });

  it("removes only the first matching id if duplicates exist", () => {
    const dup = [{ id: "x" }, { id: "x" }, { id: "y" }];
    const result = removeById(dup, "x");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("y");
  });
});

// ── updateById ────────────────────────────────────────────────────────────

describe("updateById", () => {
  const arr = [{ id: "a", count: 1 }, { id: "b", count: 5 }];

  it("applies updater to matching item", () => {
    const result = updateById(arr, "a", (item) => ({ ...item, count: item.count + 10 }));
    expect(result[0].count).toBe(11);
    expect(result[1].count).toBe(5);
  });

  it("returns original array when id not found", () => {
    const result = updateById(arr, "z", (item) => item);
    expect(result).toBe(arr);
  });

  it("does not mutate the original array", () => {
    updateById(arr, "a", (item) => ({ ...item, count: 99 }));
    expect(arr[0].count).toBe(1);
  });
});

// ── insertSorted ──────────────────────────────────────────────────────────

describe("insertSorted", () => {
  const arr = [
    { id: "1", name: "Alice" },
    { id: "3", name: "Carol" },
    { id: "5", name: "Eve" },
  ];

  it("inserts in ascending sorted position", () => {
    const result = insertSorted(arr, { id: "2", name: "Bob" }, "name");
    expect(result.map((i) => i.name)).toEqual(["Alice", "Bob", "Carol", "Eve"]);
  });

  it("inserts at beginning for alphabetically first item", () => {
    const result = insertSorted(arr, { id: "0", name: "Aaron" }, "name");
    expect(result[0].name).toBe("Aaron");
  });

  it("inserts at end for alphabetically last item", () => {
    const result = insertSorted(arr, { id: "6", name: "Zoe" }, "name");
    expect(result[result.length - 1].name).toBe("Zoe");
  });

  it("inserts in descending order when dir=desc", () => {
    const descArr = [
      { id: "5", name: "Eve" },
      { id: "3", name: "Carol" },
      { id: "1", name: "Alice" },
    ];
    const result = insertSorted(descArr, { id: "2", name: "Bob" }, "name", "desc");
    expect(result.map((i) => i.name)).toEqual(["Eve", "Carol", "Bob", "Alice"]);
  });

  it("handles empty array", () => {
    const result = insertSorted([], { id: "1", name: "Alice" }, "name");
    expect(result).toHaveLength(1);
  });
});

// ── appendUnique ──────────────────────────────────────────────────────────

describe("appendUnique", () => {
  const arr = [{ id: "a", v: 1 }, { id: "b", v: 2 }];

  it("appends if id is unique", () => {
    const result = appendUnique(arr, { id: "c", v: 3 });
    expect(result).toHaveLength(3);
    expect(result[2].id).toBe("c");
  });

  it("returns original array if id already exists", () => {
    const result = appendUnique(arr, { id: "a", v: 99 });
    expect(result).toBe(arr);
  });

  it("uses custom key", () => {
    const arr2 = [{ id: "x", code: "ABC" }];
    const result = appendUnique(arr2, { id: "y", code: "ABC" }, "code");
    expect(result).toBe(arr2);
  });
});

// ── toggleIn ──────────────────────────────────────────────────────────────

describe("toggleIn", () => {
  const arr = [{ id: "a" }, { id: "b" }];

  it("appends when item not in array", () => {
    const result = toggleIn(arr, { id: "c" });
    expect(result).toHaveLength(3);
    expect(result[2].id).toBe("c");
  });

  it("removes when item is in array", () => {
    const result = toggleIn(arr, { id: "a" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("b");
  });

  it("returns new array in both cases", () => {
    expect(toggleIn(arr, { id: "c" })).not.toBe(arr);
    expect(toggleIn(arr, { id: "a" })).not.toBe(arr);
  });

  it("works with custom key", () => {
    const codes = [{ id: "1", code: "X" }];
    const removed = toggleIn(codes, { id: "1", code: "X" }, "code");
    expect(removed).toHaveLength(0);
  });
});

// ── omitKeys ──────────────────────────────────────────────────────────────

describe("omitKeys", () => {
  it("returns object without specified keys", () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(omitKeys(obj, ["b"])).toEqual({ a: 1, c: 3 });
  });

  it("returns all keys if none to omit", () => {
    const obj = { a: 1, b: 2 };
    expect(omitKeys(obj, [])).toEqual({ a: 1, b: 2 });
  });

  it("ignores non-existent keys to omit", () => {
    const obj = { a: 1 };
    expect(omitKeys(obj, ["z"])).toEqual({ a: 1 });
  });
});

// ── pickKeys ───────────────────────────────────────────────────────────────

describe("pickKeys", () => {
  it("returns only specified keys", () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(pickKeys(obj, ["a", "c"])).toEqual({ a: 1, c: 3 });
  });

  it("returns empty object for no keys", () => {
    expect(pickKeys({ a: 1 }, [])).toEqual({});
  });

  it("ignores missing keys", () => {
    const obj = { a: 1 };
    expect(pickKeys(obj, ["a", "z"])).toEqual({ a: 1 });
  });
});

// ── deepClone ─────────────────────────────────────────────────────────────

describe("deepClone", () => {
  it("returns a deep copy not sharing references", () => {
    const original = { a: { b: [1, 2, 3] } };
    const clone = deepClone(original);
    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);
    expect(clone.a).not.toBe(original.a);
    clone.a.b.push(4);
    expect(original.a.b).toHaveLength(3);
  });

  it("clones arrays", () => {
    const arr = [{ id: "a" }, { id: "b" }];
    const clone = deepClone(arr);
    expect(clone).toEqual(arr);
    expect(clone).not.toBe(arr);
    clone[0].id = "z";
    expect(arr[0].id).toBe("a");
  });

  it("clones primitives unchanged", () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone("hello")).toBe("hello");
    expect(deepClone(null)).toBeNull();
  });
});

// ── setIn ─────────────────────────────────────────────────────────────────

describe("setIn", () => {
  it("sets a top-level key", () => {
    const obj = { a: 1, b: 2 };
    expect(setIn(obj, ["c"], 3)).toStrictEqual({ a: 1, b: 2, c: 3 });
  });

  it("sets a nested key", () => {
    const obj = { a: { b: 1 } };
    expect(setIn(obj, ["a", "b"], 99)).toStrictEqual({ a: { b: 99 } });
  });

  it("creates intermediate objects", () => {
    const obj = {};
    expect(setIn(obj, ["x", "y", "z"], "deep")).toStrictEqual({ x: { y: { z: "deep" } } });
  });

  it("does not mutate the original", () => {
    const obj = { a: { b: 1 } };
    setIn(obj, ["a", "b"], 99);
    expect(obj.a.b).toBe(1);
  });

  it("empty path returns the value itself", () => {
    expect(setIn({}, [], "replaced")).toBe("replaced");
  });
});

// ── updateIn ──────────────────────────────────────────────────────────────

describe("updateIn", () => {
  it("applies updater at nested path", () => {
    const obj = { a: { b: 5 } };
    const result = updateIn(obj, ["a", "b"], (v) => /** @type {number} */ (v) + 1);
    expect(result).toStrictEqual({ a: { b: 6 } });
  });

  it("does not mutate original", () => {
    const obj = { count: 0 };
    updateIn(obj, ["count"], (v) => /** @type {number} */ (v) + 1);
    expect(obj.count).toBe(0);
  });

  it("empty path applies updater to root", () => {
    const obj = { x: 1 };
    const result = updateIn(obj, [], () => ({ replaced: true }));
    expect(result).toStrictEqual({ replaced: true });
  });
});

// ── deleteIn ──────────────────────────────────────────────────────────────

describe("deleteIn", () => {
  it("removes a top-level key", () => {
    const obj = { a: 1, b: 2 };
    expect(deleteIn(obj, ["b"])).toStrictEqual({ a: 1 });
  });

  it("removes a nested key", () => {
    const obj = { a: { b: 1, c: 2 } };
    expect(deleteIn(obj, ["a", "b"])).toStrictEqual({ a: { c: 2 } });
  });

  it("returns same object when path does not exist", () => {
    const obj = { a: 1 };
    expect(deleteIn(obj, ["missing"])).toStrictEqual({ a: 1 });
  });

  it("does not mutate original", () => {
    const obj = { a: 1, b: 2 };
    deleteIn(obj, ["a"]);
    expect(obj.a).toBe(1);
  });
});

// ── mergeDeep ─────────────────────────────────────────────────────────────

describe("mergeDeep", () => {
  it("shallow-merges top-level keys", () => {
    expect(mergeDeep({ a: 1 }, { b: 2 })).toStrictEqual({ a: 1, b: 2 });
  });

  it("deep-merges nested objects", () => {
    const target = { a: { x: 1, y: 2 } };
    const source = { a: { y: 99, z: 3 } };
    expect(mergeDeep(target, source)).toStrictEqual({ a: { x: 1, y: 99, z: 3 } });
  });

  it("replaces arrays (does not concat)", () => {
    const target = { arr: [1, 2, 3] };
    const source = { arr: [4, 5] };
    expect(mergeDeep(target, source)).toStrictEqual({ arr: [4, 5] });
  });

  it("does not mutate original", () => {
    const target = { a: { b: 1 } };
    mergeDeep(target, { a: { b: 99 } });
    expect(target.a.b).toBe(1);
  });

  it("handles null source values", () => {
    const target = { a: 1, b: 2 };
    expect(mergeDeep(target, { b: null })).toStrictEqual({ a: 1, b: null });
  });
});
