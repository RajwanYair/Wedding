/**
 * src/services/sync-manager.js — Unified sync service (S190)
 *
 * Merged from:
 *   - sync-manager.js  (S161) — priority queue orchestrator
 *   - sync-tracker.js  (S170) — per-domain state tracker + dashboard
 */

import { storeSubscribe } from "../core/store.js";
import { STORE_DATA_CLASS } from "../core/constants.js";

// ── Sync manager (merged from sync-manager.js, S161) ─────────────────────

/** @typedef {{ key: string, fn: () => Promise<void>, retries: number, addedAt: number, lastError?: string }} SyncTask */

const MAX_RETRIES = 3;
const DEBOUNCE_MS = 300;

/** @type {Map<string, SyncTask>} */
const _queue = new Map();

/** @type {Set<string>} */
const _inFlight = new Set();

/** @type {Set<string>} */
const _failed = new Set();

/** @type {ReturnType<typeof setTimeout> | null} */
let _flushTimer = null;

/** @type {boolean} */
let _processing = false;

// ── Listeners ─────────────────────────────────────────────────────────────

/** @type {Set<(status: SyncStatus) => void>} */
const _listeners = new Set();

/**
 * @typedef {{
 *   queued: number,
 *   inFlight: number,
 *   failed: number,
 *   failedKeys: string[],
 * }} SyncStatus
 */

/** @returns {SyncStatus} */
export function getQueueStatus() {
  return {
    queued: _queue.size,
    inFlight: _inFlight.size,
    failed: _failed.size,
    failedKeys: Array.from(_failed),
  };
}

/**
 * @param {(status: SyncStatus) => void} fn
 * @returns {() => void} unsubscribe
 */
export function onSyncStatusChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function _notify() {
  const status = getSyncStatus();
  for (const fn of _listeners) fn(status);
}

// ── Core API ───────────────────────────────────────────────────────────────

/**
 * Enqueue a write task. If a task for the same key is already pending,
 * it is replaced (last-write-wins debounce).
 *
 * @param {string} key    - Domain key (e.g. "guests", "tables")
 * @param {() => Promise<void>} fn - Async write function
 */
export function enqueueSync(key, fn) {
  _queue.set(key, { key, fn, retries: 0, addedAt: Date.now() });
  _failed.delete(key); // Reset failure on new enqueue
  _scheduleFlush();
  _notify();
}

/**
 * Clear a failed key, allowing re-enqueue.
 * @param {string} key
 */
export function clearFailure(key) {
  _failed.delete(key);
  _notify();
}

/**
 * Immediately flush the queue, skipping debounce.
 * @returns {Promise<void>}
 */
export async function flushSync() {
  if (_flushTimer !== null) {
    clearTimeout(_flushTimer);
    _flushTimer = null;
  }
  await _processQueue();
}

/**
 * Get all keys currently pending in the queue.
 * @returns {string[]}
 */
export function getPendingKeys() {
  return Array.from(_queue.keys());
}

/**
 * Get all keys currently marked as failed.
 * @returns {string[]}
 */
export function getFailedKeys() {
  return Array.from(_failed);
}

// ── Internal ───────────────────────────────────────────────────────────────

function _scheduleFlush() {
  if (_flushTimer !== null) clearTimeout(_flushTimer);
  _flushTimer = setTimeout(() => {
    _flushTimer = null;
    _processQueue();
  }, DEBOUNCE_MS);
}

async function _processQueue() {
  if (_processing) return;
  _processing = true;

  try {
    const tasks = Array.from(_queue.values()).sort((a, b) => a.addedAt - b.addedAt);

    for (const task of tasks) {
      if (!_queue.has(task.key)) continue; // Was removed during processing

      _queue.delete(task.key);
      _inFlight.add(task.key);
      _notify();

      try {
        await task.fn();
        _inFlight.delete(task.key);
      } catch (err) {
        _inFlight.delete(task.key);
        task.retries += 1;
        task.lastError = err instanceof Error ? err.message : String(err);

        if (task.retries < MAX_RETRIES) {
          // Re-enqueue with exponential backoff
          const delay = Math.pow(2, task.retries) * 100;
          setTimeout(() => {
            if (!_queue.has(task.key)) {
              _queue.set(task.key, task);
              _scheduleFlush();
            }
          }, delay);
        } else {
          _failed.add(task.key);
        }
      }

      _notify();
    }
  } finally {
    _processing = false;
  }
}

