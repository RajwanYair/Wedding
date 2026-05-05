import { describe, it, expect, beforeEach } from "vitest";
import {
  resetIdCounter,
  detectStore,
  createRegistryItem,
  generateDeepLink,
  markPurchased,
  getRegistryStats,
  groupByStore,
  sortByPrice,
  filterByPriceRange,
  generateShareableLink,
} from "../../src/utils/registry-deeplink.js";

describe("S667 registry-deeplink", () => {
  beforeEach(() => resetIdCounter());

  describe("detectStore", () => {
    it("detects Amazon IL", () => {
      expect(detectStore("https://www.amazon.co.il/dp/B0123")).toBe("amazon_il");
    });

    it("detects Amazon US", () => {
      expect(detectStore("https://amazon.com/dp/X")).toBe("amazon_com");
    });

    it("detects IKEA", () => {
      expect(detectStore("https://www.ikea.co.il/product/123")).toBe("ikea");
    });

    it("returns other for unknown", () => {
      expect(detectStore("https://example.com")).toBe("other");
    });
  });

  describe("createRegistryItem", () => {
    it("creates item with defaults", () => {
      const item = createRegistryItem({ name: "Blender", url: "https://amazon.co.il/dp/B1", price: 299 });
      expect(item.id).toBe("reg_1");
      expect(item.name).toBe("Blender");
      expect(item.store).toBe("amazon_il");
      expect(item.currency).toBe("ILS");
      expect(item.purchased).toBe(false);
    });

    it("enforces minimum price of 0", () => {
      const item = createRegistryItem({ name: "X", url: "", price: -50 });
      expect(item.price).toBe(0);
    });
  });

  describe("generateDeepLink", () => {
    it("appends affiliate tag for Amazon", () => {
      const dl = generateDeepLink("https://amazon.co.il/dp/B1", "myaffiliate-21");
      expect(dl.deepLink).toBe("https://amazon.co.il/dp/B1?tag=myaffiliate-21");
      expect(dl.store).toBe("amazon_il");
    });

    it("appends to existing query params", () => {
      const dl = generateDeepLink("https://amazon.com/dp/B1?ref=sr", "tag123");
      expect(dl.deepLink).toBe("https://amazon.com/dp/B1?ref=sr&tag=tag123");
    });

    it("appends aff_id for AliExpress", () => {
      const dl = generateDeepLink("https://aliexpress.com/item/123", "aff99");
      expect(dl.deepLink).toContain("aff_id=aff99");
    });

    it("returns original for unknown stores", () => {
      const dl = generateDeepLink("https://example.com/item", "tag");
      expect(dl.deepLink).toBe("https://example.com/item");
    });

    it("returns original when no affiliate tag", () => {
      const dl = generateDeepLink("https://amazon.co.il/dp/B1", null);
      expect(dl.deepLink).toBe("https://amazon.co.il/dp/B1");
    });
  });

  describe("markPurchased", () => {
    it("marks item as purchased (immutable)", () => {
      const item = createRegistryItem({ name: "A", url: "", price: 100 });
      const updated = markPurchased(item);
      expect(updated.purchased).toBe(true);
      expect(item.purchased).toBe(false);
    });
  });

  describe("getRegistryStats", () => {
    it("calculates stats correctly", () => {
      const items = [
        createRegistryItem({ name: "A", url: "", price: 100 }),
        markPurchased(createRegistryItem({ name: "B", url: "", price: 200 })),
        createRegistryItem({ name: "C", url: "", price: 300 }),
      ];
      const stats = getRegistryStats(items);
      expect(stats.total).toBe(3);
      expect(stats.purchased).toBe(1);
      expect(stats.remaining).toBe(2);
      expect(stats.totalValue).toBe(600);
      expect(stats.purchasedValue).toBe(200);
    });
  });

  describe("groupByStore", () => {
    it("groups items by store", () => {
      const items = [
        createRegistryItem({ name: "A", url: "https://amazon.co.il/x", price: 50 }),
        createRegistryItem({ name: "B", url: "https://ikea.co.il/y", price: 80 }),
        createRegistryItem({ name: "C", url: "https://amazon.co.il/z", price: 120 }),
      ];
      const groups = groupByStore(items);
      expect(groups.amazon_il).toHaveLength(2);
      expect(groups.ikea).toHaveLength(1);
    });
  });

  describe("sortByPrice", () => {
    it("sorts ascending", () => {
      const items = [
        createRegistryItem({ name: "A", url: "", price: 300 }),
        createRegistryItem({ name: "B", url: "", price: 100 }),
        createRegistryItem({ name: "C", url: "", price: 200 }),
      ];
      const sorted = sortByPrice(items, "asc");
      expect(sorted[0].price).toBe(100);
      expect(sorted[2].price).toBe(300);
    });

    it("sorts descending", () => {
      const items = [
        createRegistryItem({ name: "A", url: "", price: 100 }),
        createRegistryItem({ name: "B", url: "", price: 300 }),
      ];
      const sorted = sortByPrice(items, "desc");
      expect(sorted[0].price).toBe(300);
    });
  });

  describe("filterByPriceRange", () => {
    it("filters unpurchased items within range", () => {
      const items = [
        createRegistryItem({ name: "A", url: "", price: 50 }),
        markPurchased(createRegistryItem({ name: "B", url: "", price: 100 })),
        createRegistryItem({ name: "C", url: "", price: 150 }),
        createRegistryItem({ name: "D", url: "", price: 500 }),
      ];
      const result = filterByPriceRange(items, 60, 200);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("C");
    });
  });

  describe("generateShareableLink", () => {
    it("encodes unpurchased items", () => {
      const items = [
        createRegistryItem({ name: "Blender", url: "https://amazon.co.il/x", price: 299 }),
        markPurchased(createRegistryItem({ name: "Bought", url: "", price: 50 })),
      ];
      const link = generateShareableLink(items, "Dana & Yair");
      expect(link).toContain("registry://");
      expect(link).toContain("Blender");
      expect(link).not.toContain("Bought");
    });
  });
});
