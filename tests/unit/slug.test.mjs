import { describe, it, expect } from "vitest";
import { slugify, transliterateHebrew } from "../../src/utils/slug.js";

describe("slug", () => {
  it("slugify lowercases ASCII", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("slugify collapses runs of non-alnum", () => {
    expect(slugify("foo  bar___baz")).toBe("foo-bar-baz");
  });

  it("slugify trims leading/trailing dashes", () => {
    expect(slugify("--Hello--")).toBe("hello");
  });

  it("slugify strips Latin diacritics", () => {
    expect(slugify("Café Müller")).toBe("cafe-muller");
  });

  it("slugify transliterates Hebrew", () => {
    expect(slugify("שלום עולם")).toBe("shlvm-avlm");
  });

  it("slugify handles mixed Hebrew + Latin", () => {
    expect(slugify("Wedding חתונה 2026")).toBe("wedding-chtvnh-2026");
  });

  it("slugify handles empty/null/undefined", () => {
    expect(slugify("")).toBe("");
    expect(slugify(null)).toBe("");
    expect(slugify(undefined)).toBe("");
  });

  it("slugify accepts custom separator", () => {
    expect(slugify("Hello World", { separator: "_" })).toBe("hello_world");
  });

  it("slugify handles numbers", () => {
    expect(slugify("Year 2026!")).toBe("year-2026");
  });

  it("slugify keeps existing alphanumeric runs", () => {
    expect(slugify("abc123")).toBe("abc123");
  });

  it("transliterateHebrew handles final letters", () => {
    expect(transliterateHebrew("ך ם ן ף ץ")).toBe("k m n p ts");
  });

  it("transliterateHebrew leaves Latin unchanged", () => {
    expect(transliterateHebrew("hello")).toBe("hello");
  });
});
