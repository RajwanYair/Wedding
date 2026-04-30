import { describe, it, expect } from "vitest";
import { parseCsv } from "../../src/utils/csv-parser.js";

describe("csv-parser", () => {
  it("parses simple rows", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles trailing newline", () => {
    expect(parseCsv("a,b\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("handles quoted fields with commas", () => {
    expect(parseCsv('a,"b,c",d')).toEqual([["a", "b,c", "d"]]);
  });

  it("handles doubled quotes inside quoted field", () => {
    expect(parseCsv('"he said ""hi"""')).toEqual([['he said "hi"']]);
  });

  it("handles embedded newline in quoted field", () => {
    expect(parseCsv('a,"line1\nline2",c')).toEqual([
      ["a", "line1\nline2", "c"],
    ]);
  });

  it("supports custom delimiter", () => {
    expect(parseCsv("a;b;c", { delimiter: ";" })).toEqual([["a", "b", "c"]]);
  });

  it("trims fields when requested", () => {
    expect(parseCsv("  a , b , c ", { trim: true })).toEqual([
      ["a", "b", "c"],
    ]);
  });

  it("supports header mode", () => {
    expect(parseCsv("name,age\nAlice,30\nBob,25", { header: true })).toEqual([
      { name: "Alice", age: "30" },
      { name: "Bob", age: "25" },
    ]);
  });

  it("header mode pads missing fields", () => {
    expect(parseCsv("a,b,c\n1,2", { header: true })).toEqual([
      { a: "1", b: "2", c: "" },
    ]);
  });

  it("handles empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("handles single field row", () => {
    expect(parseCsv("hello")).toEqual([["hello"]]);
  });

  it("preserves empty fields", () => {
    expect(parseCsv("a,,c")).toEqual([["a", "", "c"]]);
  });

  it("ignores non-string input gracefully", () => {
    expect(parseCsv(/** @type {any} */ (null))).toEqual([]);
  });
});
