/**
 * src/services/notification-centre.js — S121 in-app notification feed.
 *
 * Pure store-backed feed for system / RSVP / vendor notifications. All
 * operations are synchronous and persist to localStorage. Subscribers can
 * register a listener for unread-count badge updates.
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
