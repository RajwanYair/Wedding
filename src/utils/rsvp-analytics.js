/**
 * src/utils/rsvp-analytics.js — S658 RSVP response analytics & trends
 *
 * Pure helpers for analysing RSVP responses — response rate over time,
 * status distribution, daily response velocity, and predictions for
 * remaining responses.
 *
 * @module rsvp-analytics
 * @owner rsvp
 */

/**
 * @typedef {object} RsvpResponse
 * @property {string} guestId
 * @property {string} status - "confirmed"|"declined"|"pending"|"maybe"
 * @property {string} respondedAt - ISO date string
 * @property {number} [partySize]
 */

/**
 * Status distribution counts.
 *
 * @param {RsvpResponse[]} responses
 * @returns {{ confirmed: number, declined: number, pending: number, maybe: number, total: number }}
 */
export function statusDistribution(responses) {
  if (!Array.isArray(responses)) {
    return { confirmed: 0, declined: 0, pending: 0, maybe: 0, total: 0 };
  }

  let confirmed = 0;
  let declined = 0;
  let pending = 0;
  let maybe = 0;

  for (const r of responses) {
    switch (r.status) {
      case "confirmed": confirmed++; break;
      case "declined": declined++; break;
      case "maybe": maybe++; break;
      default: pending++; break;
    }
  }

  return { confirmed, declined, pending, maybe, total: responses.length };
}

/**
 * Response rate as a percentage.
 *
 * @param {RsvpResponse[]} responses
 * @returns {number}
 */
export function responseRate(responses) {
  if (!Array.isArray(responses) || responses.length === 0) return 0;
  const responded = responses.filter((r) => r.status !== "pending").length;
  return Math.round((responded / responses.length) * 100);
}

/**
 * Total confirmed headcount including party sizes.
 *
 * @param {RsvpResponse[]} responses
 * @returns {number}
 */
export function confirmedHeadcount(responses) {
  if (!Array.isArray(responses)) return 0;
  return responses
    .filter((r) => r.status === "confirmed")
    .reduce((sum, r) => sum + (r.partySize ?? 1), 0);
}

/**
 * Group responses by date (YYYY-MM-DD).
 *
 * @param {RsvpResponse[]} responses
 * @returns {Record<string, number>}
 */
export function responsesByDate(responses) {
  if (!Array.isArray(responses)) return {};
  /** @type {Record<string, number>} */
  const counts = {};
  for (const r of responses) {
    if (!r.respondedAt) continue;
    const date = r.respondedAt.slice(0, 10);
    counts[date] = (counts[date] ?? 0) + 1;
  }
  return counts;
}

/**
 * Average daily response velocity over the last N days.
 *
 * @param {RsvpResponse[]} responses
 * @param {number} [days=7]
 * @returns {number}
 */
export function dailyVelocity(responses, days = 7) {
  if (!Array.isArray(responses) || responses.length === 0) return 0;

  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const recent = responses.filter((r) => r.respondedAt && r.respondedAt >= cutoff && r.status !== "pending");
  return Math.round((recent.length / days) * 10) / 10;
}

/**
 * Predict days until all pending responses are in, based on current velocity.
 *
 * @param {RsvpResponse[]} responses
 * @param {number} [velocityDays=7]
 * @returns {number|null} Estimated days, or null if velocity is 0
 */
export function predictCompletionDays(responses, velocityDays = 7) {
  if (!Array.isArray(responses)) return null;

  const pending = responses.filter((r) => r.status === "pending").length;
  if (pending === 0) return 0;

  const velocity = dailyVelocity(responses, velocityDays);
  if (velocity <= 0) return null;

  return Math.ceil(pending / velocity);
}

/**
 * Find guests who haven't responded (status = pending).
 *
 * @param {RsvpResponse[]} responses
 * @returns {string[]} Guest IDs
 */
export function pendingGuestIds(responses) {
  if (!Array.isArray(responses)) return [];
  return responses.filter((r) => r.status === "pending").map((r) => r.guestId);
}

/**
 * Response funnel — how many at each stage.
 *
 * @param {RsvpResponse[]} responses
 * @returns {{ invited: number, opened: number, responded: number, confirmed: number }}
 */
export function responseFunnel(responses) {
  if (!Array.isArray(responses)) {
    return { invited: 0, opened: 0, responded: 0, confirmed: 0 };
  }

  const invited = responses.length;
  const responded = responses.filter((r) => r.status !== "pending").length;
  const confirmed = responses.filter((r) => r.status === "confirmed").length;

  return {
    invited,
    opened: invited, // assume all invitations are received
    responded,
    confirmed,
  };
}

/**
 * Full analytics summary.
 *
 * @param {RsvpResponse[]} responses
 * @returns {{ distribution: ReturnType<typeof statusDistribution>, rate: number, headcount: number, funnel: ReturnType<typeof responseFunnel>, velocity: number, predictedDays: number|null }}
 */
export function rsvpSummary(responses) {
  return {
    distribution: statusDistribution(responses),
    rate: responseRate(responses),
    headcount: confirmedHeadcount(responses),
    funnel: responseFunnel(responses),
    velocity: dailyVelocity(responses),
    predictedDays: predictCompletionDays(responses),
  };
}
