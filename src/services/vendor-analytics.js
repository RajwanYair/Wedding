/**
 * src/services/vendor-analytics.js — Vendor payment analytics (Sprint 45 / C1)
 *
 * Aggregates vendor payment data from the store for charting and reporting.
 * Pure functions — no DOM, no network.
 */

import { storeGet } from "../core/store.js";

/**
 * @typedef {{ id: string, name?: string, category?: string,
 *   price?: number, paid?: number, dueDate?: string, updatedAt?: string }} VendorRecord
 *
 * @typedef {{ total: number, paid: number, remaining: number, paymentRate: number }} VendorPaymentSummary
 */

/** @returns {VendorRecord[]} */
function _all() {
  const raw = storeGet("vendors");
  if (!raw) return [];
  return Array.isArray(raw) ? raw : Object.values(raw);
}

/**
 * Overall payment summary across all vendors.
 * @returns {VendorPaymentSummary}
 */
export function getVendorPaymentSummary() {
  const vendors = _all();
  const total = vendors.reduce((sum, v) => sum + (v.price ?? 0), 0);
  const paid = vendors.reduce((sum, v) => sum + (v.paid ?? 0), 0);
  const remaining = total - paid;
  const paymentRate = total > 0 ? paid / total : 0;
  return { total, paid, remaining, paymentRate };
}

/**
 * Per-category payment totals.
 * @returns {{ category: string, total: number, paid: number, remaining: number }[]}
 */
export function getVendorsByCategory() {
  const vendors = _all();
  /** @type {Map<string, { total: number, paid: number }>} */
  const map = new Map();
  for (const v of vendors) {
    const cat = v.category ?? "—";
    const existing = map.get(cat) ?? { total: 0, paid: 0 };
    existing.total += v.price ?? 0;
    existing.paid += v.paid ?? 0;
    map.set(cat, existing);
  }
  return Array.from(map.entries()).map(([category, { total, paid }]) => ({
    category,
    total,
    paid,
    remaining: total - paid,
  }));
}

/**
 * Vendors with a due date in the past and remaining balance > 0.
 * @param {Date} [now]
 * @returns {VendorRecord[]}
 */
export function getOverdueVendors(now = new Date()) {
  return _all().filter((v) => {
    if (!v.dueDate) return false;
    const remaining = (v.price ?? 0) - (v.paid ?? 0);
    return remaining > 0 && new Date(v.dueDate) < now;
  });
}

/**
 * Monthly breakdown of cumulative payments, ordered chronologically.
 * Uses the vendor's updatedAt timestamp to approximate when payments occurred.
 * @returns {{ month: string, paid: number }[]}
 */
export function getPaymentsByMonth() {
  const vendors = _all().filter((v) => (v.paid ?? 0) > 0 && v.updatedAt);

  /** @type {Map<string, number>} */
  const monthMap = new Map();
  for (const v of vendors) {
    const d = new Date(/** @type {string} */ (v.updatedAt));
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, (monthMap.get(key) ?? 0) + (v.paid ?? 0));
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, paid]) => ({ month, paid }));
}

// ── Timeline helpers (merged from vendor-timeline.js, S122) ──────────────

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
