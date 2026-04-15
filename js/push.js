// @ts-check
"use strict";

/* ── Web Push Notifications (Sprint 5.4) ── */
/* Requires window.VAPID_PUBLIC_KEY in js/config.js                              */
/* Server-side push sender: scripts/send-push.mjs (uses web-push package) */

let _pushEnabled = false;
let _pushSubscription = null; // JSON representation of the PushSubscription

/* ─ Init ─────────────────────────────────────────────────────────────── */

function initPushNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  _pushEnabled =
    localStorage.getItem(`${window.STORAGE_PREFIX  }pushEnabled`) === "true";
  if (_pushEnabled) _resubscribePush();
}

/* ─ Internal helpers ─────────────────────────────────────────────────── */

/** Convert a base64url-encoded VAPID public key to Uint8Array (applicationServerKey). */
function _urlBase64ToUint8Array(base64) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** Restore an existing subscription on page load and keep _pushEnabled in sync. */
async function _resubscribePush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      _pushSubscription = sub.toJSON();
    } else {
      _pushEnabled = false;
      localStorage.removeItem(`${window.STORAGE_PREFIX  }pushEnabled`);
    }
  } catch (_) {
    /* ignore — SW not yet ready */
  }
}

/* ─ Public API ───────────────────────────────────────────────────────── */

/**
 * Request Notification permission and subscribe to Web Push.
 * Posts the subscription to the GAS web-app (savePushSubscription action).
 */
async function subscribePush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    window.showToast(window.t("push_not_supported"));
    return;
  }
  const key = typeof window.VAPID_PUBLIC_KEY !== "undefined" ? window.VAPID_PUBLIC_KEY : "";
  if (!key || key === "YOUR_VAPID_PUBLIC_KEY") {
    window.showToast(window.t("push_no_vapid"));
    return;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      window.showToast(window.t("push_permission_denied"));
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: _urlBase64ToUint8Array(key),
    });
    _pushSubscription = sub.toJSON();
    _pushEnabled = true;
    localStorage.setItem(`${window.STORAGE_PREFIX  }pushEnabled`, "true");
    /* Persist subscription on the server for later sending */
    if (window.SHEETS_WEBAPP_URL) {
      window._sheetsWebAppPost({
        action: "savePushSubscription",
        subscription: _pushSubscription,
      }).catch(function () {
        /* non-fatal */
      });
    }
    window.logAudit("push_subscribe", "Web Push subscription created");
    window.showToast(window.t("push_subscribed"));
    renderPushSettings();
  } catch (err) {
    window.showToast(window.t("push_error"));
    window.logClientError("subscribePush", err);
  }
}

/** Remove the active push subscription from both browser and GAS. */
async function unsubscribePush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    _pushSubscription = null;
    _pushEnabled = false;
    localStorage.removeItem(`${window.STORAGE_PREFIX  }pushEnabled`);
    window.logAudit("push_unsubscribe", "Web Push subscription removed");
    window.showToast(window.t("push_unsubscribed"));
    renderPushSettings();
  } catch (err) {
    window.logClientError("unsubscribePush", err);
  }
}

/* ─ Settings UI ──────────────────────────────────────────────────────── */

/** Render the push-notification settings card (admin only). */
function renderPushSettings() {
  const container = document.getElementById("pushSettingsCard");
  if (!container) return;
  if (!window._authUser || !window._authUser.isAdmin) {
    container.textContent = "";
    return;
  }

  const supported = "serviceWorker" in navigator && "PushManager" in window;
  const key = typeof window.VAPID_PUBLIC_KEY !== "undefined" ? window.VAPID_PUBLIC_KEY : "";
  const hasVapid = Boolean(key) && key !== "YOUR_VAPID_PUBLIC_KEY";

  if (!supported || !hasVapid) {
    const note = document.createElement("p");
    note.textContent = window.t(supported ? "push_no_vapid" : "push_not_supported");
    note.style.cssText = "font-size:0.8em;color:var(--text-muted);margin:0";
    container.replaceChildren(note);
    return;
  }

  const wrap = document.createElement("div");
  wrap.style.cssText =
    "display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;";

  if (_pushEnabled) {
    const btn = document.createElement("button");
    btn.className = "btn btn-secondary btn-small";
    btn.textContent = window.t("push_unsubscribe_btn");
    btn.onclick = unsubscribePush;

    const status = document.createElement("span");
    status.style.cssText = "font-size:0.8em;color:var(--success-color)";
    status.textContent = `✅ ${  window.t("push_active")}`;
    wrap.append(btn, status);
  } else {
    const btn = document.createElement("button");
    btn.className = "btn btn-primary btn-small";
    btn.textContent = window.t("push_subscribe_btn");
    btn.onclick = subscribePush;
    wrap.append(btn);
  }

  container.replaceChildren(wrap);
}
