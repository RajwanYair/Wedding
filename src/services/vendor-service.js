/**
 * src/services/vendor-service.js — Vendor domain service (Phase 1)
 *
 * Business-logic layer above vendorRepo.
 * Use these functions instead of touching vendorRepo or the store directly.
 *
 * Usage:
 *   import { markVendorPaid, getBudgetSummary } from "../services/vendor-service.js";
 */

import { vendorRepo } from "./repositories.js";

// ── Status transitions ─────────────────────────────────────────────────────

/**
 * Mark a vendor payment as fully paid.
 * @param {string} id
 * @param {number} [amount]  Optional override for the paid amount
 * @returns {Promise<import('../types').Vendor>}
 */
export async function markVendorPaid(id, amount) {
  const vendor = await vendorRepo.getById(id);
  if (!vendor) throw new Error(`Vendor not found: ${id}`);
  return vendorRepo.update(id, {
    paid: amount !== undefined ? amount : vendor.price,
  });
}

/**
 * Record a partial payment for a vendor.
 * @param {string} id
 * @param {number} payment  Amount to add to the current paid total
 * @returns {Promise<import('../types').Vendor>}
 */
export async function addVendorPayment(id, payment) {
  const vendor = await vendorRepo.getById(id);
  if (!vendor) throw new Error(`Vendor not found: ${id}`);
  return vendorRepo.update(id, { paid: (vendor.paid ?? 0) + payment });
}

/**
 * Mark a vendor as booked (price and contact are confirmed).
 * @param {string} id
 * @param {{ price?: number, contact?: string, notes?: string }} [opts]
 * @returns {Promise<import('../types').Vendor>}
 */
export async function markVendorBooked(id, opts = {}) {
  return vendorRepo.update(id, {
    ...(opts.price !== undefined && { price: opts.price }),
    ...(opts.contact && { contact: opts.contact }),
    ...(opts.notes && { notes: opts.notes }),
  });
}

// ── Queries ────────────────────────────────────────────────────────────────

/**
 * Return vendors by their payment status.
 *
 * @param {"paid"|"unpaid"|"partial"} status
 * @returns {Promise<import('../types').Vendor[]>}
 */
export async function getVendorsByPaymentStatus(status) {
  const vendors = await vendorRepo.getActive();
  return vendors.filter((v) => {
    const price = v.price ?? 0;
    const paid = v.paid ?? 0;
    if (status === "paid") return paid >= price && price > 0;
    if (status === "unpaid") return paid === 0;
    if (status === "partial") return paid > 0 && paid < price;
    return false;
  });
}

/**
 * Aggregate vendor budget summary.
 *
 * @returns {Promise<{
 *   total: number,
 *   totalCost: number,
 *   totalPaid: number,
 *   outstanding: number,
 *   paymentRate: number,
 *   byCategory: Record<string, { count: number, cost: number, paid: number }>
 * }>}
 */
export async function getBudgetSummary() {
  const vendors = await vendorRepo.getActive();

  /** @type {Record<string, { count: number, cost: number, paid: number }>} */
  const byCategory = {};
  let totalCost = 0;
  let totalPaid = 0;

  for (const v of vendors) {
    const cost = v.price ?? 0;
    const paid = v.paid ?? 0;
    totalCost += cost;
    totalPaid += paid;

    const cat = v.category ?? "other";
    if (!byCategory[cat]) byCategory[cat] = { count: 0, cost: 0, paid: 0 };
    byCategory[cat].count++;
    byCategory[cat].cost += cost;
    byCategory[cat].paid += paid;
  }

  const outstanding = Math.max(0, totalCost - totalPaid);
  const paymentRate = totalCost > 0 ? Math.round((totalPaid / totalCost) * 100) : 0;

  return {
    total: vendors.length,
    totalCost,
    totalPaid,
    outstanding,
    paymentRate,
    byCategory,
  };
}

/**
 * Find vendors that need attention (big outstanding balances).
 * @param {number} [threshold]  Minimum outstanding amount (default 0)
 * @returns {Promise<Array<import('../types').Vendor & { outstanding: number }>>}
 */
export async function getUnpaidVendors(threshold = 0) {
  const vendors = await vendorRepo.getActive();
  return vendors
    .map((v) => ({ ...v, outstanding: Math.max(0, (v.price ?? 0) - (v.paid ?? 0)) }))
    .filter((v) => v.outstanding > threshold);
}
