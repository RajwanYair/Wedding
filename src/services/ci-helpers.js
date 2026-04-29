/**
 * src/services/deploy-targets.js — S152 one-click deploy button targets.
 *
 * Each target has a name, icon, and URL-builder that takes a repo URL.
 * The settings section renders these as deploy buttons.
 */

/**
 * @typedef {{ key: string, name: string, icon: string, buildUrl: (repoUrl: string) => string }} DeployTarget
 */

/** @type {ReadonlyArray<DeployTarget>} */
export const DEPLOY_TARGETS = Object.freeze([
  {
    key: "vercel",
    name: "Vercel",
    icon: "▲",
    buildUrl: (repo) =>
      `https://vercel.com/new/clone?repository-url=${encodeURIComponent(repo)}`,
  },
  {
    key: "netlify",
    name: "Netlify",
    icon: "◆",
    buildUrl: (repo) =>
      `https://app.netlify.com/start/deploy?repository=${encodeURIComponent(repo)}`,
  },
  {
    key: "cloudflare",
    name: "Cloudflare Pages",
    icon: "☁",
    buildUrl: (repo) =>
      `https://dash.cloudflare.com/?to=/:account/pages/new/provider/gh&repository=${encodeURIComponent(repo)}`,
  },
  {
    key: "render",
    name: "Render",
    icon: "⬡",
    buildUrl: (repo) =>
      `https://render.com/deploy?repo=${encodeURIComponent(repo)}`,
  },
]);

/**
 * Build deploy-button data for the given repo URL.
 * @param {string} repoUrl
 * @returns {Array<{key: string, name: string, icon: string, url: string}>}
 */
export function getDeployButtons(repoUrl) {
  if (!repoUrl || typeof repoUrl !== "string") return [];
  return DEPLOY_TARGETS.map((t) => ({
    key: t.key,
    name: t.name,
    icon: t.icon,
    url: t.buildUrl(repoUrl),
  }));
}


// ────────────────────────────────────────────────────────────
// Merged from: lighthouse-config.js
// ────────────────────────────────────────────────────────────

/**
 * src/services/lighthouse-config.js — S153 Lighthouse CI config builder.
 *
 * Generates per-locale Lighthouse CI configurations. Used by the CI workflow
 * to run LH audits for each supported locale (he, en, ar, ru).
 *
 * Pure function — no DOM, no side effects.
 */

/**
 * @typedef {{ locale: string, url: string, formFactor?: string }} LighthouseLocaleConfig
 */

const DEFAULT_FORM_FACTOR = "mobile";
const DEFAULT_RUNS = 2;
const BASE_URL = "http://localhost/index.html";

/**
 * Build a Lighthouse CI config object for a specific locale.
 *
 * @param {string} locale — e.g. "he", "en", "ar", "ru"
 * @param {{ formFactor?: string, numberOfRuns?: number, baseUrl?: string }} [options]
 * @returns {{ ci: { collect: object, assert: object, upload: object } }}
 */
export function buildLighthouseConfig(locale, options = {}) {
  const formFactor = options.formFactor ?? DEFAULT_FORM_FACTOR;
  const numberOfRuns = options.numberOfRuns ?? DEFAULT_RUNS;
  const url = `${options.baseUrl ?? BASE_URL}?lang=${encodeURIComponent(locale)}`;

  return {
    ci: {
      collect: {
        staticDistDir: "dist",
        url: [url],
        numberOfRuns,
        settings: {
          onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
          formFactor,
          screenEmulation: formFactor === "mobile"
            ? { mobile: true, width: 390, height: 844, deviceScaleFactor: 3 }
            : { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1 },
          throttlingMethod: "simulate",
          extraHeaders: JSON.stringify({
            "Accept-Language": locale,
          }),
        },
      },
      assert: {
        assertions: {
          "categories:performance": ["error", { minScore: 0.8 }],
          "categories:accessibility": ["error", { minScore: 0.95 }],
          "categories:best-practices": ["error", { minScore: 0.9 }],
          "categories:seo": ["error", { minScore: 0.9 }],
        },
      },
      upload: {
        target: "temporary-public-storage",
      },
    },
  };
}

/**
 * Return the list of supported locales for Lighthouse CI audits.
 * @returns {ReadonlyArray<string>}
 */
export function getLighthouseLocales() {
  return Object.freeze(["he", "en", "ar", "ru"]);
}
