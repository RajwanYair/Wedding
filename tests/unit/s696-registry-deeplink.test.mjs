/**
 * tests/unit/s696-registry-deeplink.test.mjs
 * S696 — Registry deep-link generator: detectStore, generateDeepLink,
 *          createRegistryItem, getRegistryStats, groupByStore, sortByPrice.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  detectStore,
  generateDeepLink,
  createRegistryItem,
  markPurchased,
  getRegistryStats,
  groupByStore,
  sortByPrice,
  resetIdCounter,
} from "../../src/utils/registry-deeplink.js";

beforeEach(() => resetIdCounter());

describe("S696 detectStore", () => {
  it("detects amazon_il", () => {
    expect(detectStore("https://www.amazon.co.il/dp/B08N5WRWNW")).toBe("amazon_il");
  });
  it("detects amazon_com", () => {
    expect(detectStore("https://www.amazon.com/registry/wedding/abc")).toBe("amazon_com");
  });
  it("detects ikea", () => {
    expect(detectStore("https://www.ikea.co.il/cat/bedroom/")).toBe("ikea");
  });
  it("detects aliexpress", () => {
    expect(detectStore("https://www.aliexpress.com/item/123.html")).toBe("aliexpress");
  });
  it("returns other for unknown store", () => {
    expect(detectStore("https://www.boutique-example.co.il/shop")).toBe("other");
  });
});

describe("S696 generateDeepLink", () => {
  it("appends tag= param for amazon_il", () => {
    const { deepLink } = generateDeepLink("https://www.amazon.co.il/dp/ABC", "mytag");
    expect(deepLink).toContain("tag=mytag");
    expect(deepLink).toContain("amazon.co.il");
  });

  it("appends tag= using & when URL already has query string", () => {
    const { deepLink } = generateDeepLink("https://www.amazon.com/product?ref=sr", "tag123");
    expect(deepLink).toContain("&tag=tag123");
  });

  it("appends aff_id for aliexpress", () => {
    const { deepLink } = generateDeepLink("https://www.aliexpress.com/item/123", "aff99");
    expect(deepLink).toContain("aff_id=aff99");
  });

  it("returns original unchanged for other stores without tag", () => {
    const url = "https://www.giftly.com/gift-cards";
    const { deepLink, original } = generateDeepLink(url, null);
    expect(deepLink).toBe(original);
  });

  it("returns original unchanged for other stores with tag", () => {
    const url = "https://www.unknown-store.co.il/product";
    const { deepLink } = generateDeepLink(url, "anytag");
    expect(deepLink).toBe(url); // other stores don't support affiliate
  });

  it("exposes store in returned object", () => {
    const result = generateDeepLink("https://www.amazon.co.il/dp/X", "t");
    expect(result.store).toBe("amazon_il");
    expect(result.affiliateTag).toBe("t");
  });
});

describe("S696 createRegistryItem", () => {
  it("assigns sequential id", () => {
    const a = createRegistryItem({ name: "A", url: "https://a.co/item", price: 100 });
    const b = createRegistryItem({ name: "B", url: "https://b.co/item", price: 200 });
    expect(a.id).toBe("reg_1");
    expect(b.id).toBe("reg_2");
  });

  it("detects store from url", () => {
    const item = createRegistryItem({ name: "X", url: "https://www.amazon.co.il/dp/Y", price: 50 });
    expect(item.store).toBe("amazon_il");
  });

  it("defaults currency to ILS", () => {
    const item = createRegistryItem({ name: "X", url: "https://example.com", price: 0 });
    expect(item.currency).toBe("ILS");
  });

  it("defaults purchased to false", () => {
    const item = createRegistryItem({ name: "X", url: "https://example.com", price: 0 });
    expect(item.purchased).toBe(false);
  });
});

describe("S696 markPurchased", () => {
  it("returns a new item with purchased=true", () => {
    const item = createRegistryItem({ name: "X", url: "https://example.com", price: 100 });
    const purchased = markPurchased(item);
    expect(purchased.purchased).toBe(true);
    expect(item.purchased).toBe(false); // original unchanged
  });
});

describe("S696 getRegistryStats", () => {
  it("counts total, purchased, remaining, values", () => {
    const items = [
      createRegistryItem({ name: "A", url: "https://a.com", price: 100 }),
      createRegistryItem({ name: "B", url: "https://b.com", price: 200 }),
      createRegistryItem({ name: "C", url: "https://c.com", price: 300 }),
    ];
    const withPurchase = [items[0], markPurchased(items[1]), items[2]];
    const stats = getRegistryStats(withPurchase);
    expect(stats.total).toBe(3);
    expect(stats.purchased).toBe(1);
    expect(stats.remaining).toBe(2);
    expect(stats.totalValue).toBe(600);
    expect(stats.purchasedValue).toBe(200);
  });

  it("handles empty list", () => {
    const stats = getRegistryStats([]);
    expect(stats.total).toBe(0);
    expect(stats.totalValue).toBe(0);
  });
});

describe("S696 groupByStore", () => {
  it("groups items by store", () => {
    const items = [
      createRegistryItem({ name: "A1", url: "https://www.amazon.co.il/dp/1", price: 50 }),
      createRegistryItem({ name: "A2", url: "https://www.amazon.co.il/dp/2", price: 60 }),
      createRegistryItem({ name: "I1", url: "https://www.ikea.co.il/cat/1", price: 70 }),
    ];
    const groups = groupByStore(items);
    expect(groups["amazon_il"]).toHaveLength(2);
    expect(groups["ikea"]).toHaveLength(1);
  });
});

describe("S696 sortByPrice", () => {
  it("sorts ascending by default", () => {
    const items = [
      createRegistryItem({ name: "A", url: "https://a.com", price: 300 }),
      createRegistryItem({ name: "B", url: "https://b.com", price: 100 }),
      createRegistryItem({ name: "C", url: "https://c.com", price: 200 }),
    ];
    const sorted = sortByPrice(items);
    expect(sorted[0].name).toBe("B");
    expect(sorted[2].name).toBe("A");
  });

  it("sorts descending when specified", () => {
    const items = [
      createRegistryItem({ name: "A", url: "https://a.com", price: 300 }),
      createRegistryItem({ name: "B", url: "https://b.com", price: 100 }),
    ];
    const sorted = sortByPrice(items, "desc");
    expect(sorted[0].name).toBe("A");
  });
});
