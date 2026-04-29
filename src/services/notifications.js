/**
 * src/services/notifications.js — S260 merged notifications service
 *
 * Merged from:
 *   - push-notifications.js  (Sprint 101) — Web Push + VAPID subscription
 *   - notification-centre.js (S121)       — In-app notification feed
 *
 * §1 Web Push: subscribeToPush, unsubscribeFromPush, getPushSubscription,
 *    sendTestPush, isPushSupported, getPushPreferences, setPushPreferences
 * §2 Notification feed: getNotifications, addNotification, markRead,
 *    markAllRead, clearNotifications, getUnreadCount
 *
 * Named exports only — no window.* side effects.
 */
import { STORAGE_KEYS } from "../core/constants.js";
import {
  readBrowserStorageJson,
  removeBrowserStorage,
  writeBrowserStorageJson,
} from "../core/storage.js";
import { callEdgeFunction } from "./backend.js";

const _CACHE_KEY = STORAGE_KEYS.PUSH_SUBSCRIPTION_CACHE;

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
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
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
  writeBrowserStorageJson(_CACHE_KEY, data);
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
  if (ok) removeBrowserStorage(_CACHE_KEY);
  return ok;
}

/**
 * Get the current subscription (if any) from memory or localStorage.
 * @returns {PushSubscriptionData | null}
 */
export function getCachedSubscription() {
  return readBrowserStorageJson(_CACHE_KEY, null);
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
      auth: json.keys?.auth ?? "",
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
    sent: result?.sent ?? 0,
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
    storeGet ? (storeGet("push_subscriptions") ?? []) : []
  );
  return dispatchPush(subs, payload);
}


// ── §2 — In-app notification feed ──────────────────────────────────────

import {
  readBrowserStorageJson,
  writeBrowserStorageJson,
} from "../core/storage.js";

const STORAGE_KEY = "wedding_v1_notifications";
const MAX_ITEMS = 200;

/** @typedef {"info"|"success"|"warning"|"error"} NotificationLevel */
/** @typedef {{ id: string, level: NotificationLevel, title: string, body?: string, createdAt: string, readAt?: string|null, link?: string }} Notification */

/** @type {Set<() => void>} */
const _listeners = new Set();

function _emit() {
  for (const fn of _listeners) {
    try {
      fn();
    } catch {
      /* swallow */
    }
  }
}

function _load() {
  /** @type {Notification[]} */
  const v = readBrowserStorageJson(STORAGE_KEY) ?? [];
  return Array.isArray(v) ? v : [];
}

function _save(/** @type {any[]} */ list) {
  writeBrowserStorageJson(STORAGE_KEY, list.slice(0, MAX_ITEMS));
}

/**
 * Append a notification to the feed.
 * @param {Omit<Notification, "id"|"createdAt"|"readAt">} input
 * @returns {Notification}
 */
