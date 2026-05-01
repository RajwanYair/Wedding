import { describe, it, expect } from "vitest";
import {
  parseHex,
  toHex,
  rgbToHsl,
  hslToRgb,
  luminance,
  contrastRatio,
  adjustLightness,
} from "../../src/utils/color.js";

describe("parseHex", () => {
  it("parses 6-digit hex", () => {
    expect(parseHex("#ff8800")).toEqual({ r: 255, g: 136, b: 0, a: 1 });
  });

  it("parses 3-digit short form", () => {
    expect(parseHex("#abc")).toEqual({ r: 170, g: 187, b: 204, a: 1 });
  });

  it("parses 8-digit with alpha", () => {
    const c = parseHex("#ff000080");
    expect(c?.r).toBe(255);
    expect(c?.a).toBeCloseTo(128 / 255);
  });

  it("returns null on invalid", () => {
    expect(parseHex("nope")).toBe(null);
    expect(parseHex("#xyz")).toBe(null);
    expect(parseHex(123)).toBe(null);
  });
});

describe("toHex", () => {
  it("formats RGB", () => {
    expect(toHex(255, 136, 0)).toBe("#ff8800");
  });

  it("clamps and rounds", () => {
    expect(toHex(-5, 300, 127.6)).toBe("#00ff80");
  });

  it("appends alpha when < 1", () => {
    expect(toHex(255, 0, 0, 0.5)).toBe("#ff000080");
  });
});

describe("rgbToHsl / hslToRgb", () => {
  it("round-trips primary colors", () => {
    for (const c of [
      { r: 255, g: 0, b: 0 },
      { r: 0, g: 255, b: 0 },
      { r: 0, g: 0, b: 255 },
      { r: 128, g: 128, b: 128 },
    ]) {
      const hsl = rgbToHsl(c.r, c.g, c.b);
      const back = hslToRgb(hsl.h, hsl.s, hsl.l);
      expect(back.r).toBe(c.r);
      expect(back.g).toBe(c.g);
      expect(back.b).toBe(c.b);
    }
  });

  it("greyscale has zero saturation", () => {
    expect(rgbToHsl(120, 120, 120).s).toBe(0);
  });
});

describe("luminance + contrastRatio", () => {
  it("white vs black is 21:1", () => {
    expect(
      contrastRatio({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 }),
    ).toBeCloseTo(21);
  });

  it("same color is 1:1", () => {
    expect(
      contrastRatio({ r: 100, g: 100, b: 100 }, { r: 100, g: 100, b: 100 }),
    ).toBe(1);
  });

  it("luminance white = 1, black = 0", () => {
    expect(luminance(255, 255, 255)).toBeCloseTo(1);
    expect(luminance(0, 0, 0)).toBe(0);
  });
});

describe("adjustLightness", () => {
  it("brighter produces lighter color", () => {
    const out = adjustLightness({ r: 100, g: 100, b: 100 }, 0.2);
    expect(out.r).toBeGreaterThan(100);
  });

  it("clamps to 0..1", () => {
    const black = adjustLightness({ r: 100, g: 100, b: 100 }, -1);
    expect(black).toEqual({ r: 0, g: 0, b: 0 });
    const white = adjustLightness({ r: 100, g: 100, b: 100 }, 1);
    expect(white).toEqual({ r: 255, g: 255, b: 255 });
  });
});
