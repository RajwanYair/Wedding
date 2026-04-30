/**
 * src/utils/url-state.js — URL query-param filter/sort state helpers (S392)
 *
 * Provides lightweight read/write helpers for persisting section-level
 * filter and sort state in the URL hash query string, enabling deep-linkable
 * filtered views without triggering page reloads.
 *
 * Format: `#guests?filter=confirmed&sort=lastName&q=Cohen`
 *
 * Named exports only — no side effects.
 */

/**
 * Read the current URL hash query params as a plain object.
 * Supports both hash-based (`#section?key=val`) and pushState URLs.
 * @returns {Record<string, string>}
 */
export function getUrlParams() {
  const raw = location.hash || "";
  const qIdx = raw.indexOf("?");
  if (qIdx === -1) return {};
  const qs = raw.slice(qIdx + 1);
  /** @type {Record<string, string>} */
  const out = {};
  for (const [k, v] of new URLSearchParams(qs)) {
    out[k] = v;
  }
  return out;
}

/**
 * Merge new params into the current URL hash query string without navigating.
 * Strips keys whose value is empty, null, or the default value provided.
 *
 * @param {Record<string, string | null | undefined>} updates
 * @param {Record<string, string>} [defaults]  Keys equal to default are omitted
 */
export function setUrlParams(updates, defaults = {}) {
  const raw = location.hash || "";
  const hashBase = (raw.split("?")[0] ?? "").replace(/^#/, "");
  const existing = getUrlParams();
  const merged = { ...existing };
  for (const [k, v] of Object.entries(updates)) {
    if (v === null || v === undefined || v === "" || v === (defaults[k] ?? "")) {
      delete merged[k];
    } else {
      merged[k] = v;
    }
  }
  const qs = new URLSearchParams(merged).toString();
  const newHash = `#${hashBase}${qs ? `?${qs}` : ""}`;
  // Use replaceState — this is a filter change, not a navigation event.
  history.replaceState(history.state ?? null, "", newHash);
}

/**
 * Read a single URL param with an optional default.
 * @param {string} key
 * @param {string} [defaultValue]
 * @returns {string}
 */
export function getUrlParam(key, defaultValue = "") {
  return getUrlParams()[key] ?? defaultValue;
}
