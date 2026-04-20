/**
 * storage-quota.js — Storage quota detection and reporting (Phase 1.3)
 *
 * Detects available storage capacity, reports localStorage usage,
 * and provides human-readable size formatting.
 *
 * Pure functions where possible; async functions wrap the Storage API.
 * No DOM interaction, no module-level state.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Threshold (fraction of quota) above which storage is considered critical. */
const DEFAULT_CRITICAL_THRESHOLD = 0.85;

/** localStorage key prefix for this app — used to measure project-owned keys. */
const APP_KEY_PREFIX = 'wedding_v1_';

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

/**
 * Format a byte count into a human-readable string (B / KB / MB / GB).
 * @param {number} bytes
 * @param {number} [decimals=1]
 * @returns {string}
 */
export function formatStorageSize(bytes, decimals = 1) {
  if (bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(decimals)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(decimals)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(decimals)} GB`;
}

// ---------------------------------------------------------------------------
// localStorage analysis
// ---------------------------------------------------------------------------

/**
 * Calculate the approximate byte size of a string (UTF-16 → 2 bytes/char).
 * @param {string} str
 * @returns {number}
 */
function _strBytes(str) {
  return str.length * 2;
}

/**
 * Get the total byte size used by all localStorage entries.
 * @param {Storage} [storage]  Defaults to `localStorage`
 * @returns {number}
 */
export function getLocalStorageSize(storage = localStorage) {
  let total = 0;
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key !== null) {
      total += _strBytes(key) + _strBytes(storage.getItem(key) ?? '');
    }
  }
  return total;
}

/**
 * Count the number of entries in localStorage (optionally filtered by prefix).
 * @param {string} [prefix]  Only count keys starting with this prefix
 * @param {Storage} [storage]
 * @returns {number}
 */
export function getLocalStorageCount(prefix, storage = localStorage) {
  if (!prefix) return storage.length;
  let count = 0;
  for (let i = 0; i < storage.length; i++) {
    if ((storage.key(i) ?? '').startsWith(prefix)) count++;
  }
  return count;
}

/**
 * Get byte usage for only the app's own localStorage keys.
 * @param {Storage} [storage]
 * @returns {number}
 */
export function getAppStorageSize(storage = localStorage) {
  let total = 0;
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key !== null && key.startsWith(APP_KEY_PREFIX)) {
      total += _strBytes(key) + _strBytes(storage.getItem(key) ?? '');
    }
  }
  return total;
}

/**
 * Return a per-key breakdown of localStorage usage.
 * @param {string} [prefix]  Only include keys starting with this prefix
 * @param {Storage} [storage]
 * @returns {Array<{ key: string, bytes: number }>} Sorted largest-first
 */
export function getLocalStorageBreakdown(prefix, storage = localStorage) {
  const entries = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key !== null && (!prefix || key.startsWith(prefix))) {
      entries.push({ key, bytes: _strBytes(key) + _strBytes(storage.getItem(key) ?? '') });
    }
  }
  return entries.sort((a, b) => b.bytes - a.bytes);
}

// ---------------------------------------------------------------------------
// StorageManager / navigator.storage
// ---------------------------------------------------------------------------

/**
 * Estimate storage quota and usage via the Storage API.
 * Falls back to null values if the API is unavailable.
 *
 * @returns {Promise<{ usage: number | null, quota: number | null, usageFraction: number | null }>}
 */
export async function getStorageEstimate() {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return { usage: null, quota: null, usageFraction: null };
  }
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    const usageFraction = quota > 0 ? usage / quota : null;
    return { usage, quota, usageFraction };
  } catch {
    return { usage: null, quota: null, usageFraction: null };
  }
}

/**
 * Check whether the Storage API is available.
 * @returns {boolean}
 */
export function isStorageApiAvailable() {
  return typeof navigator !== 'undefined' && typeof navigator.storage?.estimate === 'function';
}

/**
 * Determine whether storage usage is above the critical threshold.
 * Uses the Storage API if available; falls back to a rough localStorage estimate.
 *
 * @param {number} [threshold]  Fraction (0–1) above which storage is critical
 * @returns {Promise<boolean>}
 */
export async function isStorageCritical(threshold = DEFAULT_CRITICAL_THRESHOLD) {
  const { usageFraction } = await getStorageEstimate();
  if (usageFraction !== null) return usageFraction >= threshold;

  // Rough fallback: localStorage cap is typically 5 MB
  const ESTIMATED_QUOTA = 5 * 1024 * 1024;
  const used = getLocalStorageSize();
  return used / ESTIMATED_QUOTA >= threshold;
}

// ---------------------------------------------------------------------------
// Persistence check
// ---------------------------------------------------------------------------

/**
 * Request persistent storage (if the API supports it).
 * Returns true if the browser granted persistence; false otherwise.
 * @returns {Promise<boolean>}
 */
export async function requestPersistentStorage() {
  if (typeof navigator === 'undefined' || typeof navigator.storage?.persist !== 'function') {
    return false;
  }
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/**
 * Check whether storage is already persisted.
 * @returns {Promise<boolean>}
 */
export async function isStoragePersisted() {
  if (typeof navigator === 'undefined' || typeof navigator.storage?.persisted !== 'function') {
    return false;
  }
  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Summary report
// ---------------------------------------------------------------------------

/**
 * @typedef {{ localStorageBytes: number, localStorageCount: number, appBytes: number,
 *             storageEstimate: { usage: number | null, quota: number | null, usageFraction: number | null },
 *             isCritical: boolean }} StorageReport
 */

/**
 * Collect a full storage usage report.
 * @param {Storage} [storage]
 * @returns {Promise<StorageReport>}
 */
export async function buildStorageReport(storage = localStorage) {
  const [storageEstimate, isCritical] = await Promise.all([
    getStorageEstimate(),
    isStorageCritical(DEFAULT_CRITICAL_THRESHOLD),
  ]);
  return {
    localStorageBytes: getLocalStorageSize(storage),
    localStorageCount: getLocalStorageCount(undefined, storage),
    appBytes: getAppStorageSize(storage),
    storageEstimate,
    isCritical,
  };
}
