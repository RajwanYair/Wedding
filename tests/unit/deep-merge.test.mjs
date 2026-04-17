/**
 * tests/unit/deep-merge.test.mjs — Sprint 163
 */

import { describe, it, expect } from "vitest";
import { deepMerge, deepMergeAll, mergeArraysById, pick, omit } from "../../src/utils/deep-merge.js";

describe("deepMerge — basic", () => {
  it("merges flat objects", () => {
    const result = deepMerge({ a: 1, b: 2 }, { b: 3, c: 4 });
    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it("does not mutate target", () => {
    const target = { a: 1 };
    deepMerge(target, { b: 2 });
    expect(target).toEqual({ a: 1 });
  });

  it("does not mutate source", () => {
    const source = { b: 2 };
    deepMerge({ a: 1 }, source);
    expect(source).toEqual({ b: 2 });
  });

  it("skips undefined source values", () => {
    const result = deepMerge({ a: 1, b: 2 }, { b: undefined });
    expect(result.b).toBe(2);
  });

  it("null source value clears key", () => {
    const result = deepMerge({ a: 1, b: 2 }, { b: null });
    expect(result.b).toBeNull();
  });
});

describe("deepMerge — nested objects", () => {
  it("recursively merges nested plain objects", () => {
    const result = deepMerge(
      { user: { name: "Alice", role: "admin" } },
      { user: { role: "guest" } },
    );
    expect(result).toEqual({ user: { name: "Alice", role: "guest" } });
  });

  it("replaces arrays (not deep-merges)", () => {
    const result = deepMerge({ tags: [1, 2] }, { tags: [3] });
    expect(result.tags).toEqual([3]);
  });

  it("replaces Date values", () => {
    const d = new Date("2025-01-01");
    const result = deepMerge({ created: new Date("2020-01-01") }, { created: d });
    expect(result.created).toBe(d);
  });

  it("handles empty source object", () => {
    expect(deepMerge({ a: 1 }, {})).toEqual({ a: 1 });
  });

  it("handles empty target object", () => {
    expect(deepMerge({}, { a: 1 })).toEqual({ a: 1 });
  });
});

describe("deepMergeAll", () => {
  it("merges multiple sources left to right", () => {
    const result = deepMergeAll({ a: 1 }, { b: 2 }, { c: 3, a: 10 });
    expect(result).toEqual({ a: 10, b: 2, c: 3 });
  });

  it("handles single source", () => {
    expect(deepMergeAll({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it("handles no sources", () => {
    expect(deepMergeAll({ a: 1 })).toEqual({ a: 1 });
  });
});

describe("mergeArraysById", () => {
  it("merges matching items by id", () => {
    const base = [
      { id: "1", name: "Alice", status: "pending" },
      { id: "2", name: "Bob", status: "pending" },
    ];
    const updates = [{ id: "1", status: "confirmed" }];
    const result = mergeArraysById(base, updates);
    expect(result.find((g) => g.id === "1")?.status).toBe("confirmed");
    expect(result.find((g) => g.id === "2")?.status).toBe("pending");
  });

  it("appends new items not in base", () => {
    const base = [{ id: "1", name: "Alice" }];
    const updates = [{ id: "2", name: "Bob" }];
    const result = mergeArraysById(base, updates);
    expect(result).toHaveLength(2);
  });

  it("keeps unchanged items from base", () => {
    const base = [{ id: "1" }, { id: "2" }];
    const result = mergeArraysById(base, []);
    expect(result).toHaveLength(2);
  });

  it("supports custom key property", () => {
    const base = [{ code: "A", value: 1 }];
    const updates = [{ code: "A", value: 2 }];
    const result = mergeArraysById(base, updates, "code");
    expect(result[0].value).toBe(2);
  });
});

describe("pick", () => {
  it("returns only specified keys", () => {
    expect(pick({ a: 1, b: 2, c: 3 }, ["a", "c"])).toEqual({ a: 1, c: 3 });
  });

  it("ignores keys not in object", () => {
    expect(pick({ a: 1 }, ["a", "z"])).toEqual({ a: 1 });
  });

  it("returns empty for no keys", () => {
    expect(pick({ a: 1 }, [])).toEqual({});
  });
});

describe("omit", () => {
  it("removes specified keys", () => {
    expect(omit({ a: 1, b: 2, c: 3 }, ["b"])).toEqual({ a: 1, c: 3 });
  });

  it("ignores keys not in object", () => {
    expect(omit({ a: 1 }, ["z"])).toEqual({ a: 1 });
  });

  it("returns all when keys empty", () => {
    expect(omit({ a: 1, b: 2 }, [])).toEqual({ a: 1, b: 2 });
  });
});
