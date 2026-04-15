// @ts-check
"use strict";

/* ── Offline RSVP Queue (Sprint 3.8 / S3.9 enhanced) ─────────────────────────
   When the device is offline, RSVP submissions and contact-form submissions
   are queued in localStorage (wedding_v1_offline_queue).
   When the connection restores, the queue is flushed automatically by POSTing
   each item to the configured Apps Script WebApp URL.
   S3.9: Failed items are retried with exponential backoff up to _MAX_RETRIES.
   ─────────────────────────────────────────────────────────────────────────── */

/** Pending entries: [{type, payload, addedAt, retries}] */
let _offlineQueue = [];

/** Max retry attempts before an item is dropped from the queue */
const _MAX_RETRIES = 5;

/** Base delay for retry backoff (doubles each attempt, capped at 5 min) */
const _RETRY_BASE_MS = 10_000;

/** Queue a failed/offline RSVP or contact submission for later retry. */
function enqueueOfflineRsvp(type, payload) {
  _offlineQueue.push({
    type,
    payload,
    addedAt: new Date().toISOString(),
    retries: 0,
  });
  window.save("offline_queue", _offlineQueue);
  _updateOfflineBadge();
  window.showToast(window.t("offline_queued"), "error");
}

/** Attempt to flush the local queue. Called when browser goes online. */
function flushOfflineQueue() {
  if (!window.SHEETS_WEBAPP_URL || _offlineQueue.length === 0) return;
  if (!navigator.onLine) return;

  const pending = _offlineQueue.slice();
  _offlineQueue = [];
  window.save("offline_queue", _offlineQueue);
  _updateOfflineBadge();
  window.showToast(window.t("offline_syncing"), "success");

  let sent = 0;
  const failed = [];

  function next() {
    if (pending.length === 0) {
      if (failed.length === 0) {
        window.showToast(
          window.t("offline_synced").replace("{n}", String(sent)),
          "success",
        );
      } else {
        /* S3.9: Re-queue items up to _MAX_RETRIES with exponential backoff */
        const requeue = failed.filter(function (item) {
          return (item.retries || 0) < _MAX_RETRIES;
        });
        requeue.forEach(function (item) {
          item.retries = (item.retries || 0) + 1;
        });
        const dropped = failed.length - requeue.length;
        _offlineQueue = requeue.concat(_offlineQueue);
        window.save("offline_queue", _offlineQueue);
        _updateOfflineBadge();

        /* Schedule next flush attempt with backoff */
        if (requeue.length > 0) {
          const maxRetries = Math.max(
            ...requeue.map(function (i) {
              return i.retries || 0;
            }),
          );
          const delay = Math.min(
            _RETRY_BASE_MS * Math.pow(2, maxRetries - 1),
            5 * 60_000,
          );
          setTimeout(flushOfflineQueue, delay);
        }
        window.showToast(
          window
            .t("offline_sync_partial")
            .replace("{n}", String(failed.length - dropped)),
          "error",
        );
      }
      return;
    }
    const item = pending.shift();
    window
      ._sheetsWebAppPost(item.payload)
      .then(function () {
        sent++;
        next();
      })
      .catch(function () {
        failed.push(item);
        next();
      });
  }

  next();
}

/** Show/hide the "offline" badge indicator in the top bar. */
function _updateOfflineBadge() {
  const badge = document.getElementById("offlineBadge");
  if (!badge) return;
  const isOffline = !navigator.onLine;
  const qCount = _offlineQueue.length;
  badge.style.display = isOffline || qCount > 0 ? "" : "none";
  if (isOffline) {
    badge.textContent = `📵 ${window.t("offline_badge_offline")}`;
  } else if (qCount > 0) {
    badge.textContent = `⏳ ${window.t("offline_badge_queued").replace("{n}", String(qCount))}`;
  }
}

/** Wire up online/offline events and load persisted queue. */
function initOfflineQueue() {
  _offlineQueue = window.load("offline_queue") || [];
  _updateOfflineBadge();

  window.addEventListener("online", function () {
    _updateOfflineBadge();
    flushOfflineQueue();
  });
  window.addEventListener("offline", function () {
    _updateOfflineBadge();
  });
}

/** Expose queue count for audit/display. */
function getOfflineQueueCount() {
  return _offlineQueue.length;
}
