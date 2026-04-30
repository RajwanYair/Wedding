import { describe, it, expect } from "vitest";
import { deepEqual } from "../../src/utils/deep-equal.js";

describe("deep-equal", () => {
  it("primitives compare by value", () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual("a", "a")).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(1, 2)).toBe(false);
  });

  it("treats NaN as equal to NaN", () => {
    expect(deepEqual(Number.NaN, Number.NaN)).toBe(true);
  });

  it("distinguishes +0 and -0", () => {
    expect(deepEqual(0, -0)).toBe(false);
  });

  it("null and undefined are distinct", () => {
    expect(deepEqual(null, undefined)).toBe(false);
    expect(deepEqual(null, null)).toBe(true);
  });

  it("arrays compare element-wise", () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it("objects compare key-wise regardless of order", () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it("nested structures compare recursively", () => {
    const a = { x: [1, { y: [2, 3] }] };
    const b = { x: [1, { y: [2, 3] }] };
    expect(deepEqual(a, b)).toBe(true);
  });

  it("Date instances compare by time", () => {
    const d = new Date("2026-01-01");
    expect(deepEqual(d, new Date("2026-01-01"))).toBe(true);
    expect(deepEqual(d, new Date("2026-01-02"))).toBe(false);
  });

  it("RegExp compares by source + flags", () => {
    expect(deepEqual(/abc/gi, /abc/gi)).toBe(true);
    expect(deepEqual(/abc/g, /abc/i)).toBe(false);
  });

  it("Map compares keys and values", () => {
    const a = new Map([["x", 1]]);
    expect(deepEqual(a, new Map([["x", 1]]))).toBe(true);
    expect(deepEqual(a, new Map([["x", 2]]))).toBe(false);
  });

  it("Set compares membership", () => {
    expect(deepEqual(new Set([1, 2, 3]), new Set([3, 2, 1]))).toBe(true);
    expect(deepEqual(new Set([1, 2]), new Set([1, 3]))).toBe(false);
  });

  it("typed arrays compare element-wise", () => {
    expect(deepEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(
      true,
    );
    expect(deepEqual(new Uint8Array([1, 2]), new Uint8Array([1, 3]))).toBe(false);
  });

  it("different prototypes are not equal", () => {
    expect(deepEqual([], {})).toBe(false);
  });

  it("handles cyclic structures", () => {
    /** @type {any} */
    const a = { x: 1 };
    /** @type {any} */
    const b = { x: 1 };
    a.self = a;
    b.self = b;
    expect(deepEqual(a, b)).toBe(true);
  });

  it("missing key on one side returns false", () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
  });
});
