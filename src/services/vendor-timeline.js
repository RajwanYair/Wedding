/**
 * src/services/vendor-timeline.js — S122 vendor payment timeline (pure).
 *
 * Pure aggregation helpers consumed by the Vendors dashboard chart. Unlike
 * `vendor-analytics.js` which reads from the store, these functions take
 * vendor / payment arrays directly so they're easy to test and reuse from
 * exports / PDFs.
 */

/** @typedef {{ id: string, name: string, cost?: number, paid?: number, dueDate?: string, category?: string }} VendorInput */
/** @typedef {{ vendorId: string, amount: number, paidAt: string, note?: string }} PaymentInput */
/** @typedef {{ date: string, paid: number, cumulative: number }} TimelinePoint */

const _ymd = (s) => {
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
};

/**
 * Build a daily-aggregated payment timeline (ascending).
 * @param {PaymentInput[]} payments
 * @returns {TimelinePoint[]}
 */
export function buildPaymentTimeline(payments) {
  /** @type {Map<string, number>} */
  const perDay = new Map();
  for (const p of payments ?? []) {
    if (typeof p.amount !== "number" || p.amount <= 0) continue;
    const d = _ymd(p.paidAt);
    if (!d) continue;
    perDay.set(d, (perDay.get(d) ?? 0) + p.amount);
  }
  const dates = Array.from(perDay.keys()).sort();
  let cum = 0;
  return dates.map((date) => {
    const paid = perDay.get(date) ?? 0;
    cum += paid;
    return { date, paid, cumulative: cum };
  });
}

/**
 * Per-vendor outstanding balance (cost - paid). Sorted by outstanding desc.
 * @param {VendorInput[]} vendors
 */
export function buildOutstandingByVendor(vendors) {
  return (vendors ?? [])
    .map((v) => {
      const cost = Number(v.cost ?? 0);
      const paid = Number(v.paid ?? 0);
      return {
        vendorId: v.id,
        name: v.name,
        cost,
        paid,
        outstanding: Math.max(cost - paid, 0),
        overpaid: paid > cost ? paid - cost : 0,
      };
    })
    .sort((a, b) => b.outstanding - a.outstanding);
}

/**
 * Top-N vendors by total cost.
 * @param {VendorInput[]} vendors
 * @param {number} [n=5]
 */
export function topVendorsByCost(vendors, n = 5) {
  return (vendors ?? [])
    .map((v) => ({ id: v.id, name: v.name, cost: Number(v.cost ?? 0) }))
    .filter((v) => v.cost > 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, Math.max(0, n));
}
