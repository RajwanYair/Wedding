/**
 * src/services/expense-analytics.js — Sprint 127
 *
 * Expense analytics: totals by category, trend over time, budget utilisation.
 */

import { storeGet } from "../core/store.js";

const _KEY = "expenses";

/**
 * @typedef {{ id: string, category: string, description: string,
 *   amount: number, date: string, createdAt: string }} Expense
 */

/** @returns {Expense[]} */
function _all() {
  const raw = storeGet(_KEY);
  if (!raw) return [];
  return Array.isArray(raw) ? raw : Object.values(raw);
}

/**
 * Sum all expenses.
 * @returns {number}
 */
export function getTotalExpenses() {
  return _all().reduce((sum, e) => sum + (e.amount ?? 0), 0);
}

/**
 * Group expenses by category with subtotals.
 * @returns {Record<string, { count: number, total: number, items: Expense[] }>}
 */
export function groupByCategory() {
  /** @type {Record<string, { count: number, total: number, items: Expense[] }>} */
  const result = {};
  for (const e of _all()) {
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
  for (const e of _all()) {
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
    remaining:       budget - spent,
    utilizationRate: budget > 0 ? spent / budget : 0,
    isOver:          spent > budget,
  };
}
