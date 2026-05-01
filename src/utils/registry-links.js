/**
 * src/utils/registry-links.js — S602 Gift registry deep links
 *
 * Pure URL builders for the gift-registry feature: Amazon IL, KSP,
 * Zap.co.il, and a generic boutique-store template. All builders add
 * UTM tags so we can attribute traffic from the wedding site.
 *
 * @owner platform
 */

const UTM_DEFAULTS = Object.freeze({
  source: "wedding-app",
  medium: "registry",
  campaign: "wedding",
});

/** @typedef {{ source?: string, medium?: string, campaign?: string, content?: string }} UtmParams */

function _withUtm(/** @type {URL} */ url, /** @type {UtmParams} */ utm) {
  const merged = { ...UTM_DEFAULTS, ...utm };
  url.searchParams.set("utm_source", merged.source);
  url.searchParams.set("utm_medium", merged.medium);
  url.searchParams.set("utm_campaign", merged.campaign);
  if (merged.content) url.searchParams.set("utm_content", merged.content);
  return url.toString();
}

const ASIN_RE = /^[A-Z0-9]{10}$/;

/**
 * Build an Amazon Israel product URL for an ASIN.
 *
 * @param {string} asin
 * @param {UtmParams} [utm]
 * @returns {string}
 */
export function amazonIlLink(asin, utm = {}) {
  if (typeof asin !== "string" || !ASIN_RE.test(asin)) {
    throw new RangeError("amazonIlLink: ASIN must be 10 chars [A-Z0-9]");
  }
  return _withUtm(new URL(`https://www.amazon.com/dp/${asin}`), utm);
}

/**
 * Build a KSP search URL.
 *
 * @param {string} query
 * @param {UtmParams} [utm]
 * @returns {string}
 */
export function kspLink(query, utm = {}) {
  if (!query || typeof query !== "string") throw new RangeError("kspLink: query required");
  const u = new URL("https://ksp.co.il/web/search/");
  u.searchParams.set("q", query.trim());
  return _withUtm(u, utm);
}

/**
 * Build a Zap.co.il search URL.
 *
 * @param {string} query
 * @param {UtmParams} [utm]
 * @returns {string}
 */
export function zapLink(query, utm = {}) {
  if (!query || typeof query !== "string") throw new RangeError("zapLink: query required");
  const u = new URL("https://www.zap.co.il/search.aspx");
  u.searchParams.set("keyword", query.trim());
  return _withUtm(u, utm);
}

/**
 * Build a generic boutique-store URL.
 *
 * @param {string} baseUrl  must be https://
 * @param {UtmParams} [utm]
 * @returns {string}
 */
export function boutiqueLink(baseUrl, utm = {}) {
  let u;
  try {
    u = new URL(baseUrl);
  } catch {
    throw new RangeError("boutiqueLink: baseUrl must be a valid URL");
  }
  if (u.protocol !== "https:") throw new RangeError("boutiqueLink: must be https://");
  return _withUtm(u, utm);
}

/**
 * Detect which provider a URL belongs to.
 *
 * @param {string} url
 * @returns {"amazon"|"ksp"|"zap"|"other"|"invalid"}
 */
export function detectProvider(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return "invalid";
  }
  const h = u.hostname.toLowerCase();
  if (h.endsWith("amazon.com") || h.endsWith("amazon.co.il")) return "amazon";
  if (h.endsWith("ksp.co.il")) return "ksp";
  if (h.endsWith("zap.co.il")) return "zap";
  return "other";
}
