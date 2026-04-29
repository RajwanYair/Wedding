/**
 * src/services/commerce-service.js — Commerce domain service (S241)
 *
 * Merged from expense-service.js + vendor-service.js.
 *
 * §1  Expense mutations & budget helpers
 * §2  Vendor mutations & payment helpers
 * §3  Shared budget reporting
 *
 * Usage:
 *   import { addExpense, getBudgetUsed, getOverBudget } from "../services/commerce-service.js";
 *   import { markVendorPaid, getBudgetSummary } from "../services/commerce-service.js";
 */

import { expenseRepo, vendorRepo } from "./repositories.js";
import { storeGet } from "../core/store.js";

// ── §1  Expense mutations ─────────────────────────────────────────────────

/**
 * Add a new expense record.
 * @param {{ category: string, description: string, amount: number, date?: string }} data
 * @returns {Promise<import('../types').Expense>}
 */
export async function addExpense(data) {
  if (typeof data.amount !== "number" || data.amount < 0) {
    throw new Error("Expense amount must be a non-negative number");
  }
  return expenseRepo.create({
    category: String(data.category ?? "other").trim(),
    description: String(data.description ?? "").trim(),
    amount: data.amount,
    date: data.date ?? new Date().toISOString().slice(0, 10),
  });
}

/**
 * Update an existing expense.
 * @param {string} id
 * @param {Partial<{ category: string, description: string, amount: number, date: string }>} patch
 * @returns {Promise<import('../types').Expense>}
 */
export async function updateExpense(id, patch) {
  if (patch.amount !== undefined && (typeof patch.amount !== "number" || patch.amount < 0)) {
    throw new Error("Expense amount must be a non-negative number");
  }
  return expenseRepo.update(id, patch);
}

/**
 * Remove an expense.
 * @param {string} id
 */
export async function removeExpense(id) {
  return expenseRepo.delete(id);
}

// ── §1  Budget helpers ────────────────────────────────────────────────────

/**
 * Return total amount spent (all expenses).
 * @returns {Promise<number>}
 */
export async function getBudgetUsed() {
  const expenses = await expenseRepo.getAll();
  return expenses.reduce((s, e) => s + (e.amount ?? 0), 0);
}

/**
 * Return the configured total budget, or 0 if not set.
 * @returns {number}
 */
export function getBudgetTotal() {
  const info = /** @type {Record<string,unknown>} */ (storeGet("weddingInfo") ?? {});
  return Number(info.budget ?? 0);
}

/**
 * Return remaining budget (budget - used). Can be negative.
 * @returns {Promise<number>}
 */
export async function getBudgetRemaining() {
  const used = await getBudgetUsed();
  return getBudgetTotal() - used;
}

/**
 * Return expenses that push their category above a per-category limit.
 *
 * @param {Record<string, number>} categoryLimits  Map of category → max amount
 * @returns {Promise<Array<{ category: string, used: number, limit: number, over: number }>>}
 */
export async function getOverBudget(categoryLimits) {
  const sums = await expenseRepo.sumByCategory();
  const overBudget =
    /** @type {Array<{ category: string, used: number, limit: number, over: number }>} */ ([]);

  for (const [category, limit] of Object.entries(categoryLimits)) {
    const used = sums[category] ?? 0;
    if (used > limit) {
      overBudget.push({ category, used, limit, over: used - limit });
    }
  }

  return overBudget;
}

/**
 * Summarize expenses: totals by category + grand total.
 *
 * @returns {Promise<{
 *   total: number,
 *   count: number,
 *   byCategory: Record<string, { count: number, total: number }>
 * }>}
 */
export async function getExpenseSummary() {
  const expenses = await expenseRepo.getAll();

  /** @type {Record<string, { count: number, total: number }>} */
  const byCategory = {};
  let total = 0;

  for (const e of expenses) {
    const cat = e.category ?? "other";
    if (!byCategory[cat]) byCategory[cat] = { count: 0, total: 0 };
    byCategory[cat].count++;
    byCategory[cat].total += e.amount ?? 0;
    total += e.amount ?? 0;
  }

  return { total, count: expenses.length, byCategory };
}

/**
 * Return expenses within a date range (inclusive).
 * @param {string} from  ISO date string (YYYY-MM-DD)
 * @param {string} to    ISO date string (YYYY-MM-DD)
 * @returns {Promise<import('../types').Expense[]>}
 */
export async function getExpensesByDateRange(from, to) {
  const expenses = await expenseRepo.getAll();
  return expenses.filter((e) => {
    const d = e.date ?? "";
    return d >= from && d <= to;
  });
}

// ── §2  Vendor mutations ──────────────────────────────────────────────────

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

// ── §2  Vendor queries ────────────────────────────────────────────────────

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
