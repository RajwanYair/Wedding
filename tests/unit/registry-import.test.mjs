import { describe, it, expect } from "vitest";
import {
  parseCSV,
  parseJSON,
  detectSource,
  mergeRegistries,
  importSummary,
  validateItem,
  SOURCES,
} from "../../src/utils/registry-import.js";

describe("registry-import", () => {
  describe("SOURCES", () => {
    it("lists supported sources", () => {
      expect(SOURCES).toContain("amazon");
      expect(SOURCES).toContain("zola");
      expect(SOURCES).toContain("generic");
    });
  });

  describe("parseCSV", () => {
    it("parses valid CSV", () => {
      const csv = "name,price,url\nToaster,150,https://example.com\nBlender,200,";
      const items = parseCSV(csv);
      expect(items.length).toBe(2);
      expect(items[0].name).toBe("Toaster");
      expect(items[0].price).toBe(150);
      expect(items[0].source).toBe("generic");
    });

    it("skips rows with missing name or price", () => {
      const csv = "name,price\n,150\nToaster,abc";
      expect(parseCSV(csv).length).toBe(0);
    });

    it("returns empty for empty string", () => {
      expect(parseCSV("")).toEqual([]);
    });

    it("returns empty for header-only CSV", () => {
      expect(parseCSV("name,price")).toEqual([]);
    });

    it("applies custom source", () => {
      const csv = "name,price\nPlate,50";
      expect(parseCSV(csv, "amazon")[0].source).toBe("amazon");
    });
  });

  describe("parseJSON", () => {
    it("parses JSON string", () => {
      const json = JSON.stringify([{ name: "Cup", price: 30 }]);
      const items = parseJSON(json);
      expect(items.length).toBe(1);
      expect(items[0].name).toBe("Cup");
    });

    it("parses array directly", () => {
      const items = parseJSON([{ name: "Fork", price: 10, quantity: 4 }], "zola");
      expect(items[0].quantity).toBe(4);
      expect(items[0].source).toBe("zola");
    });

    it("returns empty for invalid JSON", () => {
      expect(parseJSON("{bad")).toEqual([]);
    });

    it("filters items without name or price", () => {
      const items = parseJSON([{ name: "Valid", price: 10 }, { name: "Bad" }]);
      expect(items.length).toBe(1);
    });
  });

  describe("detectSource", () => {
    it("detects amazon", () => {
      expect(detectSource("https://www.amazon.com/dp/B12345")).toBe("amazon");
    });

    it("detects zola", () => {
      expect(detectSource("https://www.zola.com/registry/abc")).toBe("zola");
    });

    it("returns generic for unknown", () => {
      expect(detectSource("https://example.com")).toBe("generic");
    });

    it("returns generic for non-string", () => {
      expect(detectSource(null)).toBe("generic");
    });
  });

  describe("mergeRegistries", () => {
    it("merges without duplicates", () => {
      const existing = [{ name: "Toaster", price: 150, currency: "ILS", url: "", source: "generic", purchased: false, quantity: 1 }];
      const imported = [
        { name: "Toaster", price: 160, currency: "ILS", url: "", source: "amazon", purchased: false, quantity: 1 },
        { name: "Blender", price: 200, currency: "ILS", url: "", source: "amazon", purchased: false, quantity: 1 },
      ];
      const { merged, added, skipped } = mergeRegistries(existing, imported);
      expect(merged.length).toBe(2);
      expect(added).toBe(1);
      expect(skipped).toBe(1);
    });

    it("handles null existing", () => {
      const { merged } = mergeRegistries(null, [{ name: "A", price: 1, currency: "ILS", url: "", source: "generic", purchased: false, quantity: 1 }]);
      expect(merged.length).toBe(1);
    });
  });

  describe("importSummary", () => {
    it("computes summary stats", () => {
      const items = [
        { name: "A", price: 100, currency: "ILS", url: "", source: "amazon", purchased: true, quantity: 2 },
        { name: "B", price: 50, currency: "ILS", url: "", source: "zola", purchased: false, quantity: 1 },
      ];
      const summary = importSummary(items);
      expect(summary.total).toBe(2);
      expect(summary.totalValue).toBe(250);
      expect(summary.purchased).toBe(1);
      expect(summary.sources.amazon).toBe(1);
    });

    it("returns zeros for non-array", () => {
      expect(importSummary(null).total).toBe(0);
    });
  });

  describe("validateItem", () => {
    it("validates a correct item", () => {
      expect(validateItem({ name: "Cup", price: 30 }).valid).toBe(true);
    });

    it("rejects missing name", () => {
      const result = validateItem({ price: 30 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Name is required");
    });

    it("rejects negative price", () => {
      expect(validateItem({ name: "X", price: -5 }).valid).toBe(false);
    });

    it("rejects null", () => {
      expect(validateItem(null).valid).toBe(false);
    });
  });
});
