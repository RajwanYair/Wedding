import { describe, it, expect } from "vitest";
import { sortBy } from "../../src/utils/sort-stable.js";

describe("sort-stable", () => {
  it("sorts ascending by single key", () => {
    const out = sortBy([{ a: 3 }, { a: 1 }, { a: 2 }], [{ key: "a" }]);
    expect(out.map((x) => x.a)).toEqual([1, 2, 3]);
  });

  it("sorts descending", () => {
    const out = sortBy(
      [{ a: 1 }, { a: 3 }, { a: 2 }],
      [{ key: "a", dir: "desc" }],
    );
    expect(out.map((x) => x.a)).toEqual([3, 2, 1]);
  });

  it("is stable for equal keys", () => {
    const out = sortBy(
      [
        { a: 1, n: "first" },
        { a: 1, n: "second" },
        { a: 1, n: "third" },
      ],
      [{ key: "a" }],
    );
    expect(out.map((x) => x.n)).toEqual(["first", "second", "third"]);
  });

  it("supports multi-key tie-breaking", () => {
    const out = sortBy(
      [
        { a: 1, b: 2 },
        { a: 1, b: 1 },
        { a: 0, b: 9 },
      ],
      [{ key: "a" }, { key: "b" }],
    );
    expect(out).toEqual([
      { a: 0, b: 9 },
      { a: 1, b: 1 },
      { a: 1, b: 2 },
    ]);
  });

  it("supports selector function", () => {
    const out = sortBy(
      [{ name: "bob" }, { name: "alice" }],
      [{ key: (r) => r.name }],
    );
    expect(out[0].name).toBe("alice");
  });

  it("locale compare is case-insensitive", () => {
    const out = sortBy(
      [{ s: "banana" }, { s: "Apple" }, { s: "cherry" }],
      [{ key: "s", compare: "locale" }],
    );
    expect(out.map((x) => x.s)).toEqual(["Apple", "banana", "cherry"]);
  });

  it("natural compare orders numbers in strings", () => {
    const out = sortBy(
      [{ s: "file10" }, { s: "file2" }, { s: "file1" }],
      [{ key: "s", compare: "natural" }],
    );
    expect(out.map((x) => x.s)).toEqual(["file1", "file2", "file10"]);
  });

  it("undefined values sort last", () => {
    const out = sortBy(
      [{ a: 1 }, { a: undefined }, { a: 2 }],
      [{ key: "a" }],
    );
    expect(out[2].a).toBeUndefined();
  });

  it("empty input returns empty", () => {
    expect(sortBy([], [{ key: "a" }])).toEqual([]);
  });

  it("no keys returns shallow copy", () => {
    const input = [{ a: 1 }, { a: 0 }];
    const out = sortBy(input, []);
    expect(out).toEqual(input);
    expect(out).not.toBe(input);
  });

  it("non-array input returns empty", () => {
    expect(sortBy(/** @type {any} */ (null), [{ key: "a" }])).toEqual([]);
  });

  it("does not mutate input", () => {
    const input = [{ a: 3 }, { a: 1 }, { a: 2 }];
    sortBy(input, [{ key: "a" }]);
    expect(input.map((x) => x.a)).toEqual([3, 1, 2]);
  });
});
