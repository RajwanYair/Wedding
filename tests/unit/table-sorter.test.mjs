/**
 * tests/unit/table-sorter.test.mjs — Sprint 203
 */

import { describe, it, expect } from "vitest";
import {
  toggleDir,
  nextSortState,
  compareAsc,
  compareDesc,
  sortBy,
  sortByMulti,
  getPath,
  cycleSortState,
} from "../../src/utils/table-sorter.js";

describe("toggleDir", () => {
  it("asc → desc", () => expect(toggleDir("asc")).toBe("desc"));
  it("desc → asc", () => expect(toggleDir("desc")).toBe("asc"));
});

describe("nextSortState", () => {
  it("new key defaults to asc", () => {
    expect(nextSortState(null, "name")).toEqual({ key: "name", dir: "asc" });
  });
  it("same key toggles direction", () => {
    expect(nextSortState({ key: "name", dir: "asc" }, "name")).toEqual({ key: "name", dir: "desc" });
  });
  it("different key resets to defaultDir", () => {
    expect(nextSortState({ key: "name", dir: "desc" }, "age")).toEqual({ key: "age", dir: "asc" });
  });
  it("respects custom defaultDir", () => {
    expect(nextSortState(null, "age", "desc")).toEqual({ key: "age", dir: "desc" });
  });
});

describe("compareAsc", () => {
  it("numbers ascending", () => expect(compareAsc(1, 2)).toBeLessThan(0));
  it("equal numbers → 0", () => expect(compareAsc(5, 5)).toBe(0));
  it("strings locale-aware", () => expect(compareAsc("abc", "abd")).toBeLessThan(0));
  it("null sorts before non-null", () => expect(compareAsc(null, 1)).toBeLessThan(0));
  it("null === null → 0", () => expect(compareAsc(null, null)).toBe(0));
  it("numeric string comparison", () => expect(compareAsc("10", "9")).toBeGreaterThan(0));
});

describe("compareDesc", () => {
  it("numbers descending", () => expect(compareDesc(1, 2)).toBeGreaterThan(0));
  it("equal → 0", () => expect(compareDesc(5, 5)).toBe(0));
});

describe("sortBy", () => {
  const items = [{ n: "Charlie" }, { n: "Alice" }, { n: "Bob" }];
  it("sorts ascending", () => {
    expect(sortBy(items, "n").map((i) => i.n)).toEqual(["Alice", "Bob", "Charlie"]);
  });
  it("sorts descending", () => {
    expect(sortBy(items, "n", "desc").map((i) => i.n)).toEqual(["Charlie", "Bob", "Alice"]);
  });
  it("returns empty array for empty input", () => {
    expect(sortBy([], "n")).toEqual([]);
  });
  it("does not mutate original", () => {
    const orig = [...items];
    sortBy(items, "n");
    expect(items).toEqual(orig);
  });
});

describe("sortByMulti", () => {
  const items = [
    { g: "A", n: "Charlie" },
    { g: "B", n: "Alice" },
    { g: "A", n: "Alice" },
  ];
  it("sorts by group then name", () => {
    const r = sortByMulti(items, [{ key: "g", dir: "asc" }, { key: "n", dir: "asc" }]);
    expect(r[0]).toEqual({ g: "A", n: "Alice" });
    expect(r[1]).toEqual({ g: "A", n: "Charlie" });
  });
  it("returns copy for empty sorts", () => {
    expect(sortByMulti(items, [])).toHaveLength(3);
  });
});

describe("getPath", () => {
  it("gets top-level key", () => expect(getPath({ a: 1 }, "a")).toBe(1));
  it("gets nested path", () => expect(getPath({ a: { b: 2 } }, "a.b")).toBe(2));
  it("returns undefined for missing path", () => expect(getPath({}, "x.y")).toBeUndefined());
  it("null obj → undefined", () => expect(getPath(null, "a")).toBeUndefined());
});

describe("cycleSortState", () => {
  it("null → asc", () => expect(cycleSortState(null, "name")).toEqual({ key: "name", dir: "asc" }));
  it("asc → desc", () => expect(cycleSortState({ key: "name", dir: "asc" }, "name")).toEqual({ key: "name", dir: "desc" }));
  it("desc → null", () => expect(cycleSortState({ key: "name", dir: "desc" }, "name")).toBeNull());
  it("different key → asc", () => expect(cycleSortState({ key: "age", dir: "desc" }, "name")).toEqual({ key: "name", dir: "asc" }));
});
