/**
 * src/core/store.js — Reactive store V3 (v15.0 — S400)
 *
 * Preact Signals-backed reactive store with:
 * - Per-key `signal()` for explicit, 0-config reactivity (no silent nested-mutation misses)
 * - `batch()` from @preact/signals-core for `storeBatch()` and `pauseNotifications()`
 * - Microtask-batched subscriber notifications (public API unchanged)
 * - `storeSubscribeScoped()` for auto-cleanup on section unmount
 * - Debounced localStorage / IDB persistence (unchanged)
 * - Multi-event namespacing (S9.1) via dynamic prefix from state.js
 * No window.* side effects — consumers import and call directly.
 */

import { signal, batch } from "@preact/signals-core";
import { STORAGE_PREFIX } from "./config.js";
import { getActiveEventId } from "./state.js";
import { isPiiKey, savePii } from "../services/compliance.js";
import { storageSet, getAdapterType } from "./storage.js";

/**
 * Per-key Preact Signals. Replaces the plain `_state` Record.
 * @type {Map<string, ReturnType<typeof signal>>}
 */
const _signals = new Map();

/** @type {Map<string, Set<Function>>} */
const _subs = new Map();

/** @type {Set<string> | null} */
let _notifyBatch = null;

/** @type {Map<string, string>} state-key → localStorage-key */
const _persistMap = new Map();

/** @type {Set<string>} */
const _dirty = new Set();


/** @type {ReturnType<typeof setTimeout> | null} */
let _saveTimer = null;

/** Base prefix */
const _BASE_PREFIX = STORAGE_PREFIX;

/**
 * Get the current storage prefix scoped to the active event.
 * @returns {string}
 */
function _prefix() {
  const eid = getActiveEventId();
  return eid === "default" ? _BASE_PREFIX : `${_BASE_PREFIX}evt_${eid}_`;
}

// ── Scoped subscription tracking ──────────────────────────────────────────

/**
 * Map of scope names → Set of unsubscribe functions.
 * When a scope is cleaned up, all its subscriptions are removed.
 * @type {Map<string, Set<() => void>>}
 */
const _scopedUnsubs = new Map();

// ── Batch / Pause state ───────────────────────────────────────────────────

/** When > 0, notifications are paused and keys are collected for deferred notify. */
let _pauseDepth = 0;
/** Keys that were mutated while notifications were paused. */
/** @type {Set<string>} */
const _pausedKeys = new Set();

// ── Subscribers ───────────────────────────────────────────────────────────

/**
 * Subscribe to a specific state key or all changes via "*".
 * @param {string} key
 * @param {Function} fn
 * @returns {() => void}  Unsubscribe function
 */
export function storeSubscribe(key, fn) {
  if (!_subs.has(key)) _subs.set(key, new Set());
  const _sub = /** @type {Set<Function>} */ (_subs.get(key));
  _sub.add(fn);
  return () => _subs.get(key)?.delete(fn);
}

/**
 * Subscribe to a store key, scoped to a section name.
 * When `cleanupScope(sectionName)` is called (e.g. on section unmount),
 * all subscriptions registered under that scope are automatically removed.
 *
 * @param {string} key        Store key to subscribe to (or "*")
 * @param {Function} fn       Callback
 * @param {string} scope      Scope name (typically the section name)
 * @returns {() => void}      Unsubscribe function (also callable manually)
 */
export function storeSubscribeScoped(key, fn, scope) {
  const unsub = storeSubscribe(key, fn);
  if (!_scopedUnsubs.has(scope)) _scopedUnsubs.set(scope, new Set());
  /** @type {Set<() => void>} */ (_scopedUnsubs.get(scope)).add(unsub);
  return unsub;
}

/**
 * Clean up all subscriptions for a given scope.
 * Call this in the section's `unmount()` function.
 * @param {string} scope
 */
export function cleanupScope(scope) {
  const unsubs = _scopedUnsubs.get(scope);
  if (unsubs) {
    unsubs.forEach((fn) => fn());
    unsubs.clear();
    _scopedUnsubs.delete(scope);
  }
}

/**
 * @param {string} key
 */
function _scheduleNotify(key) {
  // If notifications are paused (inside batch or manual pause), collect keys
  if (_pauseDepth > 0) {
    _pausedKeys.add(key);
    return;
  }
  if (_notifyBatch === null) {
    _notifyBatch = new Set();
    Promise.resolve().then(() => {
      const pending = _notifyBatch;
      _notifyBatch = null;
      pending?.forEach((k) => {
        const v = _sig(k, undefined).value;
        _subs.get(k)?.forEach((f) => {
          try {
            f(v);
          } catch {}
        });
        _subs.get("*")?.forEach((f) => {
          try {
            f(k, v);
          } catch {}
        });
      });
    });
  }
  /** @type {Set<string>} */ (_notifyBatch).add(key);
}

/**
 * Flush all deferred notifications collected during a pause.
 */
function _flushPausedNotifications() {
  if (_pausedKeys.size > 0) {
    const keys = [..._pausedKeys];
    _pausedKeys.clear();
    keys.forEach((k) => _scheduleNotify(k));
  }
}

