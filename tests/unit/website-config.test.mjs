// tests/unit/website-config.test.mjs — S632 website config schema
import { describe, it, expect } from "vitest";
import {
  WEBSITE_THEMES,
  getThemeDefaults,
  buildConfig,
  validateConfig,
  styleToCssVars,
} from "../../src/utils/website-config.js";

describe("website-config", () => {
  describe("WEBSITE_THEMES", () => {
    it("has 5 themes", () => {
      expect(WEBSITE_THEMES).toHaveLength(5);
      expect(WEBSITE_THEMES).toContain("classic");
      expect(WEBSITE_THEMES).toContain("modern");
    });
  });

  describe("getThemeDefaults", () => {
    it("returns defaults for known theme", () => {
      const d = getThemeDefaults("modern");
      expect(d.fontFamily).toContain("Inter");
      expect(d.accentColor).toMatch(/^#/);
    });
    it("falls back to classic for unknown", () => {
      expect(getThemeDefaults("nope")).toEqual(getThemeDefaults("classic"));
    });
  });

  describe("buildConfig", () => {
    it("fills defaults from partial", () => {
      const c = buildConfig({ coupleName: "A & B" });
      expect(c.coupleName).toBe("A & B");
      expect(c.theme).toBe("classic");
      expect(c.enabledSections).toEqual(["hero", "event-details", "rsvp"]);
      expect(c.style.fontFamily).toBeTruthy();
      expect(c.seo.noIndex).toBe(false);
    });
    it("uses specified theme style", () => {
      const c = buildConfig({ coupleName: "X", theme: "garden" });
      expect(c.style.accentColor).toBe("#2d6a4f");
    });
    it("allows style overrides", () => {
      const c = buildConfig({ coupleName: "X", style: { accentColor: "#ff0000" } });
      expect(c.style.accentColor).toBe("#ff0000");
    });
    it("handles null input", () => {
      const c = buildConfig(null);
      expect(c.theme).toBe("classic");
    });
  });

  describe("validateConfig", () => {
    it("passes valid config", () => {
      const c = buildConfig({ coupleName: "A & B" });
      expect(validateConfig(c)).toEqual([]);
    });
    it("rejects missing coupleName", () => {
      const c = buildConfig({});
      expect(validateConfig(c).some((e) => e.includes("coupleName"))).toBe(true);
    });
    it("rejects invalid hex color", () => {
      const c = buildConfig({ coupleName: "A", style: { accentColor: "red" } });
      expect(validateConfig(c).some((e) => e.includes("accentColor"))).toBe(true);
    });
    it("rejects empty sections", () => {
      const c = { ...buildConfig({ coupleName: "A" }), enabledSections: [] };
      expect(validateConfig(c).some((e) => e.includes("section"))).toBe(true);
    });
    it("rejects invalid domain", () => {
      const c = { ...buildConfig({ coupleName: "A" }), customDomain: "no spaces" };
      expect(validateConfig(c).some((e) => e.includes("customDomain"))).toBe(true);
    });
    it("accepts valid domain", () => {
      const c = { ...buildConfig({ coupleName: "A" }), customDomain: "wedding.example.com" };
      expect(validateConfig(c)).toEqual([]);
    });
    it("handles null", () => {
      expect(validateConfig(null).length).toBeGreaterThan(0);
    });
  });

  describe("styleToCssVars", () => {
    it("generates CSS custom properties", () => {
      const css = styleToCssVars(getThemeDefaults("classic"));
      expect(css).toContain("--ws-font-family:");
      expect(css).toContain("--ws-accent:");
      expect(css).toContain("--ws-direction:");
    });
    it("handles null", () => {
      expect(styleToCssVars(null)).toBe("");
    });
  });
});
