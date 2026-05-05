import { describe, it, expect } from "vitest";
import {
  parseCsvVendors,
  parseJsonVendors,
  validateVendorRow,
  normalizeLystioFormat,
  enrichIsraelVendor,
  batchValidate,
  importSummary,
  deduplicateVendors,
} from "../../src/utils/vendor-catalogue.js";

describe("vendor-catalogue", () => {
  describe("parseCsvVendors", () => {
    it("parses CSV with headers into vendor rows", () => {
      const csv = "name,category,phone\nAcme Flowers,flowers,054-1234567\nBest DJ,dj,052-9999999";
      const rows = parseCsvVendors(csv);
      expect(rows).toHaveLength(2);
      expect(rows[0].name).toBe("Acme Flowers");
      expect(rows[0].category).toBe("flowers");
      expect(rows[1].name).toBe("Best DJ");
    });

    it("returns empty array for falsy/empty input", () => {
      expect(parseCsvVendors("")).toEqual([]);
      expect(parseCsvVendors(null)).toEqual([]);
      expect(parseCsvVendors("header-only")).toEqual([]);
    });

    it("handles CRLF line endings", () => {
      const csv = "name,category\r\nTest Vendor,venue\r\n";
      const rows = parseCsvVendors(csv);
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe("Test Vendor");
    });
  });

  describe("parseJsonVendors", () => {
    it("parses JSON array into vendor rows", () => {
      const json = JSON.stringify([
        { name: "Studio A", category: "photography" },
        { name: "Band B", category: "dj" },
      ]);
      const rows = parseJsonVendors(json);
      expect(rows).toHaveLength(2);
      expect(rows[0].name).toBe("Studio A");
    });

    it("returns empty array for invalid JSON", () => {
      expect(parseJsonVendors("{bad")).toEqual([]);
      expect(parseJsonVendors("")).toEqual([]);
      expect(parseJsonVendors(null)).toEqual([]);
    });

    it("returns empty array for non-array JSON", () => {
      expect(parseJsonVendors('{"name":"test"}')).toEqual([]);
    });
  });

  describe("validateVendorRow", () => {
    it("returns empty array for valid row", () => {
      const errors = validateVendorRow({ name: "Flowers Inc", category: "flowers" });
      expect(errors).toEqual([]);
    });

    it("reports missing name", () => {
      const errors = validateVendorRow({ name: "" });
      expect(errors).toContain("missing required field: name");
    });

    it("reports unknown category", () => {
      const errors = validateVendorRow({ name: "X", category: "unknown_cat" });
      expect(errors[0]).toContain("unknown category");
    });

    it("reports invalid email", () => {
      const errors = validateVendorRow({ name: "X", email: "not-an-email" });
      expect(errors[0]).toContain("invalid email");
    });

    it("reports negative priceEstimate", () => {
      const errors = validateVendorRow({ name: "X", priceEstimate: -100 });
      expect(errors[0]).toContain("priceEstimate must be a non-negative number");
    });

    it("accepts valid priceEstimate", () => {
      expect(validateVendorRow({ name: "X", priceEstimate: 5000 })).toEqual([]);
    });

    it("returns error for non-object input", () => {
      expect(validateVendorRow(null)).toEqual(["row is not an object"]);
    });
  });

  describe("normalizeLystioFormat", () => {
    it("maps Lystio IL fields to canonical format", () => {
      const raw = {
        vendor_name: "חנות פרחים",
        vendor_type: "פרחים",
        contact_phone: "054-1111111",
        contact_email: "flowers@test.co.il",
        area: "מרכז",
        price_range: "3,000-5,000",
        url: "https://example.co.il",
        description: "Beautiful flowers",
      };
      const result = normalizeLystioFormat(raw);
      expect(result.name).toBe("חנות פרחים");
      expect(result.category).toBe("flowers");
      expect(result.region).toBe("מרכז");
      expect(result.priceEstimate).toBe(4000);
    });

    it("handles empty raw input", () => {
      expect(normalizeLystioFormat(null)).toEqual({ name: "" });
      expect(normalizeLystioFormat({})).toEqual(expect.objectContaining({ name: "" }));
    });
  });

  describe("enrichIsraelVendor", () => {
    it("converts 05X phone to +972", () => {
      const result = enrichIsraelVendor({ name: "Test", phone: "054-1234567" });
      expect(result.phone).toBe("+972541234567");
    });

    it("normalizes Hebrew region names", () => {
      const result = enrichIsraelVendor({ name: "Test", region: "צפון" });
      expect(result.region).toBe("north");
    });

    it("lowercases category", () => {
      const result = enrichIsraelVendor({ name: "Test", category: "PHOTOGRAPHY" });
      expect(result.category).toBe("photography");
    });

    it("handles null input", () => {
      expect(enrichIsraelVendor(null)).toEqual({ name: "" });
    });
  });

  describe("batchValidate", () => {
    it("partitions rows into valid and invalid", () => {
      const rows = [
        { name: "Good Vendor", category: "venue" },
        { name: "", category: "venue" },
        { name: "Another Good", category: "dj" },
      ];
      const result = batchValidate(rows);
      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].row).toBe(2);
    });

    it("returns empty for non-array", () => {
      expect(batchValidate(null)).toEqual({ valid: [], invalid: [] });
    });
  });

  describe("importSummary", () => {
    it("calculates summary from batch results", () => {
      const result = importSummary({
        valid: [{ name: "A" }, { name: "B" }, { name: "C" }],
        invalid: [{ row: 1, errors: ["err"] }],
      });
      expect(result.total).toBe(4);
      expect(result.valid).toBe(3);
      expect(result.invalid).toBe(1);
      expect(result.rate).toBe(75);
    });

    it("handles empty result", () => {
      expect(importSummary({ valid: [], invalid: [] })).toEqual({
        total: 0, valid: 0, invalid: 0, rate: 0,
      });
    });
  });

  describe("deduplicateVendors", () => {
    it("removes duplicate names (case-insensitive)", () => {
      const rows = [
        { name: "Flowers Inc" },
        { name: "flowers inc" },
        { name: "DJ Pro" },
      ];
      const result = deduplicateVendors(rows);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Flowers Inc");
    });

    it("returns empty for non-array", () => {
      expect(deduplicateVendors(null)).toEqual([]);
    });

    it("skips rows with empty names", () => {
      const rows = [{ name: "" }, { name: "Valid" }];
      const result = deduplicateVendors(rows);
      expect(result).toHaveLength(1);
    });
  });
});
