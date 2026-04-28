/**
 * src/services/pii-storage.js — PII-aware storage helpers (S157)
 *
 * Bridges the reactive store with AES-GCM encrypted storage for PII keys.
 * Uses the data-class map in constants.js to decide which keys need encryption.
 *
 * - `isPiiKey(key)` — true for admin-sensitive or guest-private keys
 * - `savePii(key, value)` — fire-and-forget encrypted write
 * - `loadPii(key, fallback)` — encrypted read with plaintext migration
 * - `migratePlaintextPii(persistMap)` — one-shot bulk migration
 */

import { STORE_DATA_CLASS, DATA_CLASS } from "../core/constants.js";
import { STORAGE_PREFIX } from "../core/config.js";
import { getActiveEventId } from "../core/state.js";
import { setSecure, getSecure } from "./secure-storage.js";

/** Classes that require encryption at rest */
const _ENCRYPTED_CLASSES = new Set([DATA_CLASS.ADMIN_SENSITIVE, DATA_CLASS.GUEST_PRIVATE]);

/**
 * Check if a store key holds PII and should be encrypted.
 * @param {string} key  Store domain key (e.g. "guests", "vendors")
 * @returns {boolean}
 */
export function isPiiKey(key) {
  return _ENCRYPTED_CLASSES.has(/** @type {any} */ (STORE_DATA_CLASS[key]));
}

/**
 * Storage prefix scoped to the active event, matching state.js logic.
 * @returns {string}
 */
function _prefix() {
  const eid = getActiveEventId();
  return eid === "default" ? STORAGE_PREFIX : `${STORAGE_PREFIX}evt_${eid}_`;
}

/**
 * Full localStorage key for a store domain (matches store.js naming).
 * @param {string} storageKey
 * @returns {string}
 */
function _fullKey(storageKey) {
  return _prefix() + storageKey;
}

/**
 * Encrypt and persist a PII value. Fire-and-forget — errors are silenced.
 * @param {string} storageKey  Storage key (without prefix, e.g. "guests")
 * @param {unknown} value
 */
export function savePii(storageKey, value) {
  const secureKey = `enc_${_fullKey(storageKey)}`;
  setSecure(secureKey, value).catch(() => {});
}

/**
 * Load a PII value: try encrypted storage first, then fall back to
 * plaintext localStorage (one-shot migration path). On a successful
 * plaintext read the value is re-encrypted and the plaintext entry
 * is removed.
 *
 * @template T
 * @param {string} storageKey  Storage key (without prefix, e.g. "guests")
 * @param {T} fallback
 * @returns {Promise<T>}
 */
export async function loadPii(storageKey, fallback) {
  const secureKey = `enc_${_fullKey(storageKey)}`;
  const encrypted = await getSecure(secureKey).catch(() => null);
  if (encrypted !== null && encrypted !== undefined) {
    return /** @type {T} */ (encrypted);
  }

  // Plaintext fallback + migration
  const fullKey = _fullKey(storageKey);
  try {
    const raw = localStorage.getItem(fullKey);
    if (raw === null) return fallback;
    const parsed = /** @type {T} */ (JSON.parse(raw));
    // Migrate: write encrypted, remove plaintext
    setSecure(secureKey, parsed).catch(() => {});
    try {
      localStorage.removeItem(fullKey);
    } catch {
      /* ignore */
    }
    return parsed;
  } catch {
    return fallback;
  }
}

/**
 * Migrate all PII keys from plaintext to encrypted storage in one pass.
 * Safe to call multiple times — only migrates keys that still exist
 * in plaintext and don't have an encrypted counterpart.
 *
 * @param {Map<string, string>} persistMap  state-key → storageKey map
 * @returns {Promise<number>} Number of keys migrated
 */
export async function migratePlaintextPii(persistMap) {
  let migrated = 0;
  for (const [stateKey, storageKey] of persistMap) {
    if (!isPiiKey(stateKey)) continue;
    const secureKey = `enc_${_fullKey(storageKey)}`;
    const existing = await getSecure(secureKey).catch(() => null);
    if (existing !== null && existing !== undefined) continue;

    const fullKey = _fullKey(storageKey);
    try {
      const raw = localStorage.getItem(fullKey);
      if (raw === null) continue;
      const parsed = JSON.parse(raw);
      await setSecure(secureKey, parsed);
      localStorage.removeItem(fullKey);
      migrated++;
    } catch {
      /* skip broken entries */
    }
  }
  return migrated;
}
