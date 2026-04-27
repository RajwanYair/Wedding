/**
 * src/core/route-table.js — Typed route + query-param helpers
 *
 * ROADMAP §5 Phase A — preparation for the full pushState router rewrite.
 * This is a non-breaking addition: nav.js continues to use hash routing today
 * but can adopt these helpers incrementally.
 *
 * Provides:
 * - `parseLocation(url)` — split a URL into `{ section, params }`
 * - `buildHref({ section, params })` — produce a normalized hash URL
 * - `isKnownSection(name)` — guard against typos / unknown sections
 *
 * Query params are kept after the hash (`#section?key=val`) so they survive
 * the existing hash router and remain compatible with the future pushState
 * version (where they'd move to `?key=val#section`).
 */

import { SECTION_LIST, EXTRA_SECTIONS, PUBLIC_SECTIONS } from "./constants.js";

/** All routable section names (admin + extra). */
const ALL_SECTIONS = new Set([...SECTION_LIST, ...EXTRA_SECTIONS]);

/**
 * @typedef {{ section: string, params: Record<string, string> }} ParsedRoute
 */

/**
 * Parse a URL (or `location`) into a `{ section, params }` pair.
 * Accepts either:
 *   - `#section`
 *   - `#section?key=val&other=2`
 *   - `?key=val#section`  (pushState-style; future-proofing)
 *
 * @param {string | URL | Location} [input]  Defaults to `globalThis.location`.
 * @returns {ParsedRoute}
 */
export function parseLocation(input) {
  const loc = input ?? (typeof location === "undefined" ? null : location);
  if (!loc) return { section: "dashboard", params: {} };

  const hash = String(/** @type {{ hash?: string }} */ (loc).hash ?? "").replace(/^#/, "");
  const search = String(/** @type {{ search?: string }} */ (loc).search ?? "");

  // Hash may carry its own query suffix: "section?a=1"
  const [hashSection = "", hashQuery = ""] = hash.split("?", 2);
  const section = isKnownSection(hashSection) ? hashSection : "dashboard";

  /** @type {Record<string, string>} */
  const params = {};
  for (const src of [search.replace(/^\?/, ""), hashQuery]) {
    if (!src) continue;
    for (const pair of src.split("&")) {
      if (!pair) continue;
      const [rawK = "", rawV = ""] = pair.split("=", 2);
      try {
        params[decodeURIComponent(rawK)] = decodeURIComponent(rawV);
      } catch {
        params[rawK] = rawV;
      }
    }
  }
  return { section, params };
}

/**
 * Build a normalized hash href for the current router.
 * @param {{ section: string, params?: Record<string, string | number | boolean | undefined | null> }} route
 * @returns {string}
 */
export function buildHref({ section, params }) {
  if (!isKnownSection(section)) section = "dashboard";
  const qs = [];
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      qs.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
  }
  return qs.length ? `#${section}?${qs.join("&")}` : `#${section}`;
}

/**
 * Is `name` a known routable section?
 * @param {unknown} name
 * @returns {boolean}
 */
export function isKnownSection(name) {
  return typeof name === "string" && ALL_SECTIONS.has(name);
}

/**
 * Is `name` accessible without authentication?
 * @param {unknown} name
 * @returns {boolean}
 */
export function isPublicSection(name) {
  return typeof name === "string" && PUBLIC_SECTIONS.has(name);
}

/**
 * Extract a single param from the current location. Convenience for sections
 * that accept deep-link query state (e.g. `?id=guest_123`).
 * @param {string} key
 * @param {string | URL | Location} [input]
 * @returns {string | null}
 */
export function getRouteParam(key, input) {
  const { params } = parseLocation(input);
  return Object.hasOwn(params, key) ? (params[key] ?? null) : null;
}
