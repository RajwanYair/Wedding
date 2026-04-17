/**
 * src/services/invitation-analytics.js — Sprint 122
 *
 * Track invitation open / click / RSVP conversion events.
 * Pure state — no network, all in localStorage via store.
 */

import { storeGet, storeSet } from "../core/store.js";
import { enqueueWrite } from "./sheets.js";

const _KEY = "invitationAnalytics";

/**
 * @typedef {{ guestId: string, type: "open"|"click"|"rsvp",
 *   timestamp: string, meta?: Record<string, unknown> }} AnalyticsEvent
 */

/** @returns {AnalyticsEvent[]} */
function _all() { return storeGet(_KEY) ?? []; }
function _save(list) {
  storeSet(_KEY, list);
  enqueueWrite(_KEY, () => Promise.resolve());
}

/**
 * Record an analytics event for a guest invitation.
 * @param {string} guestId
 * @param {"open"|"click"|"rsvp"} type
 * @param {Record<string, unknown>} [meta]
 */
export function recordEvent(guestId, type, meta = {}) {
  if (!guestId) throw new Error("guestId required");
  if (!["open", "click", "rsvp"].includes(type)) throw new Error(`Unknown event type: ${type}`);
  _save([..._all(), { guestId, type, timestamp: new Date().toISOString(), meta }]);
}

/**
 * Get all events for a guest.
 * @param {string} guestId
 * @returns {AnalyticsEvent[]}
 */
export function getGuestEvents(guestId) {
  return _all().filter((e) => e.guestId === guestId);
}

/**
 * Get events of a specific type.
 * @param {"open"|"click"|"rsvp"} type
 * @returns {AnalyticsEvent[]}
 */
export function getEventsByType(type) {
  return _all().filter((e) => e.type === type);
}

/**
 * Count of unique guests who opened the invitation.
 * @returns {number}
 */
export function uniqueOpens() {
  return new Set(_all().filter((e) => e.type === "open").map((e) => e.guestId)).size;
}

/**
 * Count of unique guests who clicked a link.
 * @returns {number}
 */
export function uniqueClicks() {
  return new Set(_all().filter((e) => e.type === "click").map((e) => e.guestId)).size;
}

/**
 * Count of unique guests who completed RSVP.
 * @returns {number}
 */
export function uniqueRsvps() {
  return new Set(_all().filter((e) => e.type === "rsvp").map((e) => e.guestId)).size;
}

/**
 * Compute open → click → RSVP funnel rates.
 * @param {number} totalInvited  Total guest count invited
 * @returns {{ openRate: number, clickRate: number, conversionRate: number }}
 */
export function getFunnelStats(totalInvited) {
  if (!totalInvited || totalInvited <= 0) return { openRate: 0, clickRate: 0, conversionRate: 0 };
  return {
    openRate:       uniqueOpens()  / totalInvited,
    clickRate:      uniqueClicks() / totalInvited,
    conversionRate: uniqueRsvps()  / totalInvited,
  };
}

/**
 * Clear all analytics data.
 */
export function clearAnalytics() {
  storeSet(_KEY, []);
}
