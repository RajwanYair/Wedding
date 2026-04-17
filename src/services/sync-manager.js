/**
 * src/services/sync-manager.js — Data sync orchestrator (Sprint 161)
 *
 * Coordinates writes from the local store to a backend (Supabase or Sheets).
 * Implements a priority queue, retry, and conflict-detection facade.
 *
 * - Writes are enqueued with a key and a write function.
 * - The manager debounces writes and processes them in order.
 * - On failure, the write is retried up to MAX_RETRIES times with backoff.
 * - getStatus() exposes queue state for the sync health dashboard.
 */

/** @typedef {{ key: string, fn: () => Promise<void>, retries: number, addedAt: number, lastError?: string }} SyncTask */

const MAX_RETRIES = 3;
const DEBOUNCE_MS = 300;

/** @type {Map<string, SyncTask>} */
const _queue = new Map();

/** @type {Set<string>} */
const _inFlight = new Set();

/** @type {Set<string>} */
const _failed = new Set();

/** @type {NodeJS.Timeout | null} */
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
export function getSyncStatus() {
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

/** @internal for tests only */
export function _resetForTesting() {
  _queue.clear();
  _inFlight.clear();
  _failed.clear();
  if (_flushTimer !== null) { clearTimeout(_flushTimer); _flushTimer = null; }
  _processing = false;
  _listeners.clear();
}
