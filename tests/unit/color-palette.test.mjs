import { describe, it, expect } from "vitest";
import {
  hexToHsl,
  hslToHex,
  lighten,
  darken,
  palette,
} from "../../src/utils/color-palette.js";

describe("color-palette", () => {
  it("hexToHsl handles pure red", () => {
    const hsl = hexToHsl("#ff0000");
    expect(hsl.h).toBe(0);
    expect(hsl.s).toBe(100);
    expect(hsl.l).toBe(50);
  });

  it("hexToHsl handles pure green", () => {
    const hsl = hexToHsl("#00ff00");
    expect(hsl.h).toBe(120);
  });

  it("hexToHsl handles pure blue", () => {
    const hsl = hexToHsl("#0000ff");
    expect(hsl.h).toBe(240);
  });

  it("hexToHsl handles black and white", () => {
    expect(hexToHsl("#000000")).toEqual({ h: 0, s: 0, l: 0 });
    expect(hexToHsl("#ffffff")).toEqual({ h: 0, s: 0, l: 100 });
  });

  it("hexToHsl supports 3-digit shorthand", () => {
    const hsl = hexToHsl("#f00");
    expect(hsl.s).toBe(100);
  });

  it("hexToHsl rejects invalid input", () => {
    expect(() => hexToHsl("nope")).toThrow();
    expect(() => hexToHsl(/** @type {any} */ (null))).toThrow();
  });

  it("hslToHex round-trips approximately", () => {
    const start = "#3366cc";
    const hsl = hexToHsl(start);
    const back = hslToHex(hsl);
    expect(back.toLowerCase()).toBe(start);
  });

  it("hslToHex clamps out-of-range values", () => {
    expect(hslToHex({ h: 0, s: 200, l: 50 })).toBe("#ff0000");
    expect(hslToHex({ h: 0, s: 100, l: -10 })).toBe("#000000");
  });

  it("lighten increases lightness", () => {
    const start = "#3366cc";
    const out = lighten(start, 20);
    expect(hexToHsl(out).l).toBeGreaterThan(hexToHsl(start).l);
  });

  it("darken decreases lightness", () => {
    const start = "#3366cc";
    const out = darken(start, 20);
    expect(hexToHsl(out).l).toBeLessThan(hexToHsl(start).l);
  });

  it("palette returns 5 stops", () => {
    const stops = palette("#3366cc");
    expect(stops).toHaveLength(5);
    expect(stops.every((c) => /^#[0-9a-f]{6}$/.test(c))).toBe(true);
  });

  it("palette stops are ordered light→dark by lightness", () => {
    const stops = palette("#3366cc");
    const ls = stops.map((c) => hexToHsl(c).l);
    expect(ls[0]).toBeLessThan(ls[4]);
  });
});
