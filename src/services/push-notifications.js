/**
 * src/services/push-notifications.js — Web Push notifications (Sprint 101)
 *
 * Manages Web Push subscriptions and dispatches notifications through the
 * `push-dispatcher` Edge Function.  Uses the browser Push API (VAPID).
 *
 * Usage:
 *   import { subscribePush, unsubscribePush, sendPushToAdmins } from "./push-notifications.js";
 *
 *   const sub = await subscribePush(VAPID_PUBLIC_KEY);
 *   await sendPushToAdmins({ title: "New RSVP", body: "Alice confirmed" });
 */

import { callEdgeFunction } from "./backend.js";

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   endpoint: string,
 *   keys: { p256dh: string, auth: string },
 *   expirationTime: number | null
 * }} PushSubscriptionData
 */

/**
 * @typedef {{
 *   title: string,
 *   body?: string,
 *   icon?: string,
 *   badge?: string,
 *   tag?: string,
 *   data?: Record<string, unknown>
 * }} PushPayload
 */

// ── Feature detection ──────────────────────────────────────────────────────

/** @returns {boolean} */
export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

// ── Permission ─────────────────────────────────────────────────────────────

/**
 * Request push notification permission.
 * @returns {Promise<NotificationPermission>}
 */
export async function requestPushPermission() {
  if (typeof Notification === "undefined") return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

// ── Subscription ───────────────────────────────────────────────────────────

/**
 * Convert a URL-safe base64 string to a Uint8Array.
 * Required for VAPID subscription.
 * @param {string} base64
 * @returns {Uint8Array}
 */
export function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(Array.from(raw, (c) => c.charCodeAt(0)));
}

/**
 * Subscribe the current browser to push notifications.
 * Stores the subscription in localStorage so it can be re-registered.
 *
 * @param {string} vapidPublicKey  URL-safe base64 VAPID key
 * @returns {Promise<PushSubscriptionData | null>}
 */
export async function subscribePush(vapidPublicKey) {
  if (!isPushSupported()) return null;

  const permission = await requestPushPermission();
  if (permission !== "granted") return null;

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const data = serializeSubscription(sub);
  try {
    localStorage.setItem("wedding_v1_push_sub", JSON.stringify(data));
  } catch {
    // storage quota - non-fatal
  }
  return data;
}

/**
 * Unsubscribe the current browser from push notifications.
 * @returns {Promise<boolean>}
 */
export async function unsubscribePush() {
  if (!isPushSupported()) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return false;
  const ok = await sub.unsubscribe();
  if (ok) {
    try { localStorage.removeItem("wedding_v1_push_sub"); } catch { /**/ }
  }
  return ok;
}

/**
 * Get the current subscription (if any) from memory or localStorage.
 * @returns {PushSubscriptionData | null}
 */
export function getCachedSubscription() {
  try {
    const raw = localStorage?.getItem("wedding_v1_push_sub");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ── Serialization ──────────────────────────────────────────────────────────

/**
 * Extract plain JSON-serializable data from a PushSubscription object.
 * @param {PushSubscription} sub
 * @returns {PushSubscriptionData}
 */
export function serializeSubscription(sub) {
  const json = sub.toJSON();
  return {
    endpoint: sub.endpoint,
    keys: {
      p256dh: json.keys?.p256dh ?? "",
      auth:   json.keys?.auth   ?? "",
    },
    expirationTime: sub.expirationTime ?? null,
  };
}

// ── Dispatch ───────────────────────────────────────────────────────────────

/**
 * Send a push notification to one or more subscriptions via the Edge Function.
 *
 * @param {PushSubscriptionData[]} subscriptions
 * @param {PushPayload} payload
 * @returns {Promise<{ sent: number, failed: number }>}
 */
export async function dispatchPush(subscriptions, payload) {
  if (subscriptions.length === 0) return { sent: 0, failed: 0 };

  const result = await callEdgeFunction("push-dispatcher", {
    subscriptions,
    payload,
  });

  return {
    sent:   result?.sent   ?? 0,
    failed: result?.failed ?? 0,
  };
}

/**
 * Convenience: send a push to all admin subscriptions stored in the
 * `push_subscriptions` store key.
 *
 * @param {PushPayload} payload
 * @param {import("../core/store.js").StoreGetFn} [storeGet]
 * @returns {Promise<{ sent: number, failed: number }>}
 */
export async function sendPushToAdmins(payload, storeGet) {
  const subs = /** @type {PushSubscriptionData[]} */ (
    storeGet ? storeGet("push_subscriptions") ?? [] : []
  );
  return dispatchPush(subs, payload);
}
