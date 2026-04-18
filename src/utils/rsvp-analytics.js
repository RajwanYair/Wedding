/**
 * src/utils/rsvp-analytics.js — RSVP analytics and conversion rate utilities
 *
 * Pure functions for computing RSVP response rates, confirmation trends,
 * daily submission counts, and meal distribution breakdowns.
 * No side effects, no external deps — fully testable.
 */

/**
 * Compute RSVP response rates from a guest list.
 * @param {any[]} guests
 * @returns {{
 *   total: number,
 *   confirmed: number,
 *   declined: number,
 *   pending: number,
 *   maybe: number,
 *   responseRate: number,
 *   confirmationRate: number,
 *   declineRate: number,
 * }}
 */
export function computeRsvpRates(guests) {
  const total = guests.length;
  const confirmed = guests.filter((g) => g.status === "confirmed").length;
  const declined = guests.filter((g) => g.status === "declined").length;
  const pending = guests.filter((g) => g.status === "pending").length;
  const maybe = guests.filter((g) => g.status === "maybe").length;

  const responded = confirmed + declined + maybe;
  const responseRate = total === 0 ? 0 : Math.round((responded / total) * 100);
  const confirmationRate = total === 0 ? 0 : Math.round((confirmed / total) * 100);
  const declineRate = total === 0 ? 0 : Math.round((declined / total) * 100);

  return {
    total, confirmed, declined, pending, maybe,
    responseRate, confirmationRate, declineRate,
  };
}

/**
 * Compute meal distribution counts from a confirmed guest list.
 * @param {any[]} guests
 * @returns {Record<string, number>}
 */
export function computeMealDistribution(guests) {
  const confirmed = guests.filter((g) => g.status === "confirmed");
  return confirmed.reduce((/** @type {Record<string, number>} */ acc, g) => {
    const meal = g.meal || "regular";
    acc[meal] = (acc[meal] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Group RSVP submissions by date (using rsvpDate field).
 * Returns a map of ISO date string → count of submissions on that day.
 * @param {any[]} guests
 * @returns {Record<string, number>}
 */
export function rsvpSubmissionsByDate(guests) {
  const withDate = guests.filter((g) => g.rsvpDate);
  return withDate.reduce((/** @type {Record<string, number>} */ acc, g) => {
    const date = g.rsvpDate.split("T")[0]; // normalize to YYYY-MM-DD
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Return total expected guest count (guests × their party size).
 * Falls back to 1 if count is missing or 0.
 * @param {any[]} guests
 * @returns {number}
 */
export function totalExpectedCount(guests) {
  return guests.reduce((sum, g) => {
    const count = Number(g.count) || 1;
    const children = Number(g.children) || 0;
    return sum + count + children;
  }, 0);
}

/**
 * Compute guest stats broken down by side (groom / bride / mutual).
 * @param {any[]} guests
 * @returns {Record<string, { total: number, confirmed: number, pending: number }>}
 */
export function guestStatsBySide(guests) {
  /** @type {Record<string, { total: number, confirmed: number, pending: number }>} */
  const result = {};
  for (const g of guests) {
    const side = g.side || "unknown";
    if (!result[side]) result[side] = { total: 0, confirmed: 0, pending: 0 };
    result[side].total += 1;
    if (g.status === "confirmed") result[side].confirmed += 1;
    if (g.status === "pending") result[side].pending += 1;
  }
  return result;
}
