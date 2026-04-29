/**
 * src/services/offline.js — Offline-first service (S227)
 *
 * Merged from:
 *   - background-sync.js  (S89)  — Background Sync API wrapper
 *   - offline-queue.js    (S203) — IDB-persisted offline write queue
 */

import { storeGet, storeSet } from "../core/store.js";
import { MAX_RETRIES, BACKOFF_BASE_MS } from "../core/config.js";
import { t } from "../core/i18n.js";
import { idbQueueRead, idbQueueWrite } from "../utils/idb-queue.js";

// ══════════════════════════════════════════════════════════════════════════
// §1 — Background Sync API wrapper (merged from background-sync.js, S89)
// ══════════════════════════════════════════════════════════════════════════

/** Default tag used by the SW to trigger a queue flush. */
export const BACKGROUND_SYNC_TAG = "write-sync";

/**
 * Returns true when the SyncManager API is available in the current browser.
 * @returns {boolean}
 */
export function isBackgroundSyncSupported() {
  if (typeof navigator === "undefined") return false;
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    typeof window.SyncManager !== "undefined" &&
    typeof navigator.serviceWorker.ready?.then === "function"
  );
}

/**
 * Register a Background Sync tag with the active Service Worker registration.
 * No-op when the API is unavailable; resolves to `false` instead of throwing.
 * @param {string} [tag=BACKGROUND_SYNC_TAG]
 * @returns {Promise<boolean>} `true` when registration succeeded
 */
export async function registerBackgroundSync(tag = BACKGROUND_SYNC_TAG) {
  if (!isBackgroundSyncSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    /** @type {{ sync?: { register: (tag: string) => Promise<void> } }} */
    const swr = /** @type {any} */ (reg);
    if (!swr.sync || typeof swr.sync.register !== "function") return false;
    await swr.sync.register(tag);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convenience helper: register Background Sync if supported, otherwise wire a
 * one-shot `online` listener that calls the supplied callback once.
 * @param {() => void} onTrigger
 * @param {string} [tag=BACKGROUND_SYNC_TAG]
 * @returns {Promise<"registered" | "fallback" | "noop">}
 */
export async function ensureBackgroundFlush(onTrigger, tag = BACKGROUND_SYNC_TAG) {
  const ok = await registerBackgroundSync(tag);
  if (ok) return "registered";
  if (typeof window === "undefined") return "noop";
  const handler = () => {
    window.removeEventListener("online", handler);
    try {
      onTrigger();
    } catch {
      /* never bubble */
    }
  };
  window.addEventListener("online", handler, { once: true });
  return "fallback";
}

// ══════════════════════════════════════════════════════════════════════════
// §2 — Offline write queue (merged from offline-queue.js, S203)
// ══════════════════════════════════════════════════════════════════════════

/** @type {{ type: string, payload: unknown, addedAt: string, retries: number }[]} */
let _queue = [];

/** Count of items dropped after exhausting MAX_RETRIES this session. */
let _exhaustedCount = 0;

/** @type {string | null} */
let _webAppUrl = null;

/** Cap backoff at 5 minutes */
const _MAX_DELAY_MS = 5 * 60_000;

/**
 * Initialise the offline queue. Loads persisted items (IDB first, store fallback)
 * and wires online/offline events.
 * @param {{ webAppUrl?: string, postFn?: (payload: unknown) => Promise<unknown> }} [opts]
 * @returns {void}
 */
export function initOfflineQueue(opts) {
  _webAppUrl = opts?.webAppUrl ?? null;
  _postFn = opts?.postFn ?? _defaultPost;

  // Load synchronously from store (localStorage) for immediate availability.
  _queue = /** @type {typeof _queue} */ (storeGet("offline_queue")) ?? [];

  // Async upgrade: attempt to load from IDB and prefer it if available.
  idbQueueRead()
    .then((idbItems) => {
      if (idbItems.length > 0) {
        _queue = /** @type {typeof _queue} */ (idbItems);
        _updateBadge();
      } else if (_queue.length > 0) {
        // Migrate existing localStorage items to IDB.
        idbQueueWrite(_queue).catch(() => {});
      }
    })
    .catch(() => {});

  _updateBadge();

  if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
      _updateBadge();
      flushOfflineQueue();
    });
    window.addEventListener("offline", _updateBadge);
  }

  // Listen for RSVP_SYNC_READY from the Service Worker (Background Sync API).
  try {
    const sw = typeof navigator !== "undefined" ? navigator.serviceWorker : undefined;
    if (sw && typeof sw.addEventListener === "function") {
      sw.addEventListener("message", (event) => {
        if (event.data?.type === "RSVP_SYNC_READY") {
          flushOfflineQueue();
        }
      });
    }
  } catch {
    // serviceWorker not available in this environment
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
 * Registers the Background Sync tag so the Service Worker flushes the
 * queue automatically when connectivity is restored, even if the tab is closed.
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
  _registerSyncTag();
}

/**
 * Register the Background Sync tag with the active Service Worker.
 * @returns {void}
 */
function _registerSyncTag() {
  try {
    const sw = typeof navigator !== "undefined" ? navigator.serviceWorker : undefined;
    if (!sw || !sw.controller) return;
    sw.ready
      .then((reg) => {
        if (reg && "sync" in reg) {
          return /** @type {{ register: (tag: string) => Promise<void> }} */ (reg.sync).register(
            "rsvp-sync",
          );
        }
      })
      .catch(() => {
        // Background Sync not supported or permission denied — ignore
      });
  } catch {
    // Navigator/serviceWorker not available in this environment
  }
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
      const requeue = failed.filter((item) => (item.retries ?? 0) < MAX_RETRIES);
      const exhausted = failed.filter((item) => (item.retries ?? 0) >= MAX_RETRIES);
      _exhaustedCount += exhausted.length;
      requeue.forEach((item) => {
        item.retries = (item.retries ?? 0) + 1;
      });

      if (requeue.length > 0) {
        _queue = [...requeue, ..._queue];
        _persist();
        const maxR = Math.max(...requeue.map((i) => i.retries));
        const delay = Math.min(BACKOFF_BASE_MS * 2 ** (maxR - 1), _MAX_DELAY_MS);
        setTimeout(flushOfflineQueue, delay);
      }
      _updateBadge();
      return;
    }

    const item = pending.shift();
    if (!item) {
      next();
      return;
    }
    _postFn(item.payload)
      .then(() => {
        _sent++;
        next();
      })
      .catch(() => {
        failed.push(item);
        next();
      });
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
    _queue.length > 0 ? _queue.reduce((a, b) => (a.addedAt < b.addedAt ? a : b)).addedAt : null;
  return { total: _queue.length, exhausted: _exhaustedCount, oldestAddedAt: oldest };
}

// ── Internal ──────────────────────────────────────────────────────────────

function _persist() {
  storeSet("offline_queue", _queue);
  idbQueueWrite(_queue).catch(() => {});
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
