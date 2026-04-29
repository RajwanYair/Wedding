/**
 * src/services/guest-analytics.js — Guest RSVP + invitation analytics (S216)
 *
 * Merged from:
 *   - rsvp-analytics.js (Sprint 44 / C1) — RSVP funnel, conversion rates
 *   - invitation-analytics.js (Sprint 122)  — invitation open/click/RSVP events
 *
 * Pure functions — no DOM, no network.
 */

import { storeGet, storeSet } from "../core/store.js";
import { enqueueWrite } from "./sheets.js";

// ── RSVP Funnel Analytics ────────────────────────────────────────────────────

/**
 * @typedef {{ id: string, firstName?: string, status?: string,
 *   phone?: string, tableId?: string, count?: number }} GuestRecord
 *
 * @typedef {{
 *   invited:   number,
 *   reachable: number,
 *   responded: number,
 *   confirmed: number,
 *   attending: number,
 *   seated:    number,
 * }} RsvpFunnelStages
 */

/** @returns {GuestRecord[]} */
function _allGuests() {
  const raw = storeGet("guests");
  if (!raw) return [];
  return Array.isArray(raw) ? raw : Object.values(raw);
}

/**
 * Compute the 6-stage RSVP funnel counts.
 * @returns {RsvpFunnelStages}
 */
export function getRsvpFunnel() {
  const guests = _allGuests();
  const invited = guests.length;
  const reachable = guests.filter((g) => g.phone && String(g.phone).trim() !== "").length;
  const responded = guests.filter((g) => g.status && g.status !== "pending").length;
  const confirmed = guests.filter((g) => g.status === "confirmed").length;
  const attending = guests
    .filter((g) => g.status === "confirmed")
    .reduce((sum, g) => sum + (g.count ?? 1), 0);
  const seated = guests.filter((g) => g.status === "confirmed" && g.tableId).length;

  return { invited, reachable, responded, confirmed, attending, seated };
}

/**
 * Compute conversion rates between adjacent stages.
 * Returns 0 when the denominator is 0.
 * @returns {Record<string, number>}   values between 0 and 1
 */
export function getRsvpConversionRates() {
  const f = getRsvpFunnel();
  return {
    invitedToReachable: f.invited > 0 ? f.reachable / f.invited : 0,
    reachableToResponded: f.reachable > 0 ? f.responded / f.reachable : 0,
    respondedToConfirmed: f.responded > 0 ? f.confirmed / f.responded : 0,
    confirmedToSeated: f.confirmed > 0 ? f.seated / f.confirmed : 0,
    overallRate: f.invited > 0 ? f.confirmed / f.invited : 0,
  };
}

/**
 * Compute the no-show risk count — confirmed guests not yet seated.
 * @returns {number}
 */
export function unseatedConfirmedCount() {
  return _allGuests().filter((g) => g.status === "confirmed" && !g.tableId).length;
}

// ── Funnel chart helpers ─────────────────────────────────────────────────────

/** @typedef {{ id: string, status?: "confirmed"|"pending"|"declined"|"maybe", invited?: boolean, sent?: boolean, opened?: boolean, respondedAt?: string|null }} GuestRsvp */
/** @typedef {{ key: string, label: string, count: number, pct: number, dropoff: number }} FunnelStep */

/**
 * Build a 5-stage RSVP funnel for chart consumption.
 * @param {GuestRsvp[]} guests
 * @returns {FunnelStep[]}
 */
export function buildRsvpFunnel(guests) {
  const list = Array.isArray(guests) ? guests : [];
  const invited = list.filter((g) => g.invited !== false).length;
  const sent = list.filter((g) => g.sent === true).length;
  const opened = list.filter((g) => g.opened === true).length;
  const responded = list.filter(
    (g) => Boolean(g.respondedAt) || g.status === "confirmed" || g.status === "declined",
  ).length;
  const confirmed = list.filter((g) => g.status === "confirmed").length;

  const top = invited;
  /** @type {Array<[string,string,number]>} */
  const raw = [
    ["invited", "Invited", invited],
    ["sent", "Sent", sent],
    ["opened", "Opened", opened],
    ["responded", "Responded", responded],
    ["confirmed", "Confirmed", confirmed],
  ];
  let prev = top;
  return raw.map(([key, label, count]) => {
    const pct = top > 0 ? count / top : 0;
    const dropoff = prev > 0 ? Math.max(0, (prev - count) / prev) : 0;
    prev = count;
    return { key, label, count, pct, dropoff };
  });
}

/**
 * Conversion rate of `respondedAt` → `confirmed`. 0 when no responses.
 * @param {GuestRsvp[]} guests
 * @returns {number}
 */
export function rsvpConversionRate(guests) {
  const list = Array.isArray(guests) ? guests : [];
  const responded = list.filter(
    (g) => Boolean(g.respondedAt) || g.status === "confirmed" || g.status === "declined",
  ).length;
  if (responded === 0) return 0;
  const confirmed = list.filter((g) => g.status === "confirmed").length;
  return confirmed / responded;
}

// ── Invitation Event Analytics ───────────────────────────────────────────────

const _INVITE_KEY = "invitationAnalytics";

/**
 * @typedef {{ guestId: string, type: "open"|"click"|"rsvp",
 *   timestamp: string, meta?: Record<string, unknown> }} AnalyticsEvent
 */

/** @returns {AnalyticsEvent[]} */
function _allEvents() {
  return storeGet(_INVITE_KEY) ?? [];
}
function _saveEvents(/** @type {any[]} */ list) {
  storeSet(_INVITE_KEY, list);
  enqueueWrite(_INVITE_KEY, () => Promise.resolve());
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
  _saveEvents([..._allEvents(), { guestId, type, timestamp: new Date().toISOString(), meta }]);
}

/**
 * Get all events for a guest.
 * @param {string} guestId
 * @returns {AnalyticsEvent[]}
 */
export function getGuestEvents(guestId) {
  return _allEvents().filter((e) => e.guestId === guestId);
}

/**
 * Get events of a specific type.
 * @param {"open"|"click"|"rsvp"} type
 * @returns {AnalyticsEvent[]}
 */
export function getEventsByType(type) {
  return _allEvents().filter((e) => e.type === type);
}

/**
 * Count of unique guests who opened the invitation.
 * @returns {number}
 */
export function uniqueOpens() {
  return new Set(
    _allEvents()
      .filter((e) => e.type === "open")
      .map((e) => e.guestId),
  ).size;
}

/**
 * Count of unique guests who clicked a link.
 * @returns {number}
 */
export function uniqueClicks() {
  return new Set(
    _allEvents()
      .filter((e) => e.type === "click")
      .map((e) => e.guestId),
  ).size;
}

/**
 * Count of unique guests who completed RSVP.
 * @returns {number}
 */
export function uniqueRsvps() {
  return new Set(
    _allEvents()
      .filter((e) => e.type === "rsvp")
      .map((e) => e.guestId),
  ).size;
}

/**
 * Compute open → click → RSVP funnel rates.
 * @param {number} totalInvited  Total guest count invited
 * @returns {{ openRate: number, clickRate: number, conversionRate: number }}
 */
export function getFunnelStats(totalInvited) {
  if (!totalInvited || totalInvited <= 0) return { openRate: 0, clickRate: 0, conversionRate: 0 };
  return {
    openRate: uniqueOpens() / totalInvited,
    clickRate: uniqueClicks() / totalInvited,
    conversionRate: uniqueRsvps() / totalInvited,
  };
}

/**
 * Clear all invitation analytics data.
 */
export function clearAnalytics() {
  storeSet(_INVITE_KEY, []);
}
