import { describe, it, expect } from "vitest";
import {
  toHebrewNumeral,
  fromHebrewNumeral,
} from "../../src/utils/he-numerals.js";

describe("toHebrewNumeral", () => {
  it("single-letter values get geresh", () => {
    expect(toHebrewNumeral(1)).toBe("א\u05F3");
    expect(toHebrewNumeral(10)).toBe("י\u05F3");
    expect(toHebrewNumeral(100)).toBe("ק\u05F3");
  });

  it("multi-letter values get gershayim before last letter", () => {
    expect(toHebrewNumeral(11)).toBe("י\u05F4א");
    expect(toHebrewNumeral(21)).toBe("כ\u05F4א");
    expect(toHebrewNumeral(248)).toBe("רמ\u05F4ח");
  });

  it("special 15 and 16", () => {
    expect(toHebrewNumeral(15)).toBe("ט\u05F4ו");
    expect(toHebrewNumeral(16)).toBe("ט\u05F4ז");
  });

  it("hundreds compose correctly", () => {
    expect(toHebrewNumeral(500)).toBe("ת\u05F4ק");
    expect(toHebrewNumeral(900)).toBe("תת\u05F4ק");
  });

  it("thousands prefix", () => {
    expect(toHebrewNumeral(5786)).toMatch(/^ה\u05F3/);
  });

  it("punctuation:false omits geresh", () => {
    expect(toHebrewNumeral(15, { punctuation: false })).toBe("טו");
    expect(toHebrewNumeral(11, { punctuation: false })).toBe("יא");
  });

  it("rejects out-of-range", () => {
    expect(() => toHebrewNumeral(0)).toThrow();
    expect(() => toHebrewNumeral(10_000)).toThrow();
    expect(() => toHebrewNumeral(1.5)).toThrow();
  });
});

describe("fromHebrewNumeral", () => {
  it("parses with punctuation", () => {
    expect(fromHebrewNumeral("י\u05F4א")).toBe(11);
    expect(fromHebrewNumeral("ט\u05F4ו")).toBe(15);
    expect(fromHebrewNumeral("רמ\u05F4ח")).toBe(248);
  });

  it("parses without punctuation", () => {
    expect(fromHebrewNumeral("יא")).toBe(11);
    expect(fromHebrewNumeral("טז")).toBe(16);
  });

  it("treats final letters same as base", () => {
    expect(fromHebrewNumeral("ך")).toBe(20);
    expect(fromHebrewNumeral("ם")).toBe(40);
  });

  it("returns null on bad input", () => {
    expect(fromHebrewNumeral("xyz")).toBe(null);
    expect(fromHebrewNumeral("")).toBe(null);
    expect(fromHebrewNumeral(null)).toBe(null);
  });

  it("round-trips a sample", () => {
    for (const n of [1, 5, 11, 15, 16, 99, 100, 248, 500, 999]) {
      expect(fromHebrewNumeral(toHebrewNumeral(n))).toBe(n);
    }
  });
});