// ── Persistence ───────────────────────────────────────────────────────────

/** @type {((key: string, err: unknown) => void) | null} */
const _onStorageError = null;

/** @param {string} key */
function _scheduleSave(key) {
  if (_persistMap.has(key)) _dirty.add(key);
  if (_saveTimer !== null) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(_flush, 250);
}

function _flush() {
  const pfx = _prefix();
  _dirty.forEach((key) => {
    const storageKey = _persistMap.get(key);
    if (!storageKey) return;
    if (isPiiKey(key)) {
      // PII keys: fire-and-forget encrypted write (S157)
      savePii(storageKey, _sig(key, undefined).value);
    } else {
      try {
        const serialised = JSON.stringify(_sig(key, undefined).value);
        // S393: Route writes through storage.js (IDB primary, LS fallback).
        // Async fire-and-forget — sync localStorage fallback guards data safety.
        if (getAdapterType() === "indexeddb") {
          storageSet(pfx + storageKey, serialised).catch((err) => {
            console.warn(`[store] IDB persist failed for "${key}", falling back to localStorage:`, err);
            try { localStorage.setItem(pfx + storageKey, serialised); } catch { /* best-effort */ }
          });
        } else {
          localStorage.setItem(pfx + storageKey, serialised);
        }
      } catch (err) {
        console.warn(`[store] Failed to persist "${key}":`, err);
        _onStorageError?.(key, err);
      }
    }
  });
  _dirty.clear();
  _saveTimer = null;
}

// Flush pending writes before the page unloads to prevent data loss
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", _flush);
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Get or create the signal for a given key.
 * @param {string} key
 * @param {unknown} [defaultVal]
 * @returns {ReturnType<typeof signal>}
 */
function _sig(key, defaultVal) {
  if (!_signals.has(key)) _signals.set(key, signal(defaultVal));
  return /** @type {ReturnType<typeof signal>} */ (_signals.get(key));
}

/**
 * Initialise the store. Call once after state has been loaded from localStorage.
 * @param {Record<string, { value: unknown, storageKey?: string }>} defs
 */
export function initStore(defs) {
  for (const [key, { value, storageKey }] of Object.entries(defs)) {
    _sig(key, value).value = value;
    if (storageKey) _persistMap.set(key, storageKey);
  }
}

/**
 * Get a state value.
 * @param {string} key
 * @returns {unknown}
 */
export function storeGet(key) {
  return _sig(key, undefined).value;
}

/**
 * Set a state value and notify subscribers.
 * @param {string} key
 * @param {unknown} value
 */
export function storeSet(key, value) {
  _sig(key, value).value = value;
  _scheduleNotify(key);
  _scheduleSave(key);
}

/**
 * Force-flush any pending saves to localStorage immediately.
 */
export function storeFlush() {
  _flush();
}

/**
 * Execute a callback with all store notifications deferred until completion.
 * Uses @preact/signals-core `batch()` — multiple mutations trigger one notification pass.
 *
 * @param {() => void} fn  Synchronous function performing store mutations
 */
export function storeBatch(fn) {
  // Pause our own microtask notifications, then flush after batch commits.
  _pauseDepth++;
  try {
    batch(fn);
  } finally {
    _pauseDepth--;
    if (_pauseDepth === 0) {
      _flushPausedNotifications();
    }
  }
}

/**
 * Pause all subscriber notifications. Pair with `resumeNotifications()`.
 * Supports nesting — notifications resume only when depth returns to 0.
 */
export function pauseNotifications() {
  _pauseDepth++;
}

/**
 * Resume subscriber notifications after a `pauseNotifications()` call.
 * Flushes all deferred notifications when the outermost pause ends.
 */
export function resumeNotifications() {
  if (_pauseDepth > 0) _pauseDepth--;
  if (_pauseDepth === 0) {
    _flushPausedNotifications();
  }
}

/**
 * Debug utility — returns diagnostic info about the store.
 * @returns {{ keys: string[], subscriberCount: Record<string, number>, dirtyKeys: string[], scopeCount: number }}
 */
export function storeDebug() {
  /** @type {Record<string, number>} */
  const subscriberCount = {};
  _subs.forEach((fns, key) => {
    subscriberCount[key] = fns.size;
  });
  return {
    keys: [..._signals.keys()],
    subscriberCount,
    dirtyKeys: [..._dirty],
    scopeCount: _scopedUnsubs.size,
  };
}

/**
 * Re-initialise the store with new definitions (S9.1 event switch).
 * Flushes pending writes for the OLD event, then reloads all keys.
 * @param {Record<string, { value: unknown, storageKey?: string }>} defs
 */
export function reinitStore(defs) {
  // flush any pending writes to the OLD event before switching
  _flush();
  // clear subscriptions and state — subscribers will re-register on section mount
  _signals.clear();
  _persistMap.clear();
  _dirty.clear();
  // reinitialise with new data
  for (const [key, { value, storageKey }] of Object.entries(defs)) {
    _sig(key, value).value = value;
    if (storageKey) _persistMap.set(key, storageKey);
  }
  // notify all subscribers that data has changed
  for (const key of _signals.keys()) {
    _scheduleNotify(key);
  }
}

