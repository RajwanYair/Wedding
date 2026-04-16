/**
 * src/services/sheets.js — Sync facade (S3.10 backend-agnostic)
 *
 * Public API consumed by all section modules.
 * Owns the write queue, debounce, retry, and status management.
 * Actual backend I/O is delegated to backend.js → sheets-impl / supabase.
 *
 * Sections continue to `import { enqueueWrite, syncStoreKeyToSheets } from "../services/sheets.js"`.
 */

import { DEBOUNCE_MS } from "../core/config.js";
import { storageGet, storageSet, storageRemove } from "../core/storage.js";
import {
  syncStoreKey,
  appendRsvpLog,
  checkConnection,
  createMissingTabs,
  pullAll,
  pushAll,
  getBackendType,
} from "./backend.js";

/** @type {Map<string, { syncFn: () => Promise<void>, timer: ReturnType<typeof setTimeout> | null }>} */
const _queue = new Map();

/** @type {'idle'|'syncing'|'synced'|'error'} */
let _syncStatus = "idle";

/** @type {((status: 'idle'|'syncing'|'synced'|'error') => void) | null} */
let _onStatusChange = null;

/**
 * Register a status-change listener.
 * @param {(status: 'idle'|'syncing'|'synced'|'error') => void} fn
 */
export function onSyncStatus(fn) {
  _onStatusChange = fn;
}

function _setStatus(s) {
  _syncStatus = s;
  _onStatusChange?.(s);
}

/**
 * Return current sync status.
 * @returns {'idle'|'syncing'|'synced'|'error'}
 */
export function syncStatus() {
  return _syncStatus;
}

/**
 * Enqueue a debounced write operation. Coalesces per `key`.
 * @param {string} key       Unique key per data type (e.g. 'guests', 'vendors')
 * @param {() => Promise<void>} syncFn  Async function that performs the actual POST
 */
export function enqueueWrite(key, syncFn) {
  const existing = _queue.get(key);
  if (existing?.timer) clearTimeout(existing.timer);
  const timer = setTimeout(() => _flush(key), DEBOUNCE_MS);
  _queue.set(key, { syncFn, timer });
  _persistQueueKeys().catch(() => {});
}

/** @type {Map<string, number>} track retry count per key */
const _retryCount = new Map();

/** Maximum retry attempts before giving up */
const _MAX_RETRIES = 4;
/** Base delay in ms for exponential backoff */
const _BACKOFF_BASE_MS = 2000;

async function _flush(key) {
  const entry = _queue.get(key);
  if (!entry) return;
  _queue.delete(key);
  _persistQueueKeys().catch(() => {});
  _setStatus("syncing");
  try {
    await entry.syncFn();
    _retryCount.delete(key);
    _setStatus("synced");
    // Reset to idle after a short confirmation window
    setTimeout(() => {
      if (_syncStatus === "synced" && _queue.size === 0) _setStatus("idle");
    }, 3000);
  } catch {
    const attempt = (_retryCount.get(key) ?? 0) + 1;
    if (attempt <= _MAX_RETRIES) {
      _retryCount.set(key, attempt);
      const delay = _BACKOFF_BASE_MS * 2 ** (attempt - 1) + Math.random() * 500;
      const timer = setTimeout(() => _flush(key), delay);
      _queue.set(key, { syncFn: entry.syncFn, timer });
      _setStatus("syncing");
    } else {
      _retryCount.delete(key);
      _setStatus("error");
    }
  }
}

// ── Sheet name mapping ──────────────────────────────────────────────────
// (kept for mergeLastWriteWins — still used by legacy pull-refresh)

/**
 * Last-write-wins conflict resolution (S3.4).
 * @param {any[]} local
 * @param {any[]} remote
 * @returns {any[]}
 */
