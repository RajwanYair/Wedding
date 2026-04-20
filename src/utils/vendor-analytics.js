/**
 * src/utils/vendor-analytics.js — Vendor payment timeline analytics (Sprint 33)
 *
 * Pure functions for computing vendor payment status, timeline groupings, and
 * cash-flow projections.  No side effects, no external dependencies.
 *
 * Roadmap ref: Phase 4.2 — Vendor management enhancements
 *
 * @typedef {{
 *   id?:       string,
 *   name?:     string,
 *   category?: string,
 *   price:     number,
 *   paid:      number,
 *   dueDate?:  string,
 * }} Vendor
 *
 * @typedef {{
 *   total:        number,
 *   totalCost:    number,
 *   totalPaid:    number,
 *   outstanding:  number,
 *   overdue:      number,
 *   overdueCount: number,
 *   paidCount:    number,
 *   unpaidCount:  number,
 *   paymentRate:  number,
 * }} VendorPaymentStats
 *
 * @typedef {{
 *   month:          string,
 *   vendors:        Vendor[],
 *   totalDue:       number,
 *   totalPaid:      number,
 *   outstanding:    number,
 *   overdueInMonth: number,
 * }} TimelineBucket
 */

/**
 * Format a Date to a "YYYY-MM" string (Jerusalem locale-safe, no TZ offset).
 * @param {Date} d
 * @returns {string}
 */
function _yearMonth(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Compute high-level vendor payment stats.
 *
 * @param {Vendor[]} vendors
 * @param {Date} [now]  Defaults to current time — override in tests
 * @returns {VendorPaymentStats}
 */
export function computeVendorPaymentStats(vendors, now = new Date()) {
  let totalCost = 0;
  let totalPaid = 0;
  let overdue = 0;
  let overdueCount = 0;
  let paidCount = 0;
  let unpaidCount = 0;

  for (const v of vendors) {
    const price = Number(v.price) || 0;
    const paid  = Number(v.paid)  || 0;
    totalCost += price;
    totalPaid += paid;

    const remaining = price - paid;
    if (remaining <= 0) {
      paidCount += 1;
    } else {
      unpaidCount += 1;
      if (v.dueDate && new Date(v.dueDate) < now) {
        overdueCount += 1;
        overdue += remaining;
      }
    }
  }

  const outstanding = totalCost - totalPaid;
  const paymentRate = totalCost === 0 ? 0 : Math.round((totalPaid / totalCost) * 100);

  return {
    total:        vendors.length,
    totalCost,
    totalPaid,
    outstanding:  Math.max(0, outstanding),
    overdue:      Math.max(0, overdue),
    overdueCount,
    paidCount,
    unpaidCount,
    paymentRate,
  };
}

/**
 * Group vendors by payment due month and compute cash-flow per bucket.
 * Vendors without a `dueDate` are placed in an "undated" bucket.
 *
 * @param {Vendor[]} vendors
 * @param {Date}     [now]  Used to classify overdue items; defaults to new Date()
 * @returns {TimelineBucket[]}  Sorted ascending by month (undated bucket last)
 */
export function computeVendorPaymentTimeline(vendors, now = new Date()) {
  /** @type {Map<string, Vendor[]>} */
  const buckets = new Map();

  for (const v of vendors) {
    const key = v.dueDate ? _yearMonth(new Date(v.dueDate)) : "undated";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(v);
  }

  // Sort: dated buckets ascending, "undated" last
  const sortedKeys = [...buckets.keys()].sort((a, b) => {
    if (a === "undated") return 1;
    if (b === "undated") return -1;
    return a < b ? -1 : 1;
  });

  return sortedKeys.map((month) => {
    const list = buckets.get(month);
    let totalDue   = 0;
    let totalPaid  = 0;
    let overdueInMonth = 0;

    for (const v of list) {
      const price = Number(v.price) || 0;
      const paid  = Number(v.paid)  || 0;
      totalDue  += price;
      totalPaid += paid;
      if (month !== "undated" && new Date(v.dueDate) < now && paid < price) {
        overdueInMonth += price - paid;
      }
    }

    return {
      month,
      vendors:        list,
      totalDue,
      totalPaid,
      outstanding:    Math.max(0, totalDue - totalPaid),
      overdueInMonth: Math.max(0, overdueInMonth),
    };
  });
}

/**
 * Return vendors sorted by how urgently they need payment:
 *   1. Overdue (dueDate < now, still outstanding) — ascending by dueDate
 *   2. Upcoming (dueDate >= now, still outstanding) — ascending by dueDate
 *   3. Fully paid — alphabetical by name
 *   4. No due date — alphabetical by name
 *
 * @param {Vendor[]} vendors
 * @param {Date}     [now]
 * @returns {Vendor[]}
 */
export function sortVendorsByUrgency(vendors, now = new Date()) {
  return [...vendors].sort((a, b) => {
    const aOut = (Number(a.price) || 0) - (Number(a.paid) || 0);
    const bOut = (Number(b.price) || 0) - (Number(b.paid) || 0);
    const aPaid = aOut <= 0;
    const bPaid = bOut <= 0;
    const aDate = a.dueDate ? new Date(a.dueDate) : null;
    const bDate = b.dueDate ? new Date(b.dueDate) : null;

    // Fully paid → move to end
    if (aPaid !== bPaid) return aPaid ? 1 : -1;
    if (aPaid) return (a.name ?? "").localeCompare(b.name ?? "");

    // Both unpaid: no dueDate → lower priority
    if (!aDate && !bDate) return (a.name ?? "").localeCompare(b.name ?? "");
    if (!aDate) return 1;
    if (!bDate) return -1;

    // Overdue first
    const aOverdue = aDate < now;
    const bOverdue = bDate < now;
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

    return aDate.getTime() - bDate.getTime();
  });
}
