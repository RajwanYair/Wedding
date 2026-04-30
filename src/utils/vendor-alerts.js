/**
 * src/utils/vendor-alerts.js — S459: Vendor payment alert helpers.
 *
 * Pure functions over a Vendor[] list. Identifies vendors with outstanding
 * balances that are overdue or due soon, so the dashboard can surface a toast
 * or badge.
 */

/**
 * @typedef {{
 *   id: string,
 *   name?: string,
 *   price?: number,
 *   paid?: number,
 *   dueDate?: string,
 *   deletedAt?: string|null,
 * }} VendorLite
 */

/**
 * @typedef {object} VendorAlert
 * @property {VendorLite} vendor
 * @property {number} outstanding   Amount still owed (price − paid).
 * @property {number} daysUntilDue  Negative ⇒ overdue.
 * @property {"overdue" | "due-soon"} severity
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @param {string|undefined} iso
 * @returns {Date|null}
 */
function _toDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * @param {VendorLite} v
 * @returns {number}
 */
function _outstanding(v) {
  const price = Number(v.price ?? 0);
  const paid = Number(v.paid ?? 0);
  return Math.max(0, price - paid);
}

/**
 * Find vendors with an outstanding balance whose due date is past or within
 * `dueSoonDays` days.
 *
 * @param {VendorLite[]} vendors
 * @param {{ dueSoonDays?: number, now?: Date|string|number }} [opts]
 * @returns {VendorAlert[]}
 */
export function findOverdueVendors(vendors, opts = {}) {
  const { dueSoonDays = 7, now = new Date() } = opts;
  const today = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(today.getTime())) return [];

  /** @type {VendorAlert[]} */
  const alerts = [];
  for (const v of Array.isArray(vendors) ? vendors : []) {
    if (v.deletedAt) continue;
    const outstanding = _outstanding(v);
    if (outstanding <= 0) continue;
    const due = _toDate(v.dueDate);
    if (!due) continue;
    const days = Math.ceil((due.getTime() - today.getTime()) / DAY_MS);
    if (days < 0) {
      alerts.push({ vendor: v, outstanding, daysUntilDue: days, severity: "overdue" });
    } else if (days <= dueSoonDays) {
      alerts.push({ vendor: v, outstanding, daysUntilDue: days, severity: "due-soon" });
    }
  }
  // Most overdue first, then most-imminent due-soon.
  return alerts.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

/**
 * Sum the outstanding balance across all (non-soft-deleted) vendors.
 * @param {VendorLite[]} vendors
 * @returns {number}
 */
export function totalOutstanding(vendors) {
  if (!Array.isArray(vendors)) return 0;
  return vendors.reduce((sum, v) => (v.deletedAt ? sum : sum + _outstanding(v)), 0);
}
