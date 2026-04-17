/**
 * src/utils/retry-queue.js — v7.5.0
 *
 * Persistent retry queue for failed async operations.
 * Operations are stored with exponential backoff metadata and re-attempted
 * on demand or when `processQueue()` is called.
 */

/**
 * @typedef {{ id: string, key: string, payload: unknown, attempts: number,
 *   nextRetry: number, maxAttempts: number, createdAt: string }} QueueEntry
 */

/** @type {QueueEntry[]} */
let _queue = [];

/** @type {number} Base delay in ms before first retry */
const BASE_DELAY = 1000;

/**
 * Enqueue an operation for retry.
 * @param {{ key: string, payload: unknown, maxAttempts?: number }} params
 * @returns {string} Entry id
 */
export function enqueue({ key, payload, maxAttempts = 3 }) {
  const id = `rq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  _queue.push({ id, key, payload, attempts: 0, nextRetry: Date.now(), maxAttempts, createdAt: new Date().toISOString() });
  return id;
}

/**
 * Get all pending entries.
 * @returns {QueueEntry[]}
 */
export function listPending() {
  return _queue.filter((e) => e.attempts < e.maxAttempts);
}

/**
 * Get entries that are ready to retry now (nextRetry <= now).
 * @param {number} [now]
 * @returns {QueueEntry[]}
 */
export function dueNow(now = Date.now()) {
  return _queue.filter((e) => e.attempts < e.maxAttempts && e.nextRetry <= now);
}

/**
 * Mark an entry as succeeded and remove it from the queue.
 * @param {string} id
 */
export function markSucceeded(id) {
  _queue = _queue.filter((e) => e.id !== id);
}

/**
 * Mark an entry as failed (increment attempts, update nextRetry).
 * @param {string} id
 * @param {number} [now]
 */
export function markFailed(id, now = Date.now()) {
  const entry = _queue.find((e) => e.id === id);
  if (!entry) return;
  entry.attempts++;
  entry.nextRetry = now + BASE_DELAY * 2 ** (entry.attempts - 1);
}

/**
 * Remove all entries for a key.
 * @param {string} key
 */
export function clearKey(key) {
  _queue = _queue.filter((e) => e.key !== key);
}

/**
 * Remove all entries.
 */
export function clearAll() {
  _queue = [];
}

/**
 * Process all due entries using the provided handler.
 * @param {(entry: QueueEntry) => Promise<boolean>} handler
 *   Should resolve `true` on success, `false` / throw on failure.
 * @param {number} [now]
 * @returns {Promise<{ succeeded: number, failed: number }>}
 */
export async function processQueue(handler, now = Date.now()) {
  const due = dueNow(now);
  let succeeded = 0;
  let failed = 0;

  for (const entry of due) {
    try {
      const ok = await handler(entry);
      if (ok) { markSucceeded(entry.id); succeeded++; }
      else     { markFailed(entry.id, now); failed++; }
    } catch {
      markFailed(entry.id, now);
      failed++;
    }
  }

  return { succeeded, failed };
}
