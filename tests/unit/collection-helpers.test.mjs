/**
 * tests/unit/collection-helpers.test.mjs — Sprint 182
 */

import { describe, it, expect } from "vitest";
import {
  groupBy, partition, chunk, flatten, unique, uniqueBy,
  intersection, difference, indexBy, moveElement,
} from "../../src/utils/collection-helpers.js";

describe("groupBy", () => {
  const data = [
    { status: "confirmed", name: "A" },
    { status: "pending", name: "B" },
    { status: "confirmed", name: "C" },
  ];

  it("groups by string key", () => {
    const r = groupBy(data, "status");
    expect(r.confirmed).toHaveLength(2);
    expect(r.pending).toHaveLength(1);
  });

  it("groups by function", () => {
    const r = groupBy(data, (item) => item.name[0]);
    expect(r.A).toHaveLength(1);
  });

  it("returns empty object for empty array", () => {
    expect(groupBy([], "status")).toEqual({});
  });
});

describe("partition", () => {
  const nums = [1, 2, 3, 4, 5];

  it("splits by predicate", () => {
    const [evens, odds] = partition(nums, (n) => n % 2 === 0);
    expect(evens).toEqual([2, 4]);
    expect(odds).toEqual([1, 3, 5]);
  });

  it("all-match returns empty second partition", () => {
    const [yes, no] = partition([1, 2], () => true);
    expect(yes).toHaveLength(2);
    expect(no).toHaveLength(0);
  });
});

describe("chunk", () => {
  it("splits into chunks of given size", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns single chunk when size >= length", () => {
    expect(chunk([1, 2, 3], 10)).toEqual([[1, 2, 3]]);
  });

  it("throws for size < 1", () => {
    expect(() => chunk([1], 0)).toThrow();
  });

  it("returns empty for empty array", () => {
    expect(chunk([], 3)).toEqual([]);
  });
});

describe("flatten", () => {
  it("flattens one level", () => {
    expect(flatten([[1, 2], [3, 4]])).toEqual([1, 2, 3, 4]);
  });

  it("handles mixed arrays", () => {
    expect(flatten([1, [2, 3], 4])).toEqual([1, 2, 3, 4]);
  });
});

describe("unique", () => {
  it("removes duplicates", () => {
    expect(unique([1, 2, 2, 3, 3])).toEqual([1, 2, 3]);
  });

  it("preserves order of first occurrence", () => {
    expect(unique(["b", "a", "b"])).toEqual(["b", "a"]);
  });
});

describe("uniqueBy", () => {
  const data = [{ id: 1, v: "a" }, { id: 2, v: "b" }, { id: 1, v: "c" }];

  it("keeps first occurrence of duplicate key", () => {
    const result = uniqueBy(data, "id");
    expect(result).toHaveLength(2);
    expect(result[0].v).toBe("a");
  });
});

describe("intersection", () => {
  it("returns common elements", () => {
    expect(intersection([1, 2, 3], [2, 3, 4])).toEqual([2, 3]);
  });

  it("returns empty for no overlap", () => {
    expect(intersection([1, 2], [3, 4])).toEqual([]);
  });
});

describe("difference", () => {
  it("returns elements in a not in b", () => {
    expect(difference([1, 2, 3], [2, 3])).toEqual([1]);
  });

  it("returns full a when b is empty", () => {
    expect(difference([1, 2, 3], [])).toEqual([1, 2, 3]);
  });
});

describe("indexBy", () => {
  it("creates a Map keyed by field", () => {
    const data = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
    const map = indexBy(data, "id");
    expect(map.get(1)).toEqual({ id: 1, name: "Alice" });
    expect(map.size).toBe(2);
  });
});

describe("moveElement", () => {
  it("moves element forward", () => {
    expect(moveElement([1, 2, 3, 4], 0, 2)).toEqual([2, 3, 1, 4]);
  });

  it("moves element backward", () => {
    expect(moveElement([1, 2, 3, 4], 3, 1)).toEqual([1, 4, 2, 3]);
  });

  it("does not mutate original", () => {
    const arr = [1, 2, 3];
    moveElement(arr, 0, 2);
    expect(arr).toEqual([1, 2, 3]);
  });
});
