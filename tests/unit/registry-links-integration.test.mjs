/**
 * S611 smoke test — registry deep-link builders + provider detection.
 *
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildAmazonIlLink,
  buildKspLink,
  buildZapLink,
  buildBoutiqueLink,
  getRegistryProvider,
} from "../../src/sections/registry.js";

const SECTION = readFileSync("src/sections/registry.js", "utf8");

describe("S611 registry deep-link wiring", () => {
  it("imports helpers from utils/registry-links.js", () => {
    expect(SECTION).toMatch(/from\s+"\.\.\/utils\/registry-links\.js"/);
    expect(SECTION).toMatch(/amazonIlLink/);
    expect(SECTION).toMatch(/kspLink/);
    expect(SECTION).toMatch(/zapLink/);
    expect(SECTION).toMatch(/detectProvider/);
  });

  it("buildAmazonIlLink adds UTM params", () => {
    const url = buildAmazonIlLink("B07XYZ1234");
    expect(url).toMatch(/amazon\.com\/dp\/B07XYZ1234/);
    expect(url).toMatch(/utm_source=wedding-app/);
    expect(url).toMatch(/utm_medium=registry/);
  });

  it("buildKspLink encodes query", () => {
    const url = buildKspLink("blender");
    expect(url).toMatch(/ksp\.co\.il/);
    expect(url).toMatch(/q=blender/);
  });

  it("buildZapLink encodes query", () => {
    const url = buildZapLink("toaster");
    expect(url).toMatch(/zap\.co\.il/);
    expect(url).toMatch(/keyword=toaster/);
  });

  it("buildBoutiqueLink rejects http", () => {
    expect(() => buildBoutiqueLink("http://shop.example.com")).toThrow();
    const url = buildBoutiqueLink("https://shop.example.com");
    expect(url).toMatch(/utm_source=wedding-app/);
  });

  it("getRegistryProvider classifies known hosts", () => {
    expect(getRegistryProvider("https://www.amazon.com/dp/X")).toBe("amazon");
    expect(getRegistryProvider("https://ksp.co.il/web/search/?q=x")).toBe("ksp");
    expect(getRegistryProvider("https://www.zap.co.il/x")).toBe("zap");
    expect(getRegistryProvider("https://other.example/")).toBe("other");
  });
});
