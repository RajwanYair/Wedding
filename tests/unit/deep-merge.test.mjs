import { describe, it, expect } from "vitest";
import { deepMerge } from "../../src/utils/deep-merge.js";

describe("deepMerge", () => {
  it("merges flat objects", () => {
    expect(deepMerge({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({
      a: 1,
      b: 3,
      c: 4,
    });
  });

  it("merges nested objects", () => {
    expect(
      deepMerge({ a: { x: 1, y: 2 } }, { a: { y: 3, z: 4 } }),
    ).toEqual({ a: { x: 1, y: 3, z: 4 } });
  });

  it("replaces arrays (does not merge)", () => {
    expect(deepMerge({ a: [1, 2] }, { a: [3] })).toEqual({ a: [3] });
  });

  it("skips undefined source values", () => {
    expect(deepMerge({ a: 1 }, { a: undefined })).toEqual({ a: 1 });
  });

  it("does not mutate inputs", () => {
    const a = { x: { y: 1 } };
    const b = { x: { z: 2 } };
    const r = deepMerge(a, b);
    expect(a).toEqual({ x: { y: 1 } });
    expect(b).toEqual({ x: { z: 2 } });
    r.x.y = 99;
    expect(a.x.y).toBe(1);
  });

  it("variadic sources", () => {
    expect(deepMerge({ a: 1 }, { b: 2 }, { c: 3 })).toEqual({
      a: 1,
      b: 2,
      c: 3,
    });
  });

  it("blocks __proto__ pollution", () => {
    const evil = JSON.parse('{"__proto__":{"polluted":true}}');
    deepMerge({}, evil);
    expect(/** @type {any} */ ({}).polluted).toBeUndefined();
  });

  it("blocks constructor / prototype pollution", () => {
    deepMerge({}, JSON.parse('{"constructor":{"prototype":{"x":1}}}'));
    expect(/** @type {any} */ ({}).x).toBeUndefined();
  });

  it("treats class instances as opaque (replaces)", () => {
    class Foo {
      constructor() {
        this.v = 1;
      }
    }
    const f = new Foo();
    const r = deepMerge({ a: { v: 0 } }, { a: f });
    expect(r.a).toBe(f);
  });

  it("skips non-plain sources", () => {
    expect(deepMerge({ a: 1 }, /** @type {any} */ (null))).toEqual({ a: 1 });
    expect(deepMerge({ a: 1 }, /** @type {any} */ ([1, 2]))).toEqual({ a: 1 });
  });
});
