/**
 * tests/unit/vcard.test.mjs — Sprint 35
 *
 * Tests for src/utils/vcard.js —
 *   buildVCard, buildVCardDataUrl, buildBulkVCard, buildBulkVCardFilename
 */

import { describe, it, expect } from "vitest";
import { makeGuest } from "./helpers.js";
import {
  buildVCard,
  buildVCardDataUrl,
  buildBulkVCard,
  buildBulkVCardFilename,
} from "../../src/utils/vcard.js";

// ── buildVCard ─────────────────────────────────────────────────────────

describe("buildVCard()", () => {
  it("begins and ends with standard vCard markers", () => {
    const vc = buildVCard({ firstName: "Avi", lastName: "Cohen" });
    expect(vc).toContain("BEGIN:VCARD");
    expect(vc).toContain("END:VCARD");
    expect(vc).toContain("VERSION:3.0");
  });

  it("includes FN and N properties", () => {
    const vc = buildVCard({ firstName: "Avi", lastName: "Cohen" });
    expect(vc).toContain("FN:Avi Cohen");
    expect(vc).toContain("N:Cohen;Avi;;;");
  });

  it("includes TEL when phone is provided", () => {
    const vc = buildVCard({ firstName: "A", phone: "+972541234567" });
    expect(vc).toContain("TEL;TYPE=CELL:+972541234567");
  });

  it("omits TEL when phone is absent", () => {
    const vc = buildVCard({ firstName: "A", lastName: "B" });
    expect(vc).not.toContain("TEL");
  });

  it("includes EMAIL when provided", () => {
    const vc = buildVCard({ firstName: "A", email: "a@example.com" });
    expect(vc).toContain("EMAIL;TYPE=INTERNET:a@example.com");
  });

  it("includes NOTE when notes provided", () => {
    const vc = buildVCard({ firstName: "A", notes: "VIP guest" });
    expect(vc).toContain("NOTE:VIP guest");
  });

  it("escapes semicolons in values", () => {
    const vc = buildVCard({ firstName: "A;B", lastName: "C" });
    expect(vc).toContain("\\;");
  });

  it("uses CRLF line endings throughout", () => {
    const vc = buildVCard({ firstName: "Avi", lastName: "Cohen" });
    // Every line break should be \r\n
    const lines = vc.split("\r\n");
    expect(lines.length).toBeGreaterThan(3);
  });

  it("works with a full guest fixture", () => {
    const g = makeGuest({
      firstName: "Sara",
      lastName: "Levi",
      phone: "+972521112222",
      email: "sara@example.com",
    });
    const vc = buildVCard(g);
    expect(vc).toContain("FN:Sara Levi");
    expect(vc).toContain("+972521112222");
    expect(vc).toContain("sara@example.com");
  });

  it("handles missing first/last name gracefully", () => {
    const vc = buildVCard({});
    expect(vc).toContain("FN:Unknown");
  });
});

// ── buildVCardDataUrl ──────────────────────────────────────────────────

describe("buildVCardDataUrl()", () => {
  it("returns a data URL with text/vcard mime type", () => {
    const url = buildVCardDataUrl({ firstName: "Avi", lastName: "Cohen" });
    expect(url.startsWith("data:text/vcard;charset=utf-8,")).toBe(true);
  });

  it("URL-encodes the content", () => {
    const url = buildVCardDataUrl({ firstName: "Avi", lastName: "Cohen" });
    expect(url).toContain("%3A"); // ":" encoded
  });
});

// ── buildBulkVCard ─────────────────────────────────────────────────────

describe("buildBulkVCard()", () => {
  it("returns empty string for empty array", () => {
    expect(buildBulkVCard([])).toBe("");
  });

  it("concatenates multiple vCard blocks", () => {
    const guests = [
      makeGuest({ firstName: "A", lastName: "A" }),
      makeGuest({ firstName: "B", lastName: "B" }),
    ];
    const vcf = buildBulkVCard(guests);
    const beginCount = (vcf.match(/BEGIN:VCARD/g) ?? []).length;
    expect(beginCount).toBe(2);
  });
});

// ── buildBulkVCardFilename ─────────────────────────────────────────────

describe("buildBulkVCardFilename()", () => {
  it("includes the count and .vcf extension", () => {
    expect(buildBulkVCardFilename(50)).toBe("wedding-guests-50.vcf");
  });
});
