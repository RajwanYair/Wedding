/**
 * src/core/history-router.js — pushState router adapter (S91)
 *
 * Non-breaking preparation for the hash → pushState migration. Wraps the
 * History API with the same `{section, params}` shape used by `route-table.js`
 * so callers can switch routing strategies without changing their callsites.
 *
 * Activation is opt-in via {@link initHistoryRouter}. The legacy hash router
 * (`src/core/nav.js`) keeps owning real navigation until v13.0.
 */

import { buildHref, parseLocation, isKnownSection } from "./route-table.js";

/**
 * @typedef {{ section: string, params?: Record<string, string | number | boolean | undefined | null> }} HistoryRoute
 */

/**
 * Build a pushState-style URL: `?key=val#section`.
 * Mirrors the future canonical format that the v13 router will own.
 * @param {HistoryRoute} route
 * @returns {string}
 */
export function buildHistoryUrl({ section, params }) {
  const target = isKnownSection(section) ? section : "dashboard";
  /** @type {string[]} */
  const qs = [];
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      qs.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
  }
  const search = qs.length ? `?${qs.join("&")}` : "";
  return `${search}#${target}`;
}

/**
 * Push a route onto the History stack. No-op outside a browser environment.
 * @param {HistoryRoute} route
 */
export function pushRoute(route) {
  if (typeof window === "undefined" || typeof window.history?.pushState !== "function") return;
  const url = buildHistoryUrl(route);
  window.history.pushState({ section: route.section }, "", url);
  // Prefer PopStateEvent when available; fall back to a plain Event so the
  // module remains usable in non-browser test environments.
  /** @type {Event} */
  let event;
  if (typeof globalThis.PopStateEvent === "function") {
    event = new globalThis.PopStateEvent("popstate", { state: { section: route.section } });
  } else {
    event = new Event("popstate");
  }
  window.dispatchEvent(event);
}

/**
 * Replace the current History entry without pushing a new one.
 * @param {HistoryRoute} route
 */
export function replaceRoute(route) {
  if (typeof window === "undefined" || typeof window.history?.replaceState !== "function") return;
  const url = buildHistoryUrl(route);
  window.history.replaceState({ section: route.section }, "", url);
}

/**
 * Subscribe to route changes via `popstate`. Returns an unsubscribe function.
 * @param {(route: { section: string, params: Record<string, string> }) => void} cb
 * @returns {() => void}
 */
export function onRouteChange(cb) {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb(parseLocation(window.location));
  window.addEventListener("popstate", handler);
  return () => window.removeEventListener("popstate", handler);
}

/**
 * One-shot bootstrap: replace the current entry with a normalised URL and
 * subscribe to `popstate`. Returns an unsubscribe function.
 * @param {(route: { section: string, params: Record<string, string> }) => void} cb
 * @returns {() => void}
 */
export function initHistoryRouter(cb) {
  if (typeof window === "undefined") return () => {};
  const initial = parseLocation(window.location);
  // Re-write to canonical pushState format without firing popstate.
  replaceRoute({ section: initial.section, params: initial.params });
  // Convert hash links handled by the legacy router into pushState navigations.
  const linkHandler = (/** @type {Event} */ ev) => {
    const target = /** @type {{ closest?: (sel: string) => unknown } | null} */ (ev.target);
    if (!target || typeof target.closest !== "function") return;
    const a = /** @type {HTMLAnchorElement | null} */ (target.closest("a[href^='#']"));
    if (!a) return;
    const hashSection = a.getAttribute("href")?.slice(1) ?? "";
    if (!isKnownSection(hashSection)) return;
    ev.preventDefault();
    pushRoute({ section: hashSection });
  };
  window.addEventListener("click", linkHandler);
  const offRoute = onRouteChange(cb);
  cb(initial);
  return () => {
    window.removeEventListener("click", linkHandler);
    offRoute();
  };
}

// Local re-export so tests can verify a single import surface.
export { buildHref };
