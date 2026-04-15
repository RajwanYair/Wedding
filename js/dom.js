// @ts-check
"use strict";

/* ── DOM Cache (S1 — lazy Proxy for template-based rendering) ──
 *
 * Replaced eager getElementById() calls with a Proxy that looks up
 * elements on first access and caches the result. This is the ENABLING
 * CHANGE for Sprint 1: section HTML templates can be injected lazily
 * into the DOM after page load, and `el.xxx` will still resolve correctly
 * because the lookup is deferred until the first property access.
 *
 * The public API is identical to the old eager object — all existing
 * code using `el.guestTableBody`, `el.countdown`, etc. continues to work.
 *
 * Use `refreshDomCache()` after injecting a template to force re-lookup
 * of specific element IDs.
 */

/** @type {Record<string, HTMLElement | null>} */
const _domCache = {};

/**
 * Lazy DOM reference map.
 *
 * Access via `el.guestTableBody`, `el.countdown`, etc.
 * On first access, `document.getElementById(propName)` is called and
 * the result is stored in `_domCache`. Subsequent accesses return the
 * cached element without re-querying the DOM.
 *
 * @type {Record<string, HTMLElement | null>}
 */
const el = new Proxy(_domCache, {
  get(target, prop) {
    if (typeof prop !== "string") return undefined;
    if (Object.prototype.hasOwnProperty.call(target, prop)) return target[prop];
    const found = document.getElementById(prop);
    target[prop] = found;
    return found;
  },
  set(target, prop, value) {
    if (typeof prop === "string") target[prop] = value;
    return true;
  },
});

/**
 * Invalidate cached DOM references for the given element IDs.
 * Call this after injecting a section template so the next access
 * re-queries the freshly-injected DOM.
 *
 * @param {...string} ids  Element IDs to remove from the cache.
 */
function refreshDomCache(...ids) {
  if (ids.length === 0) {
    // Invalidate everything
    Object.keys(_domCache).forEach((k) => delete _domCache[k]);
  } else {
    ids.forEach((id) => delete _domCache[id]);
  }
}
