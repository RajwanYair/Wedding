/**
 * src/services/notification-centre.js — S121 in-app notification feed.
 *
 * Merged from:
 *   - notification-centre.js      (S121) — feed CRUD
 *   - notification-preferences.js (S112) — per-user opt-in/out prefs
 */

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

function _save(list) {
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
