import { describe, it, expect } from "vitest";
import {
  numberToWordsEn,
  wordsToNumberEn,
} from "../../src/utils/number-words-en.js";

describe("numberToWordsEn", () => {
  it("zero", () => {
    expect(numberToWordsEn(0)).toBe("zero");
  });

  it("under twenty", () => {
    expect(numberToWordsEn(1)).toBe("one");
    expect(numberToWordsEn(15)).toBe("fifteen");
    expect(numberToWordsEn(19)).toBe("nineteen");
  });

  it("tens with hyphen", () => {
    expect(numberToWordsEn(20)).toBe("twenty");
    expect(numberToWordsEn(42)).toBe("forty-two");
    expect(numberToWordsEn(99)).toBe("ninety-nine");
  });

  it("hundreds", () => {
    expect(numberToWordsEn(100)).toBe("one hundred");
    expect(numberToWordsEn(305)).toBe("three hundred five");
    expect(numberToWordsEn(999)).toBe("nine hundred ninety-nine");
  });

  it("thousands", () => {
    expect(numberToWordsEn(1000)).toBe("one thousand");
    expect(numberToWordsEn(2026)).toBe(
      "two thousand twenty-six",
    );
    expect(numberToWordsEn(12_345)).toBe(
      "twelve thousand three hundred forty-five",
    );
  });

  it("millions", () => {
    expect(numberToWordsEn(1_000_000)).toBe("one million");
    expect(numberToWordsEn(2_500_000)).toBe(
      "two million five hundred thousand",
    );
  });

  it("rejects out of range", () => {
    expect(() => numberToWordsEn(-1)).toThrow();
    expect(() => numberToWordsEn(10_000_000)).toThrow();
    expect(() => numberToWordsEn(1.5)).toThrow();
  });
});

describe("wordsToNumberEn", () => {
  it("parses simple", () => {
    expect(wordsToNumberEn("zero")).toBe(0);
    expect(wordsToNumberEn("forty-two")).toBe(42);
    expect(wordsToNumberEn("one hundred")).toBe(100);
  });

  it("ignores 'and' and commas", () => {
    expect(wordsToNumberEn("one hundred and five")).toBe(105);
    expect(wordsToNumberEn("one thousand, two hundred")).toBe(1200);
  });

  it("parses compound", () => {
    expect(wordsToNumberEn("two thousand twenty-six")).toBe(2026);
    expect(
      wordsToNumberEn("twelve thousand three hundred forty-five"),
    ).toBe(12_345);
    expect(wordsToNumberEn("two million five hundred thousand")).toBe(
      2_500_000,
    );
  });

  it("returns null on garbage", () => {
    expect(wordsToNumberEn("nope")).toBe(null);
    expect(wordsToNumberEn("")).toBe(null);
    expect(wordsToNumberEn(null)).toBe(null);
  });

  it("round-trips", () => {
    for (const n of [0, 7, 99, 100, 305, 2026, 12_345, 1_000_000]) {
      expect(wordsToNumberEn(numberToWordsEn(n))).toBe(n);
    }
  });
});
