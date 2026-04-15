/**
 * src/core/dom.js — Cached DOM element references (S0 named-export module)
 *
 * Exposes a lazily-evaluated `el` proxy that looks up named elements on
 * first access and caches them. Mirrors the `el` object from js/dom.js
 * without the window.* assignment.
 */

/** @type {Record<string, HTMLElement | null>} */
const _cache = {};

/**
 * Lazy DOM ref map.
 * Access via `el.guestList`, `el.tabGuests`, etc.
 * Element IDs are camelCase: `el.guestList` → `document.getElementById('guestList')`.
 *
 * @type {Record<string, HTMLElement | null>}
 */
export const el = new Proxy(_cache, {
  get(target, prop) {
    if (typeof prop !== "string") return null;
    if (prop in target) return target[prop];
    target[prop] = document.getElementById(prop);
    return target[prop];
  },
  set(target, prop, value) {
    if (typeof prop === "string") target[prop] = value;
    return true;
  },
});

/**
 * Clear the DOM cache (useful after re-renders or test resets).
 */
export function clearDomCache() {
  Object.keys(_cache).forEach((k) => delete _cache[k]);
}

/**
 * Pre-warm specific element IDs into the cache.
 * @param {...string} ids
 */
export function warmDom(...ids) {
  ids.forEach((id) => {
    _cache[id] = document.getElementById(id);
  });
}
