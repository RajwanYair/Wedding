import { describe, it, expect } from "vitest";
import { parseCsv, parseCsvObjects } from "../../src/utils/csv-parse.js";

describe("csv-parse", () => {
  it("parses simple CSV", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles CRLF endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("supports quoted fields with commas", () => {
    expect(parseCsv('"a,b",c')).toEqual([["a,b", "c"]]);
  });

  it("unescapes doubled quotes", () => {
    expect(parseCsv('"he said ""hi""",x')).toEqual([['he said "hi"', "x"]]);
  });

  it("supports embedded newlines in quoted fields", () => {
    expect(parseCsv('"a\nb",c')).toEqual([["a\nb", "c"]]);
  });

  it("returns empty array for empty input", () => {
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv(/** @type {any} */ (null))).toEqual([]);
  });

  it("custom delimiter", () => {
    expect(parseCsv("a;b;c", { delimiter: ";" })).toEqual([["a", "b", "c"]]);
  });

  it("preserves empty fields", () => {
    expect(parseCsv("a,,c")).toEqual([["a", "", "c"]]);
  });

  it("handles trailing newline", () => {
    expect(parseCsv("a,b\n")).toEqual([["a", "b"]]);
  });

  it("parseCsvObjects keys by header", () => {
    expect(parseCsvObjects("a,b\n1,2\n3,4")).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  it("parseCsvObjects pads missing columns", () => {
    expect(parseCsvObjects("a,b,c\n1,2")).toEqual([
      { a: "1", b: "2", c: "" },
    ]);
  });

  it("parseCsvObjects empty input", () => {
    expect(parseCsvObjects("")).toEqual([]);
  });

  it("round-trips quoted text", () => {
    const text = '"hello, world","line1\nline2"';
    expect(parseCsv(text)).toEqual([["hello, world", "line1\nline2"]]);
  });
});