// ── Immutable update helpers (Phase 2) ───────────────────────────────────

/**
 * Get multiple store values in one call.
 * @param {string[]} keys
 * @returns {Record<string, unknown>}
 */
export function storeGetBatch(keys) {
  /** @type {Record<string, unknown>} */
  const result = {};
  for (const key of keys) {
    result[key] = _sig(key, undefined).value;
  }
  return result;
}

/**
 * Immutably update an item with a matching `id` inside an array stored at `key`.
 * Returns the updated item. Throws if the item is not found.
 *
 * @template {{ id: string }} T
 * @param {string} key    Store key containing an array of objects with `id`
 * @param {string} id     ID of the item to update
 * @param {Partial<T>} patch  Fields to apply (shallow merge)
 * @returns {T} Updated item
 */
export function storeUpdate(key, id, patch) {
  const arr = /** @type {T[]} */ (_sig(key, undefined).value);
  if (!Array.isArray(arr)) throw new TypeError(`storeUpdate: store["${key}"] is not an array`);
  const idx = arr.findIndex((item) => item.id === id);
  if (idx === -1) throw new RangeError(`storeUpdate: id "${id}" not found in store["${key}"]`);
  const updated = /** @type {T} */ ({ ...arr[idx], ...patch, id });
  const next = [...arr];
  next[idx] = updated;
  storeSet(key, next);
  return updated;
}

/**
 * Immutably create or update an item in an array stored at `key`.
 * If an item with the same `id` exists, it is shallow-merged; otherwise it is appended.
 *
 * @template {{ id: string }} T
 * @param {string} key   Store key containing an array of objects with `id`
 * @param {T} item       Item to upsert
 * @returns {T} The upserted item
 */
export function storeUpsert(key, item) {
  const arr = /** @type {T[]} */ (_sig(key, undefined).value);
  if (!Array.isArray(arr)) throw new TypeError(`storeUpsert: store["${key}"] is not an array`);
  const idx = arr.findIndex((i) => i.id === item.id);
  if (idx === -1) {
    storeSet(key, [...arr, item]);
  } else {
    const updated = /** @type {T} */ ({ ...arr[idx], ...item });
    const next = [...arr];
    next[idx] = updated;
    storeSet(key, next);
  }
  return item;
}

/**
 * Immutably remove an item by `id` from an array stored at `key`.
 * No-op if the item is not found.
 *
 * @param {string} key   Store key containing an array of objects with `id`
 * @param {string} id    ID of the item to remove
 * @returns {boolean}    true if an item was removed, false otherwise
 */
export function storeRemove(key, id) {
  const arr = /** @type {{ id: string }[]} */ (_sig(key, undefined).value);
  if (!Array.isArray(arr)) return false;
  const filtered = arr.filter((item) => item.id !== id);
  if (filtered.length === arr.length) return false;
  storeSet(key, filtered);
  return true;
}

// ── Sprint 13 additions ───────────────────────────────────────────────────

/**
 * Subscribe to a store key for exactly one notification, then auto-unsubscribe.
 * Useful for one-shot reactions such as "wait for this key to be hydrated".
 *
 * @param {string} key       Store key (or "*")
 * @param {Function} fn      Callback (called once)
 * @returns {() => void}     Cancel function (no-op once already fired)
 */
export function storeSubscribeOnce(key, fn) {
  const unsub = storeSubscribe(key, (/** @type {unknown} */ value) => {
    unsub();
    fn(value);
  });
  return unsub;
}

/**
 * Execute an async function with all store notifications paused until
 * the promise resolves or rejects. Prevents intermediate state renders
 * during multi-step async mutations.
 *
 * @param {() => Promise<void>} fn   Async function performing store mutations
 * @returns {Promise<void>}
 */
export async function storeBatchAsync(fn) {
  _pauseDepth++;
  try {
    await fn();
  } finally {
    _pauseDepth--;
    if (_pauseDepth === 0) {
      _flushPausedNotifications();
    }
  }
}

/**
 * Return detailed subscriber statistics for monitoring and leak detection.
 * Maps key → subscriber count; includes total across all keys.
 *
 * @returns {{ perKey: Record<string, number>, total: number, scopes: number }}
 */
export function getSubscriberStats() {
  /** @type {Record<string, number>} */
  const perKey = {};
  let total = 0;
  _subs.forEach((fns, key) => {
    const count = fns.size;
    perKey[key] = count;
    total += count;
  });
  return { perKey, total, scopes: _scopedUnsubs.size };
}

/**
 * Return the number of active subscriptions registered under a scope,
 * or the total across all scopes when no scope is provided.
 *
 * @param {string} [scope]
 * @returns {number}
 */
export function getSubscriptionCount(scope) {
  if (scope !== undefined) {
    return _scopedUnsubs.get(scope)?.size ?? 0;
  }
  let total = 0;
  _scopedUnsubs.forEach((set) => {
    total += set.size;
  });
  return total;
}
