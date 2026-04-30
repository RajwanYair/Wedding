import { describe, it, expect } from "vitest";
import {
  parseHex,
  relativeLuminance,
  contrastRatio,
  wcagLevel,
  passesAA,
} from "../../src/utils/contrast-check.js";

describe("contrast-check", () => {
  it("parseHex parses 6-digit form", () => {
    expect(parseHex("#aabbcc")).toEqual({ r: 0xaa, g: 0xbb, b: 0xcc });
  });

  it("parseHex parses 3-digit shorthand", () => {
    expect(parseHex("#abc")).toEqual({ r: 0xaa, g: 0xbb, b: 0xcc });
  });

  it("parseHex strips alpha channel from 8-digit", () => {
    expect(parseHex("#aabbccff")).toEqual({ r: 0xaa, g: 0xbb, b: 0xcc });
  });

  it("parseHex accepts unprefixed hex", () => {
    expect(parseHex("ff0000")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("parseHex returns null for invalid input", () => {
    expect(parseHex("not a colour")).toBeNull();
    expect(parseHex("#xyz")).toBeNull();
    expect(parseHex(null)).toBeNull();
    expect(parseHex("#1234")).toEqual({ r: 0x11, g: 0x22, b: 0x33 });
  });

  it("relativeLuminance is 0 for black, 1 for white", () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5);
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
  });

  it("contrastRatio black on white is 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });

  it("contrastRatio is symmetric", () => {
    const a = contrastRatio("#1c1c1c", "#fafafa");
    const b = contrastRatio("#fafafa", "#1c1c1c");
    expect(a).toBeCloseTo(b, 5);
  });

  it("contrastRatio returns NaN for invalid colour", () => {
    expect(Number.isNaN(contrastRatio("nope", "#fff"))).toBe(true);
  });

  it("wcagLevel AAA for very high contrast", () => {
    expect(wcagLevel(21)).toBe("AAA");
  });

  it("wcagLevel AA at the 4.5 boundary", () => {
    expect(wcagLevel(4.5)).toBe("AA");
    expect(wcagLevel(4.4)).toBe("FAIL");
  });

  it("wcagLevel uses large-text thresholds when opts.large", () => {
    expect(wcagLevel(3, { large: true })).toBe("AA");
    expect(wcagLevel(4.5, { large: true })).toBe("AAA");
  });

  it("wcagLevel returns FAIL for non-finite ratio", () => {
    expect(wcagLevel(NaN)).toBe("FAIL");
  });

  it("passesAA true for high contrast", () => {
    expect(passesAA("#000", "#fff")).toBe(true);
  });

  it("passesAA false for low contrast", () => {
    expect(passesAA("#777", "#888")).toBe(false);
  });
});
