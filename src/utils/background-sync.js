/**
 * src/utils/background-sync.js — Background Sync API wrapper
 *
 * S52: Wraps the Background Sync API (navigator.serviceWorker + SyncManager)
 * with namespaced tag helpers and graceful fallback for environments that
 * do not support the API.
 *
 * See: https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API
 */

// ── Namespace prefix ───────────────────────────────────────────────────────

const TAG_PREFIX = "wedding/";

// ── API availability ───────────────────────────────────────────────────────

/**
 * Returns true if the one-shot Background Sync API is available.
 * @returns {boolean}
 */
export function isBgSyncSupported() {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof ServiceWorkerRegistration !== "undefined" &&
    "sync" in ServiceWorkerRegistration.prototype
  );
}

/**
 * Returns true if the Periodic Background Sync API is available.
 * @returns {boolean}
 */
export function isPeriodicSyncSupported() {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof ServiceWorkerRegistration !== "undefined" &&
    "periodicSync" in ServiceWorkerRegistration.prototype
  );
}

// ── Tag helpers ────────────────────────────────────────────────────────────

/**
 * Builds a namespaced Background Sync tag.
 * @param {string} key  Logical operation key (e.g. "guest_update")
 * @param {string} [id] Optional record ID to scope the tag further
 * @returns {string}
 */
export function buildSyncTag(key, id) {
  return id ? `${TAG_PREFIX}${key}/${id}` : `${TAG_PREFIX}${key}`;
}

/**
 * Parses a sync tag back into { key, id? }.
 * Returns null if the tag does not have the wedding prefix.
 * @param {string} tag
 * @returns {{ key: string; id?: string } | null}
 */
export function parseSyncTag(tag) {
  if (!tag.startsWith(TAG_PREFIX)) return null;
  const rest = tag.slice(TAG_PREFIX.length);
  const slashIdx = rest.indexOf("/");
  if (slashIdx === -1) return { key: rest };
  return { key: rest.slice(0, slashIdx), id: rest.slice(slashIdx + 1) };
}

// ── One-shot sync ──────────────────────────────────────────────────────────

/**
 * Registers a one-shot Background Sync with the given tag.
 * If no registration is provided, uses the current service worker registration.
 * Resolves silently if the API is not supported (graceful degradation).
 * @param {string} tag
 * @param {ServiceWorkerRegistration} [registration]
 * @returns {Promise<void>}
 */
export async function registerSync(tag, registration) {
  if (!isBgSyncSupported()) return;
  const reg = registration ?? (await navigator.serviceWorker.ready);
  await reg.sync.register(tag);
}

/**
 * Returns the list of pending one-shot sync tags.
 * Returns an empty array if the API is unavailable.
 * @param {ServiceWorkerRegistration} [registration]
 * @returns {Promise<string[]>}
 */
export async function getPendingSyncs(registration) {
  if (!isBgSyncSupported()) return [];
  const reg = registration ?? (await navigator.serviceWorker.ready);
  const tags = await reg.sync.getTags();
  return tags;
}

// ── Periodic sync ─────────────────────────────────────────────────────────

/**
 * Registers a periodic Background Sync with the given tag and minimum interval.
 * @param {string} tag
 * @param {number} minIntervalMs Minimum interval between syncs in milliseconds
 * @param {ServiceWorkerRegistration} [registration]
 * @returns {Promise<void>}
 */
export async function registerPeriodicSync(tag, minIntervalMs, registration) {
  if (!isPeriodicSyncSupported()) return;
  const reg = registration ?? (await navigator.serviceWorker.ready);
  await reg.periodicSync.register(tag, { minInterval: minIntervalMs });
}

/**
 * Unregisters a periodic Background Sync tag.
 * @param {string} tag
 * @param {ServiceWorkerRegistration} [registration]
 * @returns {Promise<void>}
 */
export async function unregisterPeriodicSync(tag, registration) {
  if (!isPeriodicSyncSupported()) return;
  const reg = registration ?? (await navigator.serviceWorker.ready);
  await reg.periodicSync.unregister(tag);
}

/**
 * Returns all registered periodic sync tags.
 * Returns an empty array if the API is unavailable.
 * @param {ServiceWorkerRegistration} [registration]
 * @returns {Promise<string[]>}
 */
export async function getPeriodicSyncs(registration) {
  if (!isPeriodicSyncSupported()) return [];
  const reg = registration ?? (await navigator.serviceWorker.ready);
  const entries = await reg.periodicSync.getTags();
  return entries;
}

// ── Convenience helpers ────────────────────────────────────────────────────

/**
 * Convenience: registers a namespaced one-shot sync for a data key.
 * @param {string} key  e.g. "guests" | "vendors" | "expenses"
 * @param {string} [id] Optional record id
 * @param {ServiceWorkerRegistration} [registration]
 * @returns {Promise<void>}
 */
export async function enqueueSync(key, id, registration) {
  const tag = buildSyncTag(key, id);
  await registerSync(tag, registration);
}
