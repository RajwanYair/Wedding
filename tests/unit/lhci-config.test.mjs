/**
 * tests/unit/lhci-config.test.mjs — S130 Lighthouse-CI per-locale config.
 */
import { describe, it, expect } from "vitest";
import {
  buildLocaleUrls,
  buildAssertions,
  buildLighthouseConfig,
} from "../../src/utils/lhci-config.js";

describe("S130 — lhci-config", () => {
  it("buildLocaleUrls trims trailing slash and adds lang param", () => {
    expect(buildLocaleUrls("https://x.com/", ["he", "en"])).toEqual([
      "https://x.com/?lang=he",
      "https://x.com/?lang=en",
    ]);
    expect(buildLocaleUrls("", ["he"])).toEqual([]);
    expect(buildLocaleUrls("https://x.com", [])).toEqual([]);
  });

  it("buildAssertions emits 'error' minScore for every category", () => {
    const a = buildAssertions({ performance: 0.95 });
    expect(a["categories:performance"]).toEqual(["error", { minScore: 0.95 }]);
    expect(a["categories:accessibility"][0]).toBe("error");
  });

  it("buildLighthouseConfig produces a valid lighthouserc shape", () => {
    const c = buildLighthouseConfig({
      baseUrl: "https://x.com",
      locales: ["he", "en", "ar"],
      numberOfRuns: 2,
    });
    expect(c.ci.collect.url).toHaveLength(3);
    expect(c.ci.collect.numberOfRuns).toBe(2);
    expect(c.ci.assert.assertions["categories:performance"][1].minScore).toBe(0.9);
    expect(c.ci.budgets[0].resourceSizes.find((r) => r.resourceType === "total").budget).toBe(600);
  });

  it("buildLighthouseConfig clamps numberOfRuns to [1,10]", () => {
    const lo = buildLighthouseConfig({
      baseUrl: "https://x.com",
      locales: ["he"],
      numberOfRuns: 0,
    });
    const hi = buildLighthouseConfig({
      baseUrl: "https://x.com",
      locales: ["he"],
      numberOfRuns: 99,
    });
    expect(lo.ci.collect.numberOfRuns).toBe(1);
    expect(hi.ci.collect.numberOfRuns).toBe(10);
  });

  it("throws when no URLs resolve", () => {
    expect(() =>
      buildLighthouseConfig({ baseUrl: "", locales: ["he"] }),
    ).toThrow("at_least_one_url_required");
  });
});
