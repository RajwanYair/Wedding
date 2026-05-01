// @ts-check
/** tests/unit/registry-links.test.mjs — S602 */
import { describe, it, expect } from "vitest";
import {
  amazonIlLink,
  kspLink,
  zapLink,
  boutiqueLink,
  detectProvider,
} from "../../src/utils/registry-links.js";

describe("S602 registry-links", () => {
  it("amazonIlLink builds /dp/<ASIN> + UTM tags", () => {
    const url = amazonIlLink("B0CHX1234X", { content: "blender" });
    expect(url).toContain("/dp/B0CHX1234X");
    expect(url).toContain("utm_source=wedding-app");
    expect(url).toContain("utm_medium=registry");
    expect(url).toContain("utm_content=blender");
  });

  it("amazonIlLink rejects bad ASIN", () => {
    expect(() => amazonIlLink("bad")).toThrow(RangeError);
    expect(() => amazonIlLink(/** @type {any} */ (null))).toThrow();
  });

  it("kspLink encodes query", () => {
    const url = kspLink("מיקסר KitchenAid");
    expect(url).toContain("ksp.co.il");
    expect(url).toMatch(/q=.+/);
    expect(url).toContain("utm_campaign=wedding");
  });

  it("zapLink encodes query", () => {
    const url = zapLink("vacuum");
    expect(url).toContain("zap.co.il");
    expect(url).toContain("keyword=vacuum");
  });

  it("boutiqueLink requires https", () => {
    const url = boutiqueLink("https://shop.example.com/item/1");
    expect(url).toContain("https://shop.example.com/item/1");
    expect(url).toContain("utm_source=wedding-app");
    expect(() => boutiqueLink("http://insecure.example.com")).toThrow(RangeError);
    expect(() => boutiqueLink("not a url")).toThrow(RangeError);
  });

  it("detectProvider identifies known hosts", () => {
    expect(detectProvider("https://www.amazon.com/dp/B0CHX1234X")).toBe("amazon");
    expect(detectProvider("https://ksp.co.il/web/search/?q=x")).toBe("ksp");
    expect(detectProvider("https://www.zap.co.il/search.aspx?keyword=x")).toBe("zap");
    expect(detectProvider("https://shop.example.com/x")).toBe("other");
    expect(detectProvider("not a url")).toBe("invalid");
  });
});
