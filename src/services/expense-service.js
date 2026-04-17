/**
 * src/services/expense-service.js — Expense domain service (Phase 1)
 *
 * Business-logic layer above expenseRepo.
 *
 * Usage:
 *   import { addExpense, getBudgetUsed, getOverBudget } from "../services/expense-service.js";
 */

import { expenseRepo } from "./repositories.js";
import { storeGet } from "../core/store.js";

// ── Mutations ─────────────────────────────────────────────────────────────

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

// ── Budget helpers ─────────────────────────────────────────────────────────

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
  const overBudget = /** @type {Array<{ category: string, used: number, limit: number, over: number }>} */ ([]);

  for (const [category, limit] of Object.entries(categoryLimits)) {
    const used = sums[category] ?? 0;
    if (used > limit) {
      overBudget.push({ category, used, limit, over: used - limit });
    }
  }

  return overBudget;
}

// ── Reporting ─────────────────────────────────────────────────────────────

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
