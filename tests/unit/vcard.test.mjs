/**
 * tests/unit/vcard.test.mjs — S210 coverage ratchet: vcard utils
 */
import { describe, it, expect } from "vitest";
import {
  buildVCardDataUrl,
  getVCardFilename,
} from "../../src/utils/vcard.js";

describe("vcard — buildVCardDataUrl", () => {
  it("returns a data: URI", () => {
    const url = buildVCardDataUrl({ name: "Alice", phone: "+972501234567" });
    expect(url).toMatch(/^data:text\/vcard;charset=utf-8,/);
  });

  it("encodes BEGIN:VCARD and VERSION:3.0 in the URI", () => {
    const url = buildVCardDataUrl({ name: "Bob" });
    const decoded = decodeURIComponent(url.replace(/^data:text\/vcard;charset=utf-8,/, ""));
    expect(decoded).toContain("BEGIN:VCARD");
    expect(decoded).toContain("VERSION:3.0");
    expect(decoded).toContain("END:VCARD");
  });

  it("includes FN for the full name", () => {
    const url = buildVCardDataUrl({ name: "Test Vendor" });
    const decoded = decodeURIComponent(url.replace(/^data:text\/vcard;charset=utf-8,/, ""));
    expect(decoded).toContain("FN:Test Vendor");
  });

  it("includes ORG when category is provided", () => {
    const url = buildVCardDataUrl({ name: "x", category: "Catering" });
    const decoded = decodeURIComponent(url.replace(/^data:text\/vcard;charset=utf-8,/, ""));
    expect(decoded).toContain("ORG:Catering");
  });

  it("includes TEL when phone is provided", () => {
    const url = buildVCardDataUrl({ phone: "+972509876543" });
    const decoded = decodeURIComponent(url.replace(/^data:text\/vcard;charset=utf-8,/, ""));
    expect(decoded).toContain("TEL;TYPE=WORK,VOICE:+972509876543");
  });

  it("includes URL when contractUrl is provided", () => {
    const url = buildVCardDataUrl({ contractUrl: "https://example.com/contract" });
    const decoded = decodeURIComponent(url.replace(/^data:text\/vcard;charset=utf-8,/, ""));
    expect(decoded).toContain("URL:https://example.com/contract");
  });

  it("combines notes and contractUrl in NOTE field", () => {
    const url = buildVCardDataUrl({ notes: "Great vendor", contractUrl: "https://x.com" });
    const decoded = decodeURIComponent(url.replace(/^data:text\/vcard;charset=utf-8,/, ""));
    expect(decoded).toContain("NOTE:Great vendor | Contract: https://x.com");
  });

  it("escapes semicolons in name", () => {
    const url = buildVCardDataUrl({ name: "Smith; John" });
    const decoded = decodeURIComponent(url.replace(/^data:text\/vcard;charset=utf-8,/, ""));
    expect(decoded).toContain("FN:Smith\\; John");
  });

  it("handles empty source gracefully", () => {
    const url = buildVCardDataUrl({});
    expect(url).toMatch(/^data:text\/vcard;charset=utf-8,/);
    const decoded = decodeURIComponent(url.replace(/^data:text\/vcard;charset=utf-8,/, ""));
    expect(decoded).toContain("BEGIN:VCARD");
    expect(decoded).toContain("END:VCARD");
  });
});

describe("vcard — getVCardFilename", () => {
  it("returns <name>.vcf for a named vendor", () => {
    expect(getVCardFilename({ name: "Alice Cohen" })).toBe("Alice_Cohen.vcf");
  });

  it("falls back to category when name is absent", () => {
    expect(getVCardFilename({ category: "Catering" })).toBe("Catering.vcf");
  });

  it("falls back to contact.vcf when both are absent", () => {
    expect(getVCardFilename({})).toBe("contact.vcf");
  });

  it("strips special characters from the filename", () => {
    const fn = getVCardFilename({ name: "Bob/Vendor!" });
    expect(fn).not.toContain("/");
    expect(fn).not.toContain("!");
    expect(fn).toMatch(/\.vcf$/);
  });
});
