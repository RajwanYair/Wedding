/**
 * tests/unit/color-helpers.test.mjs — Sprint 197
 */

import { describe, it, expect } from "vitest";
import {
  hexToRgb,
  rgbToHex,
  lighten,
  darken,
  getContrastColor,
  blendColors,
} from "../../src/utils/color-helpers.js";

describe("hexToRgb", () => {
  it("parses 6-char hex", () => {
    expect(hexToRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
  });
  it("parses 6-char hex without hash", () => {
    expect(hexToRgb("00ff00")).toEqual({ r: 0, g: 255, b: 0 });
  });
  it("parses 3-char hex", () => {
    expect(hexToRgb("#abc")).toEqual({ r: 170, g: 187, b: 204 });
  });
  it("returns null for invalid input", () => {
    expect(hexToRgb("zzz")).toBeNull();
  });
  it("returns null for non-string", () => {
    expect(hexToRgb(null)).toBeNull();
  });
  it("returns null for wrong-length hex", () => {
    expect(hexToRgb("#12")).toBeNull();
  });
});

describe("rgbToHex", () => {
  it("converts red", () => {
    expect(rgbToHex(255, 0, 0)).toBe("#ff0000");
  });
  it("converts black", () => {
    expect(rgbToHex(0, 0, 0)).toBe("#000000");
  });
  it("converts white", () => {
    expect(rgbToHex(255, 255, 255)).toBe("#ffffff");
  });
  it("clamps values above 255", () => {
    expect(rgbToHex(300, 0, 0)).toBe("#ff0000");
  });
  it("clamps values below 0", () => {
    expect(rgbToHex(-1, 0, 0)).toBe("#000000");
  });
  it("rounds fractional values", () => {
    expect(rgbToHex(0.6, 0, 0)).toBe("#010000");
  });
});

describe("lighten", () => {
  it("factor 0 returns same color", () => {
    expect(lighten("#ff0000", 0)).toBe("#ff0000");
  });
  it("factor 1 returns white", () => {
    expect(lighten("#ff0000", 1)).toBe("#ffffff");
  });
  it("lightens by 0.5", () => {
    const result = hexToRgb(lighten("#000000", 0.5));
    expect(result?.r).toBe(128);
  });
  it("returns hex unchanged for invalid input", () => {
    expect(lighten("invalid", 0.5)).toBe("invalid");
  });
});

describe("darken", () => {
  it("factor 0 returns same color", () => {
    expect(darken("#ff0000", 0)).toBe("#ff0000");
  });
  it("factor 1 returns black", () => {
    expect(darken("#ff0000", 1)).toBe("#000000");
  });
  it("darkens by 0.5", () => {
    const result = hexToRgb(darken("#ffffff", 0.5));
    expect(result?.r).toBeCloseTo(128, 0);
  });
  it("returns hex unchanged for invalid input", () => {
    expect(darken("invalid", 0.5)).toBe("invalid");
  });
});

describe("getContrastColor", () => {
  it("dark background returns white", () => {
    expect(getContrastColor("#000000")).toBe("#ffffff");
  });
  it("light background returns black", () => {
    expect(getContrastColor("#ffffff")).toBe("#000000");
  });
  it("mid-gray: adjusts for luminance", () => {
    const result = getContrastColor("#888888");
    expect(["#000000", "#ffffff"]).toContain(result);
  });
  it("returns #000000 for invalid input", () => {
    expect(getContrastColor("notacolor")).toBe("#000000");
  });
});

describe("blendColors", () => {
  it("weight 0 returns first color", () => {
    expect(blendColors("#ff0000", "#0000ff", 0)).toBe("#ff0000");
  });
  it("weight 1 returns second color", () => {
    expect(blendColors("#ff0000", "#0000ff", 1)).toBe("#0000ff");
  });
  it("weight 0.5 blends equally", () => {
    const result = hexToRgb(blendColors("#000000", "#ffffff", 0.5));
    expect(result?.r).toBeCloseTo(128, 0);
  });
  it("returns first hex for invalid first arg", () => {
    expect(blendColors("invalid!", "#ffffff", 0.5)).toBe("invalid!");
  });
});
