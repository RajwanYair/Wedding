/**
 * tests/unit/lighthouse-config.test.mjs — Sprint 153 LH-CI per-locale config
 */

import { describe, it, expect } from "vitest";
import { buildLighthouseConfig, getLighthouseLocales } from "../../src/services/ci-helpers.js";

describe("Lighthouse Config (Sprint 153)", () => {
  describe("getLighthouseLocales", () => {
    it("returns 4 locales", () => {
      expect(getLighthouseLocales()).toEqual(["he", "en", "ar", "ru"]);
    });

    it("is frozen", () => {
      expect(Object.isFrozen(getLighthouseLocales())).toBe(true);
    });
  });

  describe("buildLighthouseConfig", () => {
    it("builds valid config for he", () => {
      const cfg = buildLighthouseConfig("he");
      expect(cfg.ci).toBeDefined();
      expect(cfg.ci.collect.url[0]).toContain("lang=he");
    });

    it("builds valid config for en", () => {
      const cfg = buildLighthouseConfig("en");
      expect(cfg.ci.collect.url[0]).toContain("lang=en");
    });

    it("defaults to mobile form factor", () => {
      const cfg = buildLighthouseConfig("he");
      expect(cfg.ci.collect.settings.formFactor).toBe("mobile");
      expect(cfg.ci.collect.settings.screenEmulation.mobile).toBe(true);
    });

    it("supports desktop form factor", () => {
      const cfg = buildLighthouseConfig("en", { formFactor: "desktop" });
      expect(cfg.ci.collect.settings.formFactor).toBe("desktop");
      expect(cfg.ci.collect.settings.screenEmulation.mobile).toBe(false);
    });

    it("supports custom numberOfRuns", () => {
      const cfg = buildLighthouseConfig("he", { numberOfRuns: 5 });
      expect(cfg.ci.collect.numberOfRuns).toBe(5);
    });

    it("has assert thresholds", () => {
      const cfg = buildLighthouseConfig("he");
      expect(cfg.ci.assert.assertions["categories:performance"]).toBeDefined();
      expect(cfg.ci.assert.assertions["categories:accessibility"]).toBeDefined();
    });

    it("uses temporary-public-storage upload target", () => {
      const cfg = buildLighthouseConfig("he");
      expect(cfg.ci.upload.target).toBe("temporary-public-storage");
    });

    it("includes Accept-Language header", () => {
      const cfg = buildLighthouseConfig("ar");
      const headers = JSON.parse(cfg.ci.collect.settings.extraHeaders);
      expect(headers["Accept-Language"]).toBe("ar");
    });
  });
});
