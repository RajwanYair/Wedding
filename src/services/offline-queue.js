/**
 * src/services/offline-queue.js — F1.2.4 Offline queue (migrated from js/)
 *
 * Queues failed RSVP/contact submissions in localStorage when offline.
 * Flushes automatically when the connection restores with exponential backoff.
 * Uses shared retry constants from config.js.
 */

import { storeGet, storeSet } from "../core/store.js";
import { MAX_RETRIES, BACKOFF_BASE_MS } from "../core/config.js";
import { t } from "../core/i18n.js";

/** @type {{ type: string, payload: unknown, addedAt: string, retries: number }[]} */
let _queue = [];

/** Count of items dropped after exhausting MAX_RETRIES this session. */
let _exhaustedCount = 0;

/** @type {string | null} */
let _webAppUrl = null;

/** Cap backoff at 5 minutes */
const _MAX_DELAY_MS = 5 * 60_000;

/**
 * Initialise the offline queue. Loads persisted items and wires online/offline events.
 * @param {{ webAppUrl?: string, postFn?: (payload: unknown) => Promise<unknown> }} [opts]
 */
export function initOfflineQueue(opts) {
  _webAppUrl = opts?.webAppUrl ?? null;
  _postFn = opts?.postFn ?? _defaultPost;
  _queue = /** @type {typeof _queue} */ (storeGet("offline_queue")) ?? [];
  _updateBadge();

  if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
      _updateBadge();
      flushOfflineQueue();
    });
    window.addEventListener("offline", _updateBadge);
  }
}

/** @type {(payload: unknown) => Promise<unknown>} */
let _postFn = _defaultPost;

/**
 * Default POST function using fetch.
 * @param {unknown} payload
 * @returns {Promise<unknown>}
 */
function _defaultPost(payload) {
  if (!_webAppUrl) return Promise.reject(new Error("No webapp URL"));
  return fetch(_webAppUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/**
 * Queue a submission for later retry.
 * @param {string} type - "rsvp" | "contact"
 * @param {unknown} payload
 */
export function enqueueOffline(type, payload) {
  _queue.push({
    type,
    payload,
    addedAt: new Date().toISOString(),
    retries: 0,
  });
  _persist();
  _updateBadge();
}

/**
 * Flush the queue — send pending items. Called on "online" event.
 */
export function flushOfflineQueue() {
  if (!_webAppUrl || _queue.length === 0) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const pending = _queue.slice();
  _queue = [];
  _persist();

  let _sent = 0;
  /** @type {typeof pending} */
  const failed = [];

  function next() {
    if (pending.length === 0) {
      // Re-queue failed items up to MAX_RETRIES; drop and count exhausted ones
      const requeue = failed.filter((item) => (item.retries ?? 0) < MAX_RETRIES);
      const exhausted = failed.filter((item) => (item.retries ?? 0) >= MAX_RETRIES);
      _exhaustedCount += exhausted.length;
      requeue.forEach((item) => { item.retries = (item.retries ?? 0) + 1; });

      if (requeue.length > 0) {
        _queue = [...requeue, ..._queue];
        _persist();
        // Schedule next flush with exponential backoff
        const maxR = Math.max(...requeue.map((i) => i.retries));
        const delay = Math.min(BACKOFF_BASE_MS * 2 ** (maxR - 1), _MAX_DELAY_MS);
        setTimeout(flushOfflineQueue, delay);
      }
      _updateBadge();
      return;
    }

    const item = pending.shift();
    if (!item) { next(); return; }
    _postFn(item.payload)
      .then(() => { _sent++; next(); })
      .catch(() => { failed.push(item); next(); });
  }

  next();
}

/**
 * Get the current queue length.
 * @returns {number}
 */
export function getOfflineQueueCount() {
  return _queue.length;
}

/**
 * Get a summary of queue health.
 * @returns {{ total: number, exhausted: number, oldestAddedAt: string | null }}
 */
export function getQueueStats() {
  const oldest =
    _queue.length > 0
      ? _queue.reduce((a, b) => (a.addedAt < b.addedAt ? a : b)).addedAt
      : null;
  return { total: _queue.length, exhausted: _exhaustedCount, oldestAddedAt: oldest };
}

// ── Internal ──────────────────────────────────────────────────────────────

function _persist() {
  storeSet("offline_queue", _queue);
}

function _updateBadge() {
  if (typeof document === "undefined") return;
  const badge = document.getElementById("offlineBadge");
  if (!badge) return;
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
  const qCount = _queue.length;
  badge.style.display = isOffline || qCount > 0 ? "" : "none";
  if (isOffline) {
    badge.textContent = `📵 ${t("offline_badge_offline")}`;
  } else if (qCount > 0) {
    badge.textContent = `⏳ ${t("offline_badge_queued", { n: String(qCount) })}`;
  }
}
