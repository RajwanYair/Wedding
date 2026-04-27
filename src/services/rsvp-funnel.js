/**
 * src/services/rsvp-funnel.js — S123 RSVP funnel chart data.
 *
 * Pure aggregations for the dashboard funnel: invited → sent → opened →
 * responded → confirmed. Inputs are guest rows (the same shape the rest of
 * the app uses); outputs are step+count+percentage tuples ready for d3 /
 * Chart.js consumption.
 */

/** @typedef {{ id: string, status?: "confirmed"|"pending"|"declined"|"maybe", invited?: boolean, sent?: boolean, opened?: boolean, respondedAt?: string|null }} GuestRsvp */

/** @typedef {{ key: string, label: string, count: number, pct: number, dropoff: number }} FunnelStep */

/**
 * Build the RSVP funnel.
 *
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
