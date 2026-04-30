import { describe, it, expect } from "vitest";
import {
  escapeValue,
  foldLine,
  buildVcard,
  buildBatch,
} from "../../src/utils/vcard-batch.js";

describe("vcard-batch", () => {
  it("escapeValue escapes commas, semicolons, backslashes, newlines", () => {
    expect(escapeValue("a,b;c\\d\nrow")).toBe("a\\,b\\;c\\\\d\\nrow");
  });

  it("escapeValue handles null/undefined/non-strings", () => {
    expect(escapeValue(null)).toBe("");
    expect(escapeValue(undefined)).toBe("");
    expect(escapeValue(42)).toBe("42");
  });

  it("foldLine preserves short lines", () => {
    expect(foldLine("short")).toBe("short");
  });

  it("foldLine wraps at 75 with leading space", () => {
    const long = "x".repeat(160);
    const folded = foldLine(long);
    const parts = folded.split("\r\n");
    expect(parts[0]).toHaveLength(75);
    expect(parts[1].startsWith(" ")).toBe(true);
  });

  it("buildVcard emits VCARD with FN/N/UID", () => {
    const card = buildVcard({ id: "g1", name: "Alice" });
    expect(card).toMatch(/^BEGIN:VCARD\r\n/);
    expect(card).toContain("VERSION:4.0\r\n");
    expect(card).toContain("UID:g1\r\n");
    expect(card).toContain("FN:Alice\r\n");
    expect(card).toMatch(/END:VCARD$/);
  });

  it("buildVcard includes phone, email, org, note", () => {
    const card = buildVcard({
      id: "g",
      name: "Alice",
      phone: "+972541234567",
      email: "alice@example.com",
      organization: "Family",
      note: "Vegan",
    });
    expect(card).toContain("TEL;TYPE=cell:+972541234567");
    expect(card).toContain("EMAIL:alice@example.com");
    expect(card).toContain("ORG:Family");
    expect(card).toContain("NOTE:Vegan");
  });

  it("buildVcard returns empty for guests with no contact info", () => {
    expect(buildVcard({ id: "g" })).toBe("");
  });

  it("buildVcard returns empty for invalid guest", () => {
    expect(buildVcard(null)).toBe("");
    expect(buildVcard({})).toBe("");
  });

  it("buildVcard escapes commas in names", () => {
    const card = buildVcard({ id: "g", name: "Smith, John" });
    expect(card).toContain("FN:Smith\\, John");
  });

  it("buildBatch concatenates multiple cards with CRLF", () => {
    const out = buildBatch([
      { id: "a", name: "Alice", phone: "1" },
      { id: "b", name: "Bob", phone: "2" },
    ]);
    expect((out.match(/BEGIN:VCARD/g) || []).length).toBe(2);
    expect(out).toMatch(/\r\n$/);
  });

  it("buildBatch skips empty cards", () => {
    const out = buildBatch([
      { id: "a", name: "Alice", phone: "1" },
      { id: "b" },
      null,
    ]);
    expect((out.match(/BEGIN:VCARD/g) || []).length).toBe(1);
  });

  it("buildBatch returns empty for no valid guests", () => {
    expect(buildBatch([])).toBe("");
    expect(buildBatch([{ id: "x" }])).toBe("");
  });
});
