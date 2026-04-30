import { describe, it, expect } from "vitest";
import { deepClone } from "../../src/utils/deep-clone.js";

describe("deep-clone", () => {
  it("returns primitives unchanged", () => {
    expect(deepClone(1)).toBe(1);
    expect(deepClone("a")).toBe("a");
    expect(deepClone(null)).toBe(null);
    expect(deepClone(undefined)).toBe(undefined);
  });

  it("clones plain objects deeply", () => {
    const a = { x: { y: 1 } };
    const b = deepClone(a);
    expect(b).toEqual(a);
    expect(b).not.toBe(a);
    expect(b.x).not.toBe(a.x);
  });

  it("clones arrays deeply", () => {
    const a = [1, [2, [3]]];
    const b = deepClone(a);
    expect(b).toEqual(a);
    expect(b[1]).not.toBe(a[1]);
  });

  it("clones Date and preserves time", () => {
    const a = new Date("2026-01-01T12:00:00Z");
    const b = deepClone(a);
    expect(b).toBeInstanceOf(Date);
    expect(b.getTime()).toBe(a.getTime());
    expect(b).not.toBe(a);
  });

  it("clones RegExp with flags and lastIndex", () => {
    const a = /abc/gi;
    a.lastIndex = 2;
    const b = deepClone(a);
    expect(b.source).toBe("abc");
    expect(b.flags).toBe("gi");
    expect(b.lastIndex).toBe(2);
  });

  it("clones Map keys and values", () => {
    const inner = { v: 1 };
    const a = new Map([["k", inner]]);
    const b = deepClone(a);
    expect(b.get("k")).toEqual(inner);
    expect(b.get("k")).not.toBe(inner);
  });

  it("clones Set", () => {
    const a = new Set([1, 2, 3]);
    const b = deepClone(a);
    expect([...b].sort()).toEqual([1, 2, 3]);
    expect(b).not.toBe(a);
  });

  it("clones Uint8Array", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = deepClone(a);
    expect(b).toBeInstanceOf(Uint8Array);
    expect(Array.from(b)).toEqual([1, 2, 3]);
    expect(b).not.toBe(a);
  });

  it("preserves shared references", () => {
    const inner = { x: 1 };
    const a = { p: inner, q: inner };
    const b = deepClone(a);
    expect(b.p).toBe(b.q);
  });

  it("handles cyclic structures", () => {
    /** @type {any} */
    const a = { name: "root" };
    a.self = a;
    const b = deepClone(a);
    expect(b.self).toBe(b);
    expect(b).not.toBe(a);
  });

  it("does not mutate source on changes to clone", () => {
    const a = { x: { y: 1 } };
    const b = deepClone(a);
    b.x.y = 99;
    expect(a.x.y).toBe(1);
  });

  it("preserves object prototype", () => {
    class Foo {
      constructor() {
        this.x = 1;
      }
    }
    const a = new Foo();
    const b = deepClone(a);
    expect(b).toBeInstanceOf(Foo);
  });
});
