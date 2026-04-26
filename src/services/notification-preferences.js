/**
 * src/services/notification-preferences.js — Per-user notification opt-in/out (Sprint 112)
 *
 * Stores notification preferences per user in the `notificationPreferences`
 * store key (namespaced by userId when provided, or "_default" for guests).
 *
 * Channels: "push" | "email" | "whatsapp" | "sms"
 * Events:   "rsvp_confirmed" | "rsvp_reminder" | "table_assigned" | "campaign" | "system"
 *
 * Usage:
 *   import { getPreferences, updatePreferences, isChannelEnabled } from "./notification-preferences.js";
 *
 *   updatePreferences("user_123", { channels: { push: false } });
 *   isChannelEnabled("user_123", "push"); // false
 */

import { storeGet, storeSet } from "../core/store.js";

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * @typedef {"push" | "email" | "whatsapp" | "sms"} NotificationChannel
 * @typedef {"rsvp_confirmed" | "rsvp_reminder" | "table_assigned" | "campaign" | "system"} NotificationEvent
 *
 * @typedef {{
 *   userId:     string,
 *   channels:   Record<NotificationChannel, boolean>,
 *   events:     Record<NotificationEvent, boolean>,
 *   updatedAt:  number,
 * }} NotificationPrefs
 */

/** @type {Record<NotificationChannel, boolean>} */
const DEFAULT_CHANNELS = {
  push: true,
  email: true,
  whatsapp: true,
  sms: false,
};

/** @type {Record<NotificationEvent, boolean>} */
const DEFAULT_EVENTS = {
  rsvp_confirmed: true,
  rsvp_reminder: true,
  table_assigned: true,
  campaign: true,
  system: true,
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** @returns {Record<string, NotificationPrefs>} */
function _getAll() {
  return /** @type {Record<string, NotificationPrefs>} */ (
    storeGet("notificationPreferences") ?? {}
  );
}

/** @param {Record<string, NotificationPrefs>} all */
function _saveAll(all) {
  storeSet("notificationPreferences", all);
}

// ── API ───────────────────────────────────────────────────────────────────

/**
 * Get preferences for a user (creates defaults if not yet stored).
 * @param {string} [userId="_default"]
 * @returns {NotificationPrefs}
 */
export function getPreferences(userId = "_default") {
  const all = _getAll();
  if (all[userId]) return all[userId];
  // Return defaults without persisting (lazy init)
  return {
    userId,
    channels: { ...DEFAULT_CHANNELS },
    events: { ...DEFAULT_EVENTS },
    updatedAt: 0,
  };
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
