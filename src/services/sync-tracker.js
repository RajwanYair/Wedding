/**
 * src/services/sync-tracker.js — Per-domain sync state tracker (Phase 2)
 * S170: Merged sync-dashboard.js (Sprint 48 sync health dashboard) into this file.
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
  return (
    _states.get(key) ?? { key, status: "idle", lastSyncAt: null, pendingWrites: 0, error: null }
  );
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
    try {
      fn(state);
    } catch {}
  });
  _listeners.get("*")?.forEach((fn) => {
    try {
      fn(state);
    } catch {}
  });
}

// ── S170 — Inlined from sync-dashboard.js (Sprint 48) ────────────────────

/**
 * @typedef {{
 *   pending: number,
 *   syncing: number,
 *   failed: number,
 *   offline: number,
 *   total: number,
 *   lastSync: string|null,
 * }} SyncStatusSummary
 */

/**
 * Aggregate all tracked domain states into a summary.
 *
 * @returns {SyncStatusSummary}
 */
export function getSyncStatus() {
  const states = getAllSyncStates();
  /** @type {SyncStatusSummary} */
  const summary = {
    pending: 0,
    syncing: 0,
    failed: 0,
    offline: 0,
    total: states.length,
    lastSync: null,
  };

  let latestSyncMs = 0;

  for (const s of states) {
    if (s.status === "pending") summary.pending++;
    if (s.status === "syncing") summary.syncing++;
    if (s.status === "error") summary.failed++;
    if (s.status === "offline") summary.offline++;

    if (s.lastSyncAt) {
      const ms = new Date(s.lastSyncAt).getTime();
      if (ms > latestSyncMs) {
        latestSyncMs = ms;
        summary.lastSync = s.lastSyncAt;
      }
    }
  }

  return summary;
}

/**
 * Total number of pending writes across all domains.
 *
 * @returns {number}
 */
export function getQueueDepth() {
  return getAllSyncStates().reduce((sum, s) => sum + (s.pendingWrites ?? 0), 0);
}

/**
 * ISO timestamp of the most recent successful sync, or null.
 *
 * @returns {string|null}
 */
export function getLastSyncTime() {
  let latest = null;
  let latestMs = 0;
  for (const s of getAllSyncStates()) {
    if (s.lastSyncAt) {
      const ms = new Date(s.lastSyncAt).getTime();
      if (ms > latestMs) {
        latestMs = ms;
        latest = s.lastSyncAt;
      }
    }
  }
  return latest;
}

/**
 * True when there are no pending, syncing, failed, or offline domains.
 *
 * @returns {boolean}
 */
export function isSyncHealthy() {
  const s = getSyncStatus();
  return s.pending === 0 && s.syncing === 0 && s.failed === 0 && s.offline === 0;
}

/**
 * Get sync state for a single domain key (delegate to sync-tracker).
 *
 * @param {string} key
 * @returns {import('../types').SyncState}
 */
export function getDomainSyncState(key) {
  return getSyncState(key);
}

/**
 * List all domains that currently have failures.
 *
 * @returns {string[]}
 */
export function getFailedDomains() {
  return getAllSyncStates()
    .filter((s) => s.status === "error")
    .map((s) => s.key);
}

/**
 * List all domains that have pending writes.
 *
 * @returns {string[]}
 */
export function getPendingDomains() {
  return getAllSyncStates()
    .filter((s) => (s.pendingWrites ?? 0) > 0)
    .map((s) => s.key);
}
