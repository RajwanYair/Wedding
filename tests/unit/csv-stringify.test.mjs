import { describe, it, expect } from "vitest";
import {
  stringifyCsv,
  stringifyCsvObjects,
} from "../../src/utils/csv-stringify.js";

describe("csv-stringify", () => {
  it("plain rows join with CRLF by default", () => {
    expect(
      stringifyCsv([
        ["a", "b", "c"],
        ["1", "2", "3"],
      ]),
    ).toBe("a,b,c\r\n1,2,3");
  });

  it("quotes fields with commas", () => {
    expect(stringifyCsv([["a,b", "c"]])).toBe('"a,b",c');
  });

  it("escapes quotes by doubling", () => {
    expect(stringifyCsv([['he said "hi"', "x"]])).toBe('"he said ""hi""",x');
  });

  it("quotes fields with newlines", () => {
    expect(stringifyCsv([["a\nb", "c"]])).toBe('"a\nb",c');
  });

  it("null and undefined become empty", () => {
    expect(stringifyCsv([[null, undefined, 0]])).toBe(",,0");
  });

  it("custom delimiter", () => {
    expect(stringifyCsv([["a", "b"]], { delimiter: ";" })).toBe("a;b");
  });

  it("custom eol", () => {
    expect(stringifyCsv([["a"], ["b"]], { eol: "\n" })).toBe("a\nb");
  });

  it("non-array returns empty", () => {
    expect(stringifyCsv(/** @type {any} */ (null))).toBe("");
  });

  it("stringifyCsvObjects writes header by default", () => {
    const out = stringifyCsvObjects(
      [
        { a: 1, b: 2 },
        { a: 3, b: 4 },
      ],
      ["a", "b"],
      { eol: "\n" },
    );
    expect(out).toBe("a,b\n1,2\n3,4");
  });

  it("stringifyCsvObjects omits header when header:false", () => {
    const out = stringifyCsvObjects([{ a: 1, b: 2 }], ["a", "b"], {
      eol: "\n",
      header: false,
    });
    expect(out).toBe("1,2");
  });

  it("stringifyCsvObjects fills missing fields", () => {
    const out = stringifyCsvObjects(
      [/** @type {any} */ ({ a: 1 })],
      ["a", "b"],
      { eol: "\n" },
    );
    expect(out).toBe("a,b\n1,");
  });

  it("stringifyCsvObjects handles null row", () => {
    const out = stringifyCsvObjects(
      [/** @type {any} */ (null)],
      ["a", "b"],
      { eol: "\n", header: false },
    );
    expect(out).toBe(",");
  });
});