export function mergeLastWriteWins(local, remote) {
  const localMap = new Map(local.map((r) => [r.id, r]));
  const remoteMap = new Map(remote.map((r) => [r.id, r]));
  remoteMap.forEach((remoteRecord, id) => {
    const localRecord = localMap.get(id);
    if (!localRecord) {
      localMap.set(id, remoteRecord);
    } else {
      const localTs = localRecord.updatedAt ?? localRecord.createdAt ?? 0;
      const remoteTs = remoteRecord.updatedAt ?? remoteRecord.createdAt ?? 0;
      if (remoteTs > localTs) localMap.set(id, remoteRecord);
    }
  });
  return [...localMap.values()];
}

/**
 * S10.2 — Detect conflicts between local and remote arrays.
 * Returns an array of conflict descriptions where local and remote differ.
 * @param {any[]} local
 * @param {any[]} remote
 * @returns {Array<{ id: string, field: string, localVal: unknown, remoteVal: unknown }>}
 */
export function detectConflicts(local, remote) {
  /** @type {Array<{ id: string, field: string, localVal: unknown, remoteVal: unknown }>} */
  const conflicts = [];
  const remoteMap = new Map(remote.map((r) => [String(r.id), r]));
  for (const localRec of local) {
    const remoteRec = remoteMap.get(String(localRec.id));
    if (!remoteRec) continue;
    const localTs = localRec.updatedAt ?? localRec.createdAt ?? "";
    const remoteTs = remoteRec.updatedAt ?? remoteRec.createdAt ?? "";
    // Only flag if both sides changed (different timestamps)
    if (localTs === remoteTs) continue;
    for (const key of Object.keys(remoteRec)) {
      if (key === "updatedAt" || key === "createdAt") continue;
      const lv = localRec[key];
      const rv = remoteRec[key];
      if (JSON.stringify(lv) !== JSON.stringify(rv)) {
        conflicts.push({ id: String(localRec.id), field: key, localVal: lv, remoteVal: rv });
      }
    }
  }
  return conflicts;
}

// ── Backend-delegated sync functions ────────────────────────────────────
// These keep the same names so that all section imports stay unchanged.

/**
 * Sync all records of a store key to the active backend.
 * @param {string} storeKey   e.g. "guests", "vendors", "expenses"
 * @returns {Promise<void>}
 */
export async function syncStoreKeyToSheets(storeKey) {
  return syncStoreKey(storeKey);
}

/**
 * POST to the active backend (Sheets-specific — delegates via backend.js).
 * Kept for backward compat with direct callers; prefers backend dispatcher.
 * @param {Record<string, unknown>} payload
 * @returns {Promise<unknown>}
 */
export async function sheetsPost(payload) {
  const { sheetsPostImpl } = await import("./sheets-impl.js");
  return sheetsPostImpl(payload);
}

/**
 * Read data from Google Sheets via GViz query (Sheets-specific).
 * @param {string} spreadsheetId
 * @param {string} sheetName
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function sheetsRead(spreadsheetId, sheetName) {
  const { sheetsReadImpl } = await import("./sheets-impl.js");
  return sheetsReadImpl(spreadsheetId, sheetName);
}

/**
 * Flush all queued writes immediately (e.g. triggered by "Sync Now" button).
 * @returns {Promise<void>}
 */
export async function syncSheetsNow() {
  const keys = [..._queue.keys()];
  await Promise.allSettled(keys.map((k) => _flush(k)));
}

/**
 * S3.9 — Offline-to-online sync.
 * Registers a window "online" listener that flushes the write queue
 * whenever the browser regains network connectivity.
 * Also sets up "offline", and "visibilitychange" listeners.
 */
export function initOnlineSync() {
  window.addEventListener(
    "online",
    () => {
      if (_queue.size > 0) {
        syncSheetsNow();
      }
    },
    { passive: true },
  );

  window.addEventListener(
    "offline",
    () => {
      _setStatus("idle");
    },
    { passive: true },
  );

  // F2.4 — Flush queued writes when the tab becomes visible again
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.visibilityState === "visible" && _queue.size > 0 && navigator.onLine) {
        syncSheetsNow();
      }
    },
    { passive: true },
  );
}

// ── F2.4 Queue persistence ──────────────────────────────────────────────
const _PENDING_KEYS_STORAGE = "wedding_offline_queue_keys";

