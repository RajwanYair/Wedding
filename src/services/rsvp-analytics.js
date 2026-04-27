/**
 * src/services/rsvp-analytics.js — RSVP funnel analytics (Sprint 44 / C1)
 *
 * Computes a 6-stage RSVP conversion funnel from the guests store.
 * Pure functions — no DOM, no network.
 *
 * Funnel stages:
 *   Invited → Reachable → Responded → Confirmed → Attending → Seated
 */

import { storeGet } from "../core/store.js";

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
function _all() {
  const raw = storeGet("guests");
  if (!raw) return [];
  return Array.isArray(raw) ? raw : Object.values(raw);
}

/**
 * Compute the 6-stage RSVP funnel counts.
 * @returns {RsvpFunnelStages}
 */
export function getRsvpFunnel() {
  const guests = _all();
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
  return _all().filter((g) => g.status === "confirmed" && !g.tableId).length;
}
