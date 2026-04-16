/**
 * src/core/store.js — Reactive store (S0 named-export module)
 *
 * ES module version of js/store.js. Provides a Proxy-based reactive store
 * with debounced localStorage persistence and subscriber notifications.
 * Supports multi-event namespacing (S9.1) via dynamic prefix from state.js.
 * No window.* side effects — consumers import and call directly.
 */

import { getActiveEventId } from "./state.js";

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

/** @type {Record<string, unknown>} */
const _state = {};

/** Base prefix */
const _BASE_PREFIX = "wedding_v1_";

/**
 * Get the current storage prefix scoped to the active event.
 * @returns {string}
 */
function _prefix() {
  const eid = getActiveEventId();
  return eid === "default" ? _BASE_PREFIX : `${_BASE_PREFIX}evt_${eid}_`;
}

// ── Subscribers ───────────────────────────────────────────────────────────

/**
 * Subscribe to a specific state key or all changes via "*".
 * @param {string} key
 * @param {Function} fn
 * @returns {() => void}  Unsubscribe function
 */
export function storeSubscribe(key, fn) {
  if (!_subs.has(key)) _subs.set(key, new Set());
  _subs.get(key).add(fn);
  return () => _subs.get(key)?.delete(fn);
}

function _scheduleNotify(key) {
  if (_notifyBatch === null) {
    _notifyBatch = new Set();
    Promise.resolve().then(() => {
      const batch = _notifyBatch;
      _notifyBatch = null;
      batch?.forEach((k) => {
        _subs.get(k)?.forEach((f) => {
          try {
            f(_state[k]);
          } catch {}
        });
        _subs.get("*")?.forEach((f) => {
          try {
            f(k, _state[k]);
          } catch {}
        });
      });
    });
  }
  _notifyBatch.add(key);
}

// ── Persistence ───────────────────────────────────────────────────────────

/** @type {((key: string, err: unknown) => void) | null} */
let _onStorageError = null;

/**
 * Register a callback invoked when localStorage persistence fails (F1.5.5).
 * Useful for surfacing quota errors in the UI or triggering cleanup.
 * @param {(key: string, err: unknown) => void} fn
 */
export function onStorageError(fn) {
  _onStorageError = fn;
}

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
    try {
      localStorage.setItem(pfx + storageKey, JSON.stringify(_state[key]));
    } catch (err) {
      console.warn(`[store] Failed to persist "${key}":`, err);
      _onStorageError?.(key, err);
    }
  });
  _dirty.clear();
  _saveTimer = null;
}

// Flush pending writes before the page unloads to prevent data loss
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", _flush);
}

// ── Proxy factory ─────────────────────────────────────────────────────────

/**
 * Create a reactive proxy for a state value.
 * @template T
 * @param {string} key     Property name in the state object
 * @param {T} initial      Initial value
 * @returns {T}
 */
function _reactive(key, initial) {
  if (Array.isArray(initial)) {
    return /** @type {T} */ (
      new Proxy(initial, {
        set(target, prop, value) {
          target[/** @type {any} */ (prop)] = value;
          _scheduleNotify(key);
          _scheduleSave(key);
          return true;
        },
      })
    );
  }
  return initial;
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Initialise the store. Call once after state has been loaded from localStorage.
 * @param {Record<string, { value: unknown, storageKey?: string }>} defs
 */
export function initStore(defs) {
  for (const [key, { value, storageKey }] of Object.entries(defs)) {
    _state[key] = _reactive(key, value);
    if (storageKey) _persistMap.set(key, storageKey);
  }
}

/**
 * Get a state value.
 * @param {string} key
 * @returns {unknown}
 */
export function storeGet(key) {
  return _state[key];
}

/**
 * Set a state value and notify subscribers.
 * @param {string} key
 * @param {unknown} value
 */
export function storeSet(key, value) {
  _state[key] = _reactive(key, value);
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
 * Re-initialise the store with new definitions (S9.1 event switch).
 * Flushes pending writes for the OLD event, then reloads all keys.
 * @param {Record<string, { value: unknown, storageKey?: string }>} defs
 */
export function reinitStore(defs) {
  // flush any pending writes to the OLD event before switching
  _flush();
  // clear subscriptions and state — subscribers will re-register on section mount
  for (const key of Object.keys(_state)) {
    delete _state[key];
  }
  _persistMap.clear();
  _dirty.clear();
  // reinitialise with new data
  for (const [key, { value, storageKey }] of Object.entries(defs)) {
    _state[key] = _reactive(key, value);
    if (storageKey) _persistMap.set(key, storageKey);
  }
  // notify all subscribers that data has changed
  for (const key of Object.keys(_state)) {
    _scheduleNotify(key);
  }
}
