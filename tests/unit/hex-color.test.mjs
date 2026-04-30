import { describe, it, expect } from "vitest";
import {
  parseHex,
  toHex,
  mixHex,
  luminance,
} from "../../src/utils/hex-color.js";

describe("hex-color", () => {
  it("parses #rrggbb", () => {
    expect(parseHex("#ff0000")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it("parses #rgb shorthand", () => {
    expect(parseHex("#f00")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it("parses #rrggbbaa", () => {
    const c = parseHex("#ff000080");
    expect(c?.r).toBe(255);
    expect(c?.a).toBeCloseTo(128 / 255, 5);
  });

  it("parses #rgba shorthand", () => {
    const c = parseHex("#f008");
    expect(c?.r).toBe(255);
    expect(c?.a).toBeCloseTo(0x88 / 255, 5);
  });

  it("returns null for invalid input", () => {
    expect(parseHex("not-a-color")).toBe(null);
    expect(parseHex("#zzz")).toBe(null);
    expect(parseHex(/** @type {any} */ (null))).toBe(null);
  });

  it("toHex formats opaque", () => {
    expect(toHex({ r: 255, g: 0, b: 0 })).toBe("#ff0000");
  });

  it("toHex includes alpha when < 1", () => {
    expect(toHex({ r: 255, g: 0, b: 0, a: 0.5 })).toBe("#ff000080");
  });

  it("toHex clamps out-of-range values", () => {
    expect(toHex({ r: 999, g: -10, b: 0 })).toBe("#ff0000");
  });

  it("mixHex midpoint", () => {
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  it("mixHex clamps t out of range", () => {
    expect(mixHex("#000000", "#ffffff", 2)).toBe("#ffffff");
    expect(mixHex("#000000", "#ffffff", -1)).toBe("#000000");
  });

  it("mixHex returns null when inputs invalid", () => {
    expect(mixHex("nope", "#fff", 0.5)).toBe(null);
  });

  it("luminance white = 1, black = 0", () => {
    expect(luminance("#ffffff")).toBeCloseTo(1, 5);
    expect(luminance("#000000")).toBeCloseTo(0, 5);
  });

  it("luminance returns null for invalid input", () => {
    expect(luminance("nope")).toBe(null);
  });
});
