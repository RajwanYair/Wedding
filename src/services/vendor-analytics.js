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
