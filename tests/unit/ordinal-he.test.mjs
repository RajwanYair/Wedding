import { describe, it, expect } from "vitest";
import { ordinalHe, ordinalEn } from "../../src/utils/ordinal-he.js";

describe("ordinal-he", () => {
  it("masculine 1..10", () => {
    expect(ordinalHe(1)).toBe("ראשון");
    expect(ordinalHe(2)).toBe("שני");
    expect(ordinalHe(3)).toBe("שלישי");
    expect(ordinalHe(10)).toBe("עשירי");
  });

  it("feminine 1..10", () => {
    expect(ordinalHe(1, { gender: "f" })).toBe("ראשונה");
    expect(ordinalHe(2, { gender: "f" })).toBe("שנייה");
    expect(ordinalHe(10, { gender: "f" })).toBe("עשירית");
  });

  it("> 10 falls back to ה-N", () => {
    expect(ordinalHe(11)).toBe("ה-11");
    expect(ordinalHe(25, { gender: "f" })).toBe("ה-25");
  });

  it("non-positive or non-integer → empty", () => {
    expect(ordinalHe(0)).toBe("");
    expect(ordinalHe(-1)).toBe("");
    expect(ordinalHe(1.5)).toBe("");
  });

  it("English: 1st 2nd 3rd 4th", () => {
    expect(ordinalEn(1)).toBe("1st");
    expect(ordinalEn(2)).toBe("2nd");
    expect(ordinalEn(3)).toBe("3rd");
    expect(ordinalEn(4)).toBe("4th");
  });

  it("English: teens are all -th", () => {
    expect(ordinalEn(11)).toBe("11th");
    expect(ordinalEn(12)).toBe("12th");
    expect(ordinalEn(13)).toBe("13th");
  });

  it("English: 21st, 22nd, 23rd", () => {
    expect(ordinalEn(21)).toBe("21st");
    expect(ordinalEn(22)).toBe("22nd");
    expect(ordinalEn(23)).toBe("23rd");
  });

  it("English: large numbers", () => {
    expect(ordinalEn(101)).toBe("101st");
    expect(ordinalEn(111)).toBe("111th");
  });

  it("English: negative numbers retain sign", () => {
    expect(ordinalEn(-1)).toBe("-1st");
  });

  it("English: non-integer → empty", () => {
    expect(ordinalEn(1.5)).toBe("");
  });
});
