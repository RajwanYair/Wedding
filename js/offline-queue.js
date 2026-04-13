"use strict";

/* ── Offline RSVP Queue (Sprint 3.8) ─────────────────────────────────────────
   When the device is offline, RSVP submissions and contact-form submissions
   are queued in localStorage (wedding_v1_offline_queue).
   When the connection restores, the queue is flushed automatically by POSTing
   each item to the configured Apps Script WebApp URL.
   ─────────────────────────────────────────────────────────────────────────── */

/** Pending entries: [{type, payload, addedAt}] */
let _offlineQueue = [];

/** Queue a failed/offline RSVP or contact submission for later retry. */
function enqueueOfflineRsvp(type, payload) {
  _offlineQueue.push({
    type: type,
    payload: payload,
    addedAt: new Date().toISOString(),
  });
  save("offline_queue", _offlineQueue);
  _updateOfflineBadge();
  showToast(t("offline_queued"), "error");
}

/** Attempt to flush the local queue. Called when browser goes online. */
function flushOfflineQueue() {
  if (!SHEETS_WEBAPP_URL || _offlineQueue.length === 0) return;
  if (!navigator.onLine) return;

  const pending = _offlineQueue.slice();
  _offlineQueue = [];
  save("offline_queue", _offlineQueue);
  _updateOfflineBadge();
  showToast(t("offline_syncing"), "success");

  let sent = 0;
  const failed = [];

  function next() {
    if (pending.length === 0) {
      if (failed.length === 0) {
        showToast(t("offline_synced").replace("{n}", String(sent)), "success");
      } else {
        /* Re-queue items that still failed */
        _offlineQueue = failed.concat(_offlineQueue);
        save("offline_queue", _offlineQueue);
        _updateOfflineBadge();
        showToast(
          t("offline_sync_partial").replace("{n}", String(failed.length)),
          "error",
        );
      }
      return;
    }
    const item = pending.shift();
    _sheetsWebAppPost(item.payload)
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
    badge.textContent = "📵 " + t("offline_badge_offline");
  } else if (qCount > 0) {
    badge.textContent =
      "⏳ " + t("offline_badge_queued").replace("{n}", String(qCount));
  }
}

/** Wire up online/offline events and load persisted queue. */
function initOfflineQueue() {
  _offlineQueue = load("offline_queue") || [];
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
