import { describe, it, expect } from "vitest";
import {
  stripBom,
  stripBomBytes,
  hasBom,
} from "../../src/utils/bom-strip.js";

describe("stripBom", () => {
  it("strips UTF-8 BOM", () => {
    expect(stripBom("\uFEFFhello")).toBe("hello");
  });

  it("returns input unchanged when no BOM", () => {
    expect(stripBom("hello")).toBe("hello");
  });

  it("non-string → empty", () => {
    expect(stripBom(/** @type {any} */ (null))).toBe("");
    expect(stripBom(123)).toBe("");
  });

  it("only strips at start", () => {
    expect(stripBom("a\uFEFFb")).toBe("a\uFEFFb");
  });

  it("empty input → empty", () => {
    expect(stripBom("")).toBe("");
  });
});

describe("hasBom", () => {
  it("true when leading BOM", () => {
    expect(hasBom("\uFEFFx")).toBe(true);
  });

  it("false when none", () => {
    expect(hasBom("x")).toBe(false);
    expect(hasBom("")).toBe(false);
    expect(hasBom(null)).toBe(false);
  });
});

describe("stripBomBytes", () => {
  it("strips UTF-8 BOM", () => {
    const b = new Uint8Array([0xef, 0xbb, 0xbf, 0x61, 0x62]);
    const out = stripBomBytes(b);
    expect(Array.from(out)).toEqual([0x61, 0x62]);
  });

  it("strips UTF-16 LE BOM", () => {
    const b = new Uint8Array([0xff, 0xfe, 0x61, 0x00]);
    expect(Array.from(stripBomBytes(b))).toEqual([0x61, 0x00]);
  });

  it("strips UTF-16 BE BOM", () => {
    const b = new Uint8Array([0xfe, 0xff, 0x00, 0x61]);
    expect(Array.from(stripBomBytes(b))).toEqual([0x00, 0x61]);
  });

  it("returns same view when no BOM", () => {
    const b = new Uint8Array([0x61, 0x62]);
    expect(stripBomBytes(b)).toBe(b);
  });

  it("rejects non-Uint8Array", () => {
    expect(() => stripBomBytes(/** @type {any} */ ([1, 2]))).toThrow(TypeError);
  });
});
