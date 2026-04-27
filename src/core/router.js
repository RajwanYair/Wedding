/**
 * src/core/router.js — pushState router (ADR-025 phase R1).
 *
 * Provides a `navigate()` API that writes pushState entries and parses
 * query-string params alongside the legacy hash router in `nav.js`.
 * Both routers can run in parallel during the migration window
 * (v11.11 → v12.0).
 *
 * Public API:
 *   - navigate(name, params?, opts?)   — pushState (or replaceState)
 *   - currentRoute()                    — { section, params }
 *   - onRouteChange(handler)            — subscribe to popstate; returns cleanup
 *
 * Named exports only — no window.* side effects, no DOM mutation.
 *
 * @typedef {{ section: string, params: Record<string, string> }} Route
 */

import { SECTION_LIST } from "./constants.js";

const _validSections = new Set(SECTION_LIST);

/** @type {Set<(r: Route) => void>} */
const _subscribers = new Set();

/**
 * @param {string} name section name
 * @returns {boolean}
 */
function _isValid(name) {
  return _validSections.has(name);
}

/**
 * Build a URL for a route. Path style uses `#section` for now to remain
 * compatible with the GitHub Pages base path; ADR-025 R3 flips this to
 * a real path under `import.meta.env.BASE_URL`.
 *
 * @param {string} name
 * @param {Record<string, string|number|undefined>} [params]
 * @returns {string}
 */
function _buildUrl(name, params = {}) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    search.set(k, String(v));
  }
  const qs = search.toString();
  return `#${name}${qs ? `?${qs}` : ""}`;
}

/**
 * Parse the current location into a { section, params } tuple.
 * Accepts both flat hashes (`#guests`) and query-bearing hashes
 * (`#guests?id=abc&filter=pending`).
 * @returns {Route}
 */
export function currentRoute() {
  const raw = (location.hash || "").slice(1);
  if (!raw) return { section: "dashboard", params: {} };
  const [section, qs = ""] = raw.split("?");
  /** @type {Record<string, string>} */
  const params = {};
  for (const [k, v] of new URLSearchParams(qs)) params[k] = v;
  return { section: _isValid(section) ? section : "dashboard", params };
}

/**
 * Push-or-replace navigate. Always emits a `popstate`-equivalent
 * notification to subscribers so `onRouteChange` listeners fire on both
 * programmatic and browser-driven navigation.
 *
 * @param {string} name
 * @param {Record<string, string|number|undefined>} [params]
 * @param {{ replace?: boolean }} [opts]
 */
export function navigate(name, params = {}, opts = {}) {
  if (!name || typeof name !== "string") {
    throw new TypeError("router.navigate: name required");
  }
  if (!_isValid(name)) {
    throw new RangeError(`router.navigate: unknown section "${name}"`);
  }
  const url = _buildUrl(name, params);
  if (opts.replace) {
    history.replaceState({ section: name, params }, "", url);
  } else {
    history.pushState({ section: name, params }, "", url);
  }
  _emit({ section: name, params: _stringifyParams(params) });
}

/**
 * Subscribe to route changes. Fires on programmatic `navigate()` and on
 * browser-driven `popstate` events. Returns a cleanup function.
 *
 * @param {(r: Route) => void} handler
 * @returns {() => void}
 */
export function onRouteChange(handler) {
  if (typeof handler !== "function") {
    throw new TypeError("router.onRouteChange: handler must be a function");
  }
  _subscribers.add(handler);
  return () => _subscribers.delete(handler);
}

/**
 * Internal — wire popstate once. Idempotent.
 */
let _initialized = false;
/**
 * Initialise the popstate listener that emits route-change events.
 * Idempotent — safe to call multiple times.
 */
export function initRouterListener() {
  if (_initialized) return;
  _initialized = true;
  window.addEventListener(
    "popstate",
    () => {
      _emit(currentRoute());
    },
    { passive: true },
  );
}

/**
 * Test helper. Resets module state between tests.
 * @internal
 */
export function _resetRouterForTests() {
  _subscribers.clear();
  _initialized = false;
}

// ── private ─────────────────────────────────────────────────────────────

/**
 * @param {Route} route
 */
function _emit(route) {
  for (const h of _subscribers) {
    try {
      h(route);
    } catch (e) {
      console.error("[router] subscriber threw:", e);
    }
  }
}

/**
 * @param {Record<string, string|number|undefined>} params
 * @returns {Record<string, string>}
 */
function _stringifyParams(params) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}
