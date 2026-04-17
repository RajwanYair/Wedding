/**
 * src/services/sync-tracker.js — Per-domain sync state tracker (Phase 2)
 *
 * Exposes `SyncState` for each store domain key so the UI can show
 * precise sync health (idle/syncing/pending/error/offline) per domain
 * rather than a single global "syncing" flag.
 *
 * Wires into sheets.js `onSyncStatus` and store subscriptions to derive
 * the state automatically.
 *
 * Usage:
 *   import { getSyncState, watchSyncState, setSyncState } from "../services/sync-tracker.js";
 *   const state = getSyncState("guests");  // → { key, status, lastSyncAt, pendingWrites, error }
 */

import { storeSubscribe } from "../core/store.js";
import { STORE_DATA_CLASS } from "../core/constants.js";

// ── Internal state ────────────────────────────────────────────────────────

/**
 * @type {Map<string, import('../types').SyncState>}
 */
const _states = new Map();

/** Listeners per key (including "*" for all keys). */
/** @type {Map<string, Set<(state: import('../types').SyncState) => void>>} */
const _listeners = new Map();

/** Keys that have enqueued writes not yet flushed. */
/** @type {Map<string, number>} key → pending count */
const _pendingCounts = new Map();

// ── Initialisation ────────────────────────────────────────────────────────

/**
 * Initialise the sync tracker for all known store keys.
 * Call once at app startup after store is initialised.
 * @param {string[]} keys  Store domain keys to track
 */
export function initSyncTracker(keys) {
  for (const key of keys) {
    _states.set(key, {
      key,
      status: "idle",
      lastSyncAt: null,
      pendingWrites: 0,
      error: null,
    });
    // Watch for store mutations → mark as pending
    storeSubscribe(key, () => {
      if (_getClassification(key) !== "operational") {
        _incrementPending(key);
      }
    });
  }
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Get current sync state for a domain key.
 * @param {string} key
 * @returns {import('../types').SyncState}
 */
export function getSyncState(key) {
  return _states.get(key) ?? { key, status: "idle", lastSyncAt: null, pendingWrites: 0, error: null };
}

/**
 * Get sync states for all tracked keys.
 * @returns {import('../types').SyncState[]}
 */
export function getAllSyncStates() {
  return [..._states.values()];
}

/**
 * Subscribe to sync state changes for a specific key or all keys ("*").
 * @param {string} key
 * @param {(state: import('../types').SyncState) => void} fn
 * @returns {() => void} Unsubscribe function
 */
export function watchSyncState(key, fn) {
  if (!_listeners.has(key)) _listeners.set(key, new Set());
  /** @type {Set<(state: import('../types').SyncState) => void>} */ (_listeners.get(key)).add(fn);
  return () => _listeners.get(key)?.delete(fn);
}

/**
 * Manually set the sync state for a key.
 * Called by sheets.js / supabase.js after writes complete.
 * @param {string} key
 * @param {Partial<import('../types').SyncState>} patch
 */
export function setSyncState(key, patch) {
  const current = getSyncState(key);
  const updated = /** @type {import('../types').SyncState} */ ({
    ...current,
    ...patch,
    key,
  });
  if (patch.status === "idle") {
    updated.pendingWrites = 0;
  }
  _states.set(key, updated);
  _notify(key, updated);
}

/**
 * Mark a domain key as currently syncing.
 * @param {string} key
 */
export function markSyncing(key) {
  setSyncState(key, { status: "syncing", error: null });
}

/**
 * Mark a domain key as successfully synced.
 * @param {string} key
 */
export function markSynced(key) {
  setSyncState(key, {
    status: "idle",
    lastSyncAt: new Date().toISOString(),
    error: null,
  });
}

/**
 * Mark a domain key as having a sync error.
 * @param {string} key
 * @param {string} error
 */
export function markSyncError(key, error) {
  setSyncState(key, { status: "error", error });
}

/**
 * Mark all tracked keys as offline.
 * Called when navigator.onLine becomes false.
 */
export function markAllOffline() {
  for (const key of _states.keys()) {
    const current = _states.get(key);
    if (current && current.status !== "offline") {
      setSyncState(key, { status: "offline", error: null });
    }
  }
}

/**
 * Restore all offline keys to pending (when connection returns).
 */
export function markAllOnline() {
  for (const key of _states.keys()) {
    const current = _states.get(key);
    if (current?.status === "offline") {
      const hasPending = (current.pendingWrites ?? 0) > 0;
      setSyncState(key, { status: hasPending ? "pending" : "idle", error: null });
    }
  }
}

/**
 * Get the data classification for a store key.
 * @param {string} key
 * @returns {string}
 */
export function getDataClass(key) {
  return _getClassification(key);
}

// ── Internal helpers ──────────────────────────────────────────────────────

/** @param {string} key */
function _getClassification(key) {
  return /** @type {Record<string,string>} */ (STORE_DATA_CLASS)[key] ?? "operational";
}

/** @param {string} key */
function _incrementPending(key) {
  const current = getSyncState(key);
  if (current.status === "idle" || current.status === "error") {
    setSyncState(key, {
      status: "pending",
      pendingWrites: (current.pendingWrites ?? 0) + 1,
    });
  } else {
    setSyncState(key, {
      pendingWrites: (current.pendingWrites ?? 0) + 1,
    });
  }
}

/**
 * @param {string} key
 * @param {import('../types').SyncState} state
 */
function _notify(key, state) {
  _listeners.get(key)?.forEach((fn) => {
    try { fn(state); } catch {}
  });
  _listeners.get("*")?.forEach((fn) => {
    try { fn(state); } catch {}
  });
}
