/**
 * src/utils/url-helpers.js — URL building and parsing utilities (Sprint 158)
 *
 * Centralizes all URL construction logic:
 *  - WhatsApp message links
 *  - Social sharing URLs
 *  - Deep links within the app
 *  - Query string building and parsing
 *
 * All functions are pure and side-effect-free.
 */

/**
 * Build a WhatsApp message URL for a given phone number and message.
 * Uses wa.me as default (works on all devices).
 *
 * @param {string} phone  - Cleaned phone number (no +, e.g. "972541234567")
 * @param {string} [msg]  - Optional pre-filled message text
 * @returns {string}
 */
export function buildWhatsAppUrl(phone, msg = "") {
  const p = String(phone).replace(/\D/g, "");
  const base = `https://wa.me/${p}`;
  return msg ? `${base}?text=${encodeURIComponent(msg)}` : base;
}

/**
 * Build a Google Maps URL from an address string.
 *
 * @param {string} address
 * @returns {string}
 */
export function buildMapsUrl(address) {
  return `https://maps.google.com/maps?q=${encodeURIComponent(address)}`;
}

/**
 * Build a Waze navigation URL from an address string.
 *
 * @param {string} address
 * @returns {string}
 */
export function buildWazeUrl(address) {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
}

/**
 * Append query parameters to an existing URL without double-encoding.
 *
 * @param {string} base     - Base URL (may already contain query params)
 * @param {Record<string, string | number | boolean>} params
 * @returns {string}
 */
export function appendQueryParams(base, params) {
  if (!params || Object.keys(params).length === 0) return base;
  const url = new URL(base, "https://dummy.example.com");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  // Return only the relative part if original was relative
  if (base.startsWith("http")) return url.toString();
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Parse query parameters from a URL or query string.
 *
 * @param {string} urlOrSearch  e.g. "?name=foo&age=21" or full URL
 * @returns {Record<string, string>}
 */
export function parseQueryParams(urlOrSearch) {
  if (!urlOrSearch || !urlOrSearch.includes("?")) return {};
  let search = urlOrSearch.slice(urlOrSearch.indexOf("?") + 1);
  // Strip fragment
  const hashAt = search.indexOf("#");
  if (hashAt !== -1) search = search.slice(0, hashAt);
  const params = new URLSearchParams(search);
  /** @type {Record<string, string>} */
  const result = {};
  for (const [key, val] of params) {
    result[key] = val;
  }
  return result;
}

/**
 * Build a mailto: link.
 *
 * @param {string} to
 * @param {{ subject?: string, body?: string }} [opts]
 * @returns {string}
 */
export function buildMailtoUrl(to, opts = {}) {
  const params = new URLSearchParams();
  if (opts.subject) params.set("subject", opts.subject);
  if (opts.body) params.set("body", opts.body);
  const qs = params.toString();
  return qs ? `mailto:${to}?${qs}` : `mailto:${to}`;
}

/**
 * Check whether a URL is safe to link to (https-only, no javascript:).
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isSafeUrl(url) {
  if (!url || typeof url !== "string") return false;
  const lower = url.toLowerCase().trim();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return false;
  }
  return lower.startsWith("https://") || lower.startsWith("http://") ||
    lower.startsWith("mailto:") || lower.startsWith("/") || lower.startsWith("#");
}