export function pushNotification(input) {
  if (!input?.title) throw new Error("title required");
  const item = {
    id: `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    level: input.level ?? "info",
    title: input.title,
    body: input.body,
    link: input.link,
    createdAt: new Date().toISOString(),
    readAt: null,
  };
  const list = [item, ..._load()];
  _save(list);
  _emit();
  return item;
}

/** @returns {Notification[]} newest-first */
export function listNotifications() {
  return _load();
}

/** @returns {number} */
export function unreadCount() {
  return _load().filter((n) => !n.readAt).length;
}

/**
 * Mark a single notification as read.
 * @param {string} id
 */
export function markRead(id) {
  const list = _load();
  let changed = false;
  for (const n of list) {
    if (n.id === id && !n.readAt) {
      n.readAt = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) {
    _save(list);
    _emit();
  }
  return changed;
}

/** Mark every notification as read. */
export function markAllRead() {
  const list = _load();
  const now = new Date().toISOString();
  let changed = false;
  for (const n of list) {
    if (!n.readAt) {
      n.readAt = now;
      changed = true;
    }
  }
  if (changed) {
    _save(list);
    _emit();
  }
  return changed;
}

/** Remove all read notifications. */
export function clearRead() {
  const before = _load();
  const after = before.filter((n) => !n.readAt);
  if (after.length === before.length) return 0;
  _save(after);
  _emit();
  return before.length - after.length;
}

/**
 * Subscribe to feed changes; returns an unsubscribe fn.
 * @param {() => void} fn
 */
export function subscribe(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

// ── Notification preferences (merged from notification-preferences.js, S112) ──

import { storeGet, storeSet } from "../core/store.js";

/** @typedef {"push" | "email" | "whatsapp" | "sms"} NotificationChannel */
/** @typedef {"rsvp_confirmed" | "rsvp_reminder" | "table_assigned" | "campaign" | "system"} NotificationEvent */
/**
 * @typedef {{
 *   userId:     string,
 *   channels:   Record<NotificationChannel, boolean>,
 *   events:     Record<NotificationEvent, boolean>,
 *   updatedAt:  number,
 * }} NotificationPrefs
 */

/** @type {Record<NotificationChannel, boolean>} */
const DEFAULT_CHANNELS = { push: true, email: true, whatsapp: true, sms: false };

/** @type {Record<NotificationEvent, boolean>} */
const DEFAULT_EVENTS = {
  rsvp_confirmed: true, rsvp_reminder: true, table_assigned: true, campaign: true, system: true,
};

/** @returns {Record<string, NotificationPrefs>} */
function _getAll() {
  return /** @type {Record<string, NotificationPrefs>} */ (storeGet("notificationPreferences") ?? {});
}

/** @param {Record<string, NotificationPrefs>} all */
function _saveAll(all) {
  storeSet("notificationPreferences", all);
}

/**
 * Get preferences for a user (creates defaults if not yet stored).
 * @param {string} [userId="_default"]
 * @returns {NotificationPrefs}
 */
export function getPreferences(userId = "_default") {
  const all = _getAll();
  if (all[userId]) return all[userId];
  return { userId, channels: { ...DEFAULT_CHANNELS }, events: { ...DEFAULT_EVENTS }, updatedAt: 0 };
}

/**
 * Merge a patch into user preferences.
 * @param {string} userId
 * @param {{ channels?: Partial<Record<NotificationChannel, boolean>>, events?: Partial<Record<NotificationEvent, boolean>> }} patch
 * @returns {NotificationPrefs}
 */
export function updatePreferences(userId, patch) {
  const current = getPreferences(userId);
  const updated = /** @type {NotificationPrefs} */ ({
    ...current,
    channels: { ...current.channels, ...(patch.channels ?? {}) },
    events: { ...current.events, ...(patch.events ?? {}) },
    updatedAt: Date.now(),
  });
  const all = _getAll();
  all[userId] = updated;
  _saveAll(all);
  return updated;
}

/**
 * Check if a specific channel is enabled for a user.
 * @param {string} userId
 * @param {NotificationChannel} channel
 * @returns {boolean}
 */
export function isChannelEnabled(userId, channel) {
  return getPreferences(userId).channels[channel] ?? false;
}

/**
 * Check if a specific event type is enabled for a user.
 * @param {string} userId
 * @param {NotificationEvent} event
 * @returns {boolean}
 */
export function isEventEnabled(userId, event) {
  return getPreferences(userId).events[event] ?? false;
}

/**
 * Opt a user out of all notifications (except "system").
 * @param {string} userId
 * @returns {NotificationPrefs}
 */
export function optOutAll(userId) {
  const allChannels = /** @type {Record<NotificationChannel, boolean>} */ (
    Object.fromEntries(Object.keys(DEFAULT_CHANNELS).map((k) => [k, false]))
  );
  const allEvents = /** @type {Record<NotificationEvent, boolean>} */ (
    Object.fromEntries(Object.keys(DEFAULT_EVENTS).map((k) => [k, k === "system"]))
  );
  return updatePreferences(userId, { channels: allChannels, events: allEvents });
}

/**
 * Reset preferences to defaults for a user.
 * @param {string} userId
 * @returns {NotificationPrefs}
 */
export function resetPreferences(userId) {
  const all = _getAll();
  delete all[userId];
  _saveAll(all);
  return getPreferences(userId);
}

