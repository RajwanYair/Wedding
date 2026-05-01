import { describe, it, expect } from "vitest";
import {
  fnv1a32,
  fnv1a32Hex,
  fnv1a32Bytes,
} from "../../src/utils/fnv1a.js";

describe("fnv1a32", () => {
  it("known vectors", () => {
    // Standard FNV-1a 32-bit reference values.
    expect(fnv1a32("")).toBe(0x811c9dc5);
    expect(fnv1a32("a")).toBe(0xe40c292c);
    expect(fnv1a32("foobar")).toBe(0xbf9cf968);
  });

  it("returns unsigned 32-bit integer", () => {
    const h = fnv1a32("anything");
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });

  it("non-string returns seed", () => {
    expect(fnv1a32(/** @type {any} */ (null))).toBe(0x811c9dc5);
  });

  it("seed alters output", () => {
    expect(fnv1a32("a", 1)).not.toBe(fnv1a32("a"));
  });

  it("differs on small change", () => {
    expect(fnv1a32("hello")).not.toBe(fnv1a32("Hello"));
  });
});

describe("fnv1a32Hex", () => {
  it("8-char zero-padded hex", () => {
    expect(fnv1a32Hex("")).toBe("811c9dc5");
    expect(fnv1a32Hex("a")).toBe("e40c292c");
  });
});

describe("fnv1a32Bytes", () => {
  it("matches string for ASCII", () => {
    const bytes = new TextEncoder().encode("foobar");
    expect(fnv1a32Bytes(bytes)).toBe(fnv1a32("foobar"));
  });

  it("rejects non-Uint8Array", () => {
    expect(() => fnv1a32Bytes(/** @type {any} */ ([1, 2]))).toThrow(TypeError);
  });
});
