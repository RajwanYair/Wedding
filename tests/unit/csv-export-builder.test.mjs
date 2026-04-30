import { describe, it, expect } from "vitest";
import {
  escapeField,
  buildCsv,
  inferColumns,
} from "../../src/utils/csv-export-builder.js";

describe("csv-export-builder", () => {
  it("escapeField returns plain text untouched", () => {
    expect(escapeField("hello")).toBe("hello");
  });

  it("escapeField quotes when delimiter present", () => {
    expect(escapeField("a,b")).toBe('"a,b"');
  });

  it("escapeField doubles inner quotes and wraps", () => {
    expect(escapeField('he said "hi"')).toBe('"he said ""hi"""');
  });

  it("escapeField quotes newlines", () => {
    expect(escapeField("line1\nline2")).toBe('"line1\nline2"');
  });

  it("escapeField quotes leading/trailing whitespace", () => {
    expect(escapeField(" pad ")).toBe('" pad "');
  });

  it("escapeField stringifies non-strings", () => {
    expect(escapeField(42)).toBe("42");
    expect(escapeField(null)).toBe("");
    expect(escapeField(undefined)).toBe("");
    expect(escapeField(true)).toBe("true");
  });

  it("escapeField respects custom delimiter", () => {
    expect(escapeField("a;b", ";")).toBe('"a;b"');
    expect(escapeField("a,b", ";")).toBe("a,b");
  });

  it("buildCsv emits BOM by default", () => {
    const csv = buildCsv([{ a: 1 }], [{ key: "a" }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("buildCsv can omit BOM", () => {
    const csv = buildCsv([{ a: 1 }], [{ key: "a" }], { bom: false });
    expect(csv.charCodeAt(0)).not.toBe(0xfeff);
  });

  it("buildCsv emits header row by default", () => {
    const csv = buildCsv([], [{ key: "a", header: "Alpha" }], { bom: false });
    expect(csv).toBe("Alpha");
  });

  it("buildCsv can suppress headers", () => {
    const csv = buildCsv([{ a: "x" }], [{ key: "a" }], {
      bom: false,
      headers: false,
    });
    expect(csv).toBe("x");
  });

  it("buildCsv applies per-column formatter", () => {
    const csv = buildCsv(
      [{ price: 1500 }],
      [{ key: "price", format: (v) => `${v} ILS` }],
      { bom: false },
    );
    expect(csv).toBe("price\r\n1500 ILS");
  });

  it("buildCsv handles missing properties as empty cells", () => {
    const csv = buildCsv([{ a: "x" }], [{ key: "a" }, { key: "b" }], {
      bom: false,
    });
    expect(csv).toBe("a,b\r\nx,");
  });

  it("buildCsv supports semicolon delimiter", () => {
    const csv = buildCsv([{ a: "x", b: "y" }], [{ key: "a" }, { key: "b" }], {
      bom: false,
      delimiter: ";",
    });
    expect(csv).toBe("a;b\r\nx;y");
  });

  it("inferColumns derives keys from first row", () => {
    expect(inferColumns([{ a: 1, b: 2 }, { a: 3 }])).toEqual([
      { key: "a" },
      { key: "b" },
    ]);
  });

  it("inferColumns returns [] for empty array", () => {
    expect(inferColumns([])).toEqual([]);
  });
});
