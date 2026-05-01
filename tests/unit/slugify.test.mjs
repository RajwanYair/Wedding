import { describe, it, expect } from "vitest";
import { slugify } from "../../src/utils/slugify.js";

describe("slugify", () => {
  it("lower-cases and replaces spaces", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("strips diacritics", () => {
    expect(slugify("Café Olé")).toBe("cafe-ole");
  });

  it("preserves Hebrew by default", () => {
    expect(slugify("חתונה של יאיר")).toBe("חתונה-של-יאיר");
  });

  it("latinize drops non-Latin", () => {
    expect(slugify("Yair חתונה 2026", { latinize: true })).toBe("yair-2026");
  });

  it("collapses repeated separators", () => {
    expect(slugify("a   b__c--d")).toBe("a-b__c-d");
  });

  it("custom separator", () => {
    expect(slugify("hello world", { separator: "_" })).toBe("hello_world");
  });

  it("trims leading and trailing separators", () => {
    expect(slugify("---hello world---")).toBe("hello-world");
  });

  it("maxLength truncates and trims trailing sep", () => {
    expect(slugify("hello world", { maxLength: 5 })).toBe("hello");
    expect(slugify("hello world there", { maxLength: 6 })).toBe("hello");
  });

  it("preserves digits and underscores", () => {
    expect(slugify("Year_2026!")).toBe("year_2026");
  });

  it("empty / non-string input → empty", () => {
    expect(slugify("")).toBe("");
    expect(slugify(/** @type {any} */ (null))).toBe("");
  });

  it("preserves case when lower:false", () => {
    expect(slugify("Hello World", { lower: false })).toBe("Hello-World");
  });

  it("only punctuation → empty", () => {
    expect(slugify("!!! ***")).toBe("");
  });
});
