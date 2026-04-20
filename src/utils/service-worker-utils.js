/**
 * src/utils/service-worker-utils.js — Service Worker cache management helpers
 *
 * S57: Cache API wrappers for listing, inspecting, prefetching, and clearing
 * caches. Complements src/core/ui.js (SW registration / update banner) with
 * pure cache-layer utilities.
 *
 * All functions return graceful fallbacks when the Cache API is unavailable.
 */

// ── API availability ───────────────────────────────────────────────────────

/**
 * Returns true if the Cache Storage API is available.
 * @returns {boolean}
 */
export function isCacheApiSupported() {
  return typeof caches !== "undefined" && typeof caches.open === "function";
}

/**
 * Returns true if the Service Worker API is available.
 * @returns {boolean}
 */
export function isSwSupported() {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

// ── Cache listing ──────────────────────────────────────────────────────────

/**
 * Returns all cache names from CacheStorage.
 * Returns empty array when API is unavailable.
 * @returns {Promise<string[]>}
 */
export async function listCacheNames() {
  if (!isCacheApiSupported()) return [];
  return caches.keys();
}

/**
 * Returns all cached request URLs from a named cache.
 * Returns empty array when the cache does not exist or API is unavailable.
 * @param {string} cacheName
 * @returns {Promise<string[]>}
 */
export async function getCacheUrls(cacheName) {
  if (!isCacheApiSupported()) return [];
  const cache = await caches.open(cacheName);
  const requests = await cache.keys();
  return requests.map((r) => r.url);
}

/**
 * Returns the total number of cached entries across all caches (or a named cache).
 * @param {string} [cacheName] When omitted, counts across all caches.
 * @returns {Promise<number>}
 */
export async function getCacheEntryCount(cacheName) {
  if (!isCacheApiSupported()) return 0;
  if (cacheName) {
    const cache = await caches.open(cacheName);
    return (await cache.keys()).length;
  }
  const names = await caches.keys();
  let total = 0;
  for (const name of names) {
    const cache = await caches.open(name);
    total += (await cache.keys()).length;
  }
  return total;
}

// ── Cache deletion ─────────────────────────────────────────────────────────

/**
 * Deletes a named cache. Returns true if it existed, false otherwise.
 * @param {string} cacheName
 * @returns {Promise<boolean>}
 */
export async function deleteCache(cacheName) {
  if (!isCacheApiSupported()) return false;
  return caches.delete(cacheName);
}

/**
 * Deletes all caches except those matching the keepPattern.
 * @param {RegExp | null} [keepPattern] Caches whose names match this pattern are kept.
 * @returns {Promise<string[]>} Names of deleted caches.
 */
export async function pruneOldCaches(keepPattern = null) {
  if (!isCacheApiSupported()) return [];
  const names = await caches.keys();
  const deleted = [];
  for (const name of names) {
    if (keepPattern && keepPattern.test(name)) continue;
    await caches.delete(name);
    deleted.push(name);
  }
  return deleted;
}

/**
 * Deletes all caches whose names start with a given prefix but do NOT match
 * the current version string. Useful for cleaning up old versioned caches.
 * @param {string} prefix  e.g. "wedding-v"
 * @param {string} currentVersion  e.g. "wedding-v9.6.0"
 * @returns {Promise<string[]>} Names of deleted caches.
 */
export async function pruneVersionedCaches(prefix, currentVersion) {
  if (!isCacheApiSupported()) return [];
  const names = await caches.keys();
  const deleted = [];
  for (const name of names) {
    if (name.startsWith(prefix) && name !== currentVersion) {
      await caches.delete(name);
      deleted.push(name);
    }
  }
  return deleted;
}

// ── Prefetch / warm cache ──────────────────────────────────────────────────

/**
 * Prefetches a list of URLs into a named cache.
 * Skips URLs that are already cached.
 * Returns an object with `added` and `skipped` URL arrays.
 * @param {string} cacheName
 * @param {string[]} urls
 * @returns {Promise<{ added: string[]; skipped: string[]; errors: string[] }>}
 */
export async function prefetchUrls(cacheName, urls) {
  if (!isCacheApiSupported()) return { added: [], skipped: [], errors: urls };
  const cache = await caches.open(cacheName);
  const added = [];
  const skipped = [];
  const errors = [];

  for (const url of urls) {
    const existing = await cache.match(url);
    if (existing) {
      skipped.push(url);
      continue;
    }
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
        added.push(url);
      } else {
        errors.push(url);
      }
    } catch {
      errors.push(url);
    }
  }

  return { added, skipped, errors };
}

// ── Cache inspection ───────────────────────────────────────────────────────

/**
 * Returns true if the given URL is present in the named cache.
 * @param {string} cacheName
 * @param {string} url
 * @returns {Promise<boolean>}
 */
export async function isCached(cacheName, url) {
  if (!isCacheApiSupported()) return false;
  const cache = await caches.open(cacheName);
  const match = await cache.match(url);
  return match != null;
}

/**
 * Returns a cached Response for the given URL, or null if not found.
 * @param {string} cacheName
 * @param {string} url
 * @returns {Promise<Response | null>}
 */
export async function getCachedResponse(cacheName, url) {
  if (!isCacheApiSupported()) return null;
  const cache = await caches.open(cacheName);
  return (await cache.match(url)) ?? null;
}

// ── SW messaging ───────────────────────────────────────────────────────────

/**
 * Posts a message to the active Service Worker, if one is controlling the page.
 * Returns true if the message was sent.
 * @param {unknown} message
 * @returns {boolean}
 */
export function postMessageToSW(message) {
  if (!isSwSupported()) return false;
  const sw = navigator.serviceWorker.controller;
  if (!sw) return false;
  sw.postMessage(message);
  return true;
}

/**
 * Posts a SKIP_WAITING message to a specific SW registration's waiting worker.
 * @param {ServiceWorkerRegistration} registration
 * @returns {boolean}
 */
export function skipWaiting(registration) {
  if (!registration.waiting) return false;
  registration.waiting.postMessage("SKIP_WAITING");
  return true;
}