/**
 * Reset queue/state for tests only.
 * @internal
 */
export function _resetForTesting() {
  _queue.clear();
  _inFlight.clear();
  _failed.clear();
  if (_flushTimer !== null) {
    clearTimeout(_flushTimer);
    _flushTimer = null;
  }
  _processing = false;
  _listeners.clear();
}

// ── Sync tracker (merged from sync-tracker.js, S170) ─────────────────────

/**
 * @type {Map<string, import('../types').SyncState>}
 */
const _states = new Map();

/** Listeners per key (including "*" for all keys). */
/** @type {Map<string, Set<(state: import('../types').SyncState) => void>>} */
const _trackerListeners = new Map();

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
  if (!_trackerListeners.has(key)) _trackerListeners.set(key, new Set());
  /** @type {Set<(state: import('../types').SyncState) => void>} */ (_trackerListeners.get(key)).add(fn);
  return () => _trackerListeners.get(key)?.delete(fn);
}

/**
 * Manually set the sync state for a key.
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
  _notifyTracker(key, updated);
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
function _notifyTracker(key, state) {
  _trackerListeners.get(key)?.forEach((fn) => {
    try {
      fn(state);
    } catch {}
  });
  _trackerListeners.get("*")?.forEach((fn) => {
    try {
      fn(state);
    } catch {}
  });
}

// ── Sync dashboard (inlined from sync-dashboard.js S170, S48) ────────────

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
 * @returns {SyncStatusSummary}
 */
export function getSyncStatus() {
  const states = getAllSyncStates();
  /** @type {SyncStatusSummary} */
  const summary = { pending: 0, syncing: 0, failed: 0, offline: 0, total: states.length, lastSync: null };
  let latestSyncMs = 0;
  for (const s of states) {
    if (s.status === "pending") summary.pending++;
    if (s.status === "syncing") summary.syncing++;
    if (s.status === "error") summary.failed++;
    if (s.status === "offline") summary.offline++;
    if (s.lastSyncAt) {
      const ms = new Date(s.lastSyncAt).getTime();
      if (ms > latestSyncMs) { latestSyncMs = ms; summary.lastSync = s.lastSyncAt; }
    }
  }
  return summary;
}

/**
 * Total number of pending writes across all domains.
 * @returns {number}
 */
export function getQueueDepth() {
  return getAllSyncStates().reduce((sum, s) => sum + (s.pendingWrites ?? 0), 0);
}

/**
 * ISO timestamp of the most recent successful sync, or null.
 * @returns {string|null}
 */
export function getLastSyncTime() {
  let latest = null;
  let latestMs = 0;
  for (const s of getAllSyncStates()) {
    if (s.lastSyncAt) {
      const ms = new Date(s.lastSyncAt).getTime();
      if (ms > latestMs) { latestMs = ms; latest = s.lastSyncAt; }
    }
  }
  return latest;
}

/**
 * True when there are no pending, syncing, failed, or offline domains.
 * @returns {boolean}
 */
export function isSyncHealthy() {
  const s = getSyncStatus();
  return s.pending === 0 && s.syncing === 0 && s.failed === 0 && s.offline === 0;
}

/**
 * List all domains that currently have failures.
 * @returns {string[]}
 */
export function getFailedDomains() {
  return getAllSyncStates().filter((s) => s.status === "error").map((s) => s.key);
}

/**
 * List all domains that have pending writes.
 * @returns {string[]}
 */
export function getPendingDomains() {
  return getAllSyncStates().filter((s) => (s.pendingWrites ?? 0) > 0).map((s) => s.key);
}
