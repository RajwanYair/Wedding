/**
 * src/services/financial-analytics.js — Expense + vendor analytics (S216)
 *
 * Merged from:
 *   - expense-analytics.js (Sprint 127) — expense totals, categories, monthly trends
 *   - vendor-analytics.js (Sprint 45 / C1) — vendor payment summary, timeline
 *
 * Pure functions — no DOM, no network.
 */

import { storeGet } from "../core/store.js";

// ── Expense Analytics ────────────────────────────────────────────────────────

const _EXPENSE_KEY = "expenses";

/**
 * @typedef {{ id: string, category: string, description: string,
 *   amount: number, date: string, createdAt: string }} Expense
 */

/** @returns {Expense[]} */
function _allExpenses() {
  const raw = storeGet(_EXPENSE_KEY);
  if (!raw) return [];
  return Array.isArray(raw) ? raw : Object.values(raw);
}

/**
 * Sum all expenses.
 * @returns {number}
 */
export function getTotalExpenses() {
  return _allExpenses().reduce((sum, e) => sum + (e.amount ?? 0), 0);
}

/**
 * Group expenses by category with subtotals.
 * @returns {Record<string, { count: number, total: number, items: Expense[] }>}
 */
export function groupByCategory() {
  /** @type {Record<string, { count: number, total: number, items: Expense[] }>} */
  const result = {};
  for (const e of _allExpenses()) {
    const cat = e.category ?? "other";
    if (!result[cat]) result[cat] = { count: 0, total: 0, items: [] };
    result[cat].count += 1;
    result[cat].total += e.amount ?? 0;
    result[cat].items.push(e);
  }
  return result;
}

/**
 * Return the top N categories by spend.
 * @param {number} [n=5]
 * @returns {{ category: string, total: number, count: number }[]}
 */
export function getTopCategories(n = 5) {
  return Object.entries(groupByCategory())
    .map(([category, { total, count }]) => ({ category, total, count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
}

/**
 * Monthly expense totals.
 * @returns {{ month: string, total: number }[]}   sorted ascending by month
 */
export function getMonthlyTotals() {
  /** @type {Record<string, number>} */
  const months = {};
  for (const e of _allExpenses()) {
    if (!e.date) continue;
    const month = e.date.slice(0, 7); // "YYYY-MM"
    months[month] = (months[month] ?? 0) + (e.amount ?? 0);
  }
  return Object.entries(months)
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => (a.month > b.month ? 1 : -1));
}

/**
 * Budget utilisation as a ratio (0–1+).
 * @param {number} budget  Total budget
 * @returns {{ spent: number, remaining: number, utilizationRate: number, isOver: boolean }}
 */
export function getBudgetUtilization(budget) {
  const spent = getTotalExpenses();
  return {
    spent,
    remaining: budget - spent,
    utilizationRate: budget > 0 ? spent / budget : 0,
    isOver: spent > budget,
  };
}

// ── Vendor Analytics ─────────────────────────────────────────────────────────

/**
 * @typedef {{ id: string, name?: string, category?: string,
 *   price?: number, paid?: number, dueDate?: string, updatedAt?: string }} VendorRecord
 *
 * @typedef {{ total: number, paid: number, remaining: number, paymentRate: number }} VendorPaymentSummary
 */

/** @returns {VendorRecord[]} */
function _allVendors() {
  const raw = storeGet("vendors");
  if (!raw) return [];
  return Array.isArray(raw) ? raw : Object.values(raw);
}

/**
 * Overall payment summary across all vendors.
 * @returns {VendorPaymentSummary}
 */
export function getVendorPaymentSummary() {
  const vendors = _allVendors();
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
  const vendors = _allVendors();
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
  return _allVendors().filter((v) => {
    if (!v.dueDate) return false;
    const remaining = (v.price ?? 0) - (v.paid ?? 0);
    return remaining > 0 && new Date(v.dueDate) < now;
  });
}

/**
 * Monthly breakdown of cumulative payments, ordered chronologically.
 * @returns {{ month: string, paid: number }[]}
 */
export function getPaymentsByMonth() {
  const vendors = _allVendors().filter((v) => (v.paid ?? 0) > 0 && v.updatedAt);

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

// ── Timeline helpers ─────────────────────────────────────────────────────────

/** @typedef {{ id: string, name: string, cost?: number, paid?: number, dueDate?: string, category?: string }} VendorInput */
/** @typedef {{ vendorId: string, amount: number, paidAt: string, note?: string }} PaymentInput */
/** @typedef {{ date: string, paid: number, cumulative: number }} TimelinePoint */

const _ymd = (/** @type {string} */ s) => {
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
