/**
 * src/utils/lhci-config.js — S130 Lighthouse CI per-locale config builder.
 *
 * Pure helpers that produce a Lighthouse-CI `lighthouserc` config object
 * for one or more locales, plus the resource-size / category budgets.
 *
 * No fetch, no Node fs — safe to import in browser bundles.
 */

const DEFAULT_BUDGETS = Object.freeze({
  performance: 0.9,
  accessibility: 0.95,
  "best-practices": 0.9,
  seo: 0.9,
  pwa: 0.8,
});

const DEFAULT_RESOURCE_SIZES = Object.freeze([
  { resourceType: "script", budget: 200 },
  { resourceType: "stylesheet", budget: 50 },
  { resourceType: "image", budget: 250 },
  { resourceType: "font", budget: 100 },
  { resourceType: "total", budget: 600 },
]);

/** Build the per-locale URL list. */
export function buildLocaleUrls(/** @type {string} */ baseUrl, /** @type {string[]} */ locales) {
  if (typeof baseUrl !== "string" || baseUrl.length === 0) return [];
  const clean = baseUrl.replace(/\/+$/, "");
  return (locales ?? [])
    .filter((/** @type {string} */ l) => typeof l === "string" && l.length > 0)
    .map((/** @type {string} */ l) => `${clean}/?lang=${encodeURIComponent(l)}`);
}

/**
 * Build the LH-CI assertion preset.
 * @param {Partial<typeof DEFAULT_BUDGETS>} [scoreOverrides]
 */
export function buildAssertions(scoreOverrides = {}) {
  /** @type {Record<string, [string, { minScore?: number }]>} */
  const out = {};
  const merged = { ...DEFAULT_BUDGETS, ...scoreOverrides };
  for (const [k, v] of Object.entries(merged)) {
    out[`categories:${k}`] = ["error", { minScore: v }];
  }
  return out;
}

/** Build a complete lighthouserc config object.
 * @param {{ baseUrl: string, locales: string[], scoreOverrides?: Record<string,number>, resourceBudgets?: readonly { resourceType: string, budget: number }[], numberOfRuns?: number }} opts
 */
export function buildLighthouseConfig({
  baseUrl,
  locales,
  scoreOverrides,
  resourceBudgets = DEFAULT_RESOURCE_SIZES,
  numberOfRuns = 3,
}) {
  const urls = buildLocaleUrls(baseUrl, locales);
  if (urls.length === 0) {
    throw new Error("at_least_one_url_required");
  }
  return {
    ci: {
      collect: {
        url: urls,
        numberOfRuns: Math.max(1, Math.min(10, Math.round(numberOfRuns))),
        settings: {
          preset: "desktop",
          budgetsPath: undefined,
        },
      },
      assert: {
        assertions: buildAssertions(scoreOverrides),
      },
      upload: {
        target: "temporary-public-storage",
      },
      budgets: [
        {
          path: "/*",
          resourceSizes: resourceBudgets.map((b) => ({ ...b })),
        },
      ],
    },
  };
}