/**
 * Persist the set of queued store-key names so they survive a page reload.
 * On next load, the app can re-enqueue writes for these keys.
 */
async function _persistQueueKeys() {
  const keys = [..._queue.keys()];
  if (keys.length > 0) {
    await storageSet(_PENDING_KEYS_STORAGE, JSON.stringify(keys));
  } else {
    await storageRemove(_PENDING_KEYS_STORAGE);
  }
}

/**
 * Recover queued keys from storage after a page reload.
 * Must be called after initStorage() and after store has been loaded.
 * @param {(key: string) => () => Promise<void>} syncFnFactory
 *   Given a store key, returns the async sync function for that key.
 * @returns {Promise<string[]>} The keys that were recovered
 */
export async function recoverOfflineQueue(syncFnFactory) {
  const raw = await storageGet(_PENDING_KEYS_STORAGE);
  if (!raw) return [];
  try {
    const keys = JSON.parse(raw);
    if (!Array.isArray(keys)) return [];
    for (const key of keys) {
      if (typeof key === "string") {
        enqueueWrite(key, syncFnFactory(key));
      }
    }
    await storageRemove(_PENDING_KEYS_STORAGE);
    return keys;
  } catch {
    return [];
  }
}

/**
 * Verify the active backend is reachable.
 * @returns {Promise<boolean>}
 */
export async function sheetsCheckConnection() {
  return checkConnection();
}

/**
 * Create missing tables/tabs on the active backend.
 * @returns {Promise<unknown>}
 */
export async function createMissingSheetTabs() {
  return createMissingTabs();
}

/**
 * Append a single RSVP log entry to the active backend.
 * Delegates to backend.js → sheets-impl (RSVP_Log sheet) or supabase (rsvp_log table).
 * @param {{ phone: string, firstName: string, lastName: string, status: string, count: number, timestamp: string }} entry
 * @returns {Promise<void>}
 */
export async function appendToRsvpLog(entry) {
  return appendRsvpLog(entry);
}

/**
 * Pull all sheets data into the local store (two-way sync: Sheets → App).
 * @returns {Promise<Record<string, number>>}  counts per store key
 */
export async function pullFromSheets() {
  return pullAll();
}

/**
 * Force-push ALL local stores to Google Sheets regardless of what is in the
 * write queue. Useful to seed column headers on a fresh spreadsheet or to do
 * a one-shot full sync.
 * @returns {Promise<Record<string, number>>}  row counts written per store key
 */
export async function pushAllToSheets() {
  return pushAll();
}

/**
 * Re-export for callers that need the current backend type.
 */
export { getBackendType };

// ── S10.1 Polling-based live sync ─────────────────────────────────────────

/** @type {ReturnType<typeof setInterval> | null} */
let _pollTimer = null;

/** Default poll interval: 30 seconds */
const _DEFAULT_POLL_MS = 30_000;

/**
 * Start polling for remote changes at a configurable interval.
 * Calls pullFromSheets() silently at each interval.
 * @param {number} [intervalMs] Poll interval in milliseconds (default 30 000)
 * @returns {() => void} Stop function
 */
export function startLiveSync(intervalMs = _DEFAULT_POLL_MS) {
  stopLiveSync();
  _pollTimer = setInterval(async () => {
    if (!navigator.onLine) return;
    try {
      await pullAll();
    } catch {
      // silent — next tick will retry
    }
  }, intervalMs);
  return stopLiveSync;
}

/**
 * Stop the live sync polling.
 */
export function stopLiveSync() {
  if (_pollTimer !== null) {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
}

/**
 * Check whether live sync is currently active.
 * @returns {boolean}
 */
export function isLiveSyncActive() {
  return _pollTimer !== null;
}

// ── S18.1 Queue Monitor ───────────────────────────────────────────────────

/**
 * Return the number of pending write entries in the queue.
 * @returns {number}
 */
export function queueSize() {
  return _queue.size;
}

/**
 * Return an array of pending queue keys.
 * @returns {string[]}
 */
export function queueKeys() {
  return [..._queue.keys()];
}
