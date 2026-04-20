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

// ── 6-Stage RSVP Funnel (Sprint 27 / Roadmap 3.2) ─────────────────────────

/**
 * @typedef {{
 *   invited:      number,
 *   link_sent:    number,
 *   link_clicked: number,
 *   form_started: number,
 *   confirmed:    number,
 *   checked_in:   number,
 * }} RsvpFunnelCounts
 *
 * @typedef {RsvpFunnelCounts & {
 *   conversionRates: {
 *     linkSentRate:    number,
 *     clickRate:       number,
 *     formStartRate:   number,
 *     confirmRate:     number,
 *     checkinRate:     number,
 *     overallRate:     number,
 *   }
 * }} RsvpFunnel
 */

/**
 * Compute the 6-stage RSVP conversion funnel from a guest list.
 *
 * Guest fields used:
 *  - `funnelStage` (optional string): explicit stage key if tracked
 *  - `inviteSent` (boolean/truthy): invitation was sent
 *  - `linkSent` (boolean/truthy): RSVP link was sent
 *  - `linkClicked` (boolean/truthy): guest opened their RSVP link
 *  - `formStarted` (boolean/truthy): guest began filling the form
 *  - `status === "confirmed"`: guest confirmed attendance
 *  - `checkedIn` (boolean/truthy): guest was checked in on event day
 *
 * When `funnelStage` is absent the function infers stage from the guest
 * fields above in order of precedence.
 *
 * @param {any[]} guests
 * @returns {RsvpFunnel}
 */
export function computeRsvpFunnel(guests) {  const counts = {
    invited:      0,
    link_sent:    0,
    link_clicked: 0,
    form_started: 0,
    confirmed:    0,
    checked_in:   0,
  };

  for (const g of guests) {
    counts.invited += 1;
    const stage = g.funnelStage;
    if (stage) {
      // Explicit stage: count all stages up to and including this one
      if (["link_sent", "link_clicked", "form_started", "confirmed", "checked_in"].includes(stage)) counts.link_sent += 1;
      if (["link_clicked", "form_started", "confirmed", "checked_in"].includes(stage)) counts.link_clicked += 1;
      if (["form_started", "confirmed", "checked_in"].includes(stage)) counts.form_started += 1;
      if (["confirmed", "checked_in"].includes(stage)) counts.confirmed += 1;
      if (stage === "checked_in") counts.checked_in += 1;
    } else {
      // Infer from boolean flags + status
      const sent    = !!(g.inviteSent   || g.linkSent);
      const clicked = !!(g.linkClicked);
      const started = !!(g.formStarted);
      const conf    = g.status === "confirmed";
      const ci      = !!(g.checkedIn);
      if (sent    || clicked || started || conf || ci) counts.link_sent    += 1;
      if (clicked || started || conf    || ci)         counts.link_clicked += 1;
      if (started || conf    || ci)                    counts.form_started += 1;
      if (conf    || ci)                               counts.confirmed    += 1;
      if (ci)                                          counts.checked_in   += 1;
    }
  }

  const total = counts.invited;
  const pct = (n) => total === 0 ? 0 : Math.round((n / total) * 100);

  return {
    ...counts,
    conversionRates: {
      linkSentRate:   pct(counts.link_sent),
      clickRate:      pct(counts.link_clicked),
      formStartRate:  pct(counts.form_started),
      confirmRate:    pct(counts.confirmed),
      checkinRate:    pct(counts.checked_in),
      overallRate:    pct(counts.confirmed),
    },
  };
}

// ── Dietary Breakdown for Catering (Sprint 28) ────────────────────────────

/**
 * @typedef {{
 *   byMeal:          Record<string, number>,
 *   byAccessibility: Record<string, number>,
 *   totalHeads:      number,
 *   confirmedHeads:  number,
 *   byTable:         Record<string, { byMeal: Record<string, number>, totalHeads: number }>,
 * }} DietaryBreakdown
 */

/**
 * Compute a comprehensive dietary breakdown for kitchen/catering planning.
 *
 * - `byMeal`: meal-type counts weighted by party head count (guests + children),
 *   covering confirmed guests only.
 * - `byAccessibility`: free-form accessibility note tallied for ALL confirmed
 *   guests with a non-empty note.
 * - `totalHeads`: total head count across all (confirmed + pending) guests.
 * - `confirmedHeads`: head count for confirmed guests only.
 * - `byTable`: per-table meal breakdown (confirmed guests only).
 *
 * @param {any[]} guests
 * @returns {DietaryBreakdown}
 */
export function computeDietaryBreakdown(guests) {
  /** @type {Record<string, number>} */
  const byMeal = {};
  /** @type {Record<string, number>} */
  const byAccessibility = {};
  /** @type {Record<string, { byMeal: Record<string, number>, totalHeads: number }>} */
  const byTable = {};

  let totalHeads = 0;
  let confirmedHeads = 0;

  for (const g of guests) {
    const heads = (Number(g.count) || 1) + (Number(g.children) || 0);
    totalHeads += heads;

    if (g.status !== "confirmed") continue;

    confirmedHeads += heads;

    // Meal breakdown (weighted by head count)
    const meal = g.meal || "regular";
    byMeal[meal] = (byMeal[meal] || 0) + heads;

    // Accessibility notes (per-guest, not weighted)
    const note = typeof g.accessibility === "string" ? g.accessibility.trim() : "";
    if (note) {
      byAccessibility[note] = (byAccessibility[note] || 0) + 1;
    }

    // Per-table breakdown
    const tid = g.tableId || "__unassigned__";
    if (!byTable[tid]) byTable[tid] = { byMeal: {}, totalHeads: 0 };
    byTable[tid].byMeal[meal] = (byTable[tid].byMeal[meal] || 0) + heads;
    byTable[tid].totalHeads += heads;
  }

  return { byMeal, byAccessibility, totalHeads, confirmedHeads, byTable };
}
