/**
 * src/services/budget-burndown.js — Budget burn-down analytics (Sprint 46 / C1)
 *
 * Computes cumulative spend over time versus a budget target.
 * Pure functions — no DOM, no network.
 */

import { storeGet } from "../core/store.js";

/**
 * @typedef {{ date: string, cumulative: number, target: number }} BurndownPoint
 * @typedef {{ points: BurndownPoint[], totalBudget: number, totalSpent: number }} BurndownData
 */

/** @returns {{ amount: number, createdAt?: string, updatedAt?: string }[]} */
function _allExpenses() {
  const raw = storeGet("expenses");
  if (!raw) return [];
  return Array.isArray(raw) ? raw : Object.values(raw);
}

/**
 * Compute cumulative spend timeline for a burn-down chart.
 *
 * @param {number} [budgetTarget]  Total budget ceiling; defaults to weddingInfo.budget or 0.
 * @returns {BurndownData}
 */
export function getBurndownData(budgetTarget) {
  const info = /** @type {any} */ (storeGet("weddingInfo") ?? {});
  const target = budgetTarget ?? (typeof info.budget === "number" ? info.budget : 0);

  const expenses = _allExpenses().filter((e) => {
    const ts = e.createdAt ?? e.updatedAt;
    return ts && !Number.isNaN(new Date(ts).getTime());
  });

  // Sort by creation date
  expenses.sort((a, b) => {
    const ta = new Date(a.createdAt ?? a.updatedAt ?? 0).getTime();
    const tb = new Date(b.createdAt ?? b.updatedAt ?? 0).getTime();
    return ta - tb;
  });

  let cumulative = 0;
  /** @type {BurndownPoint[]} */
  const points = expenses.map((e) => {
    cumulative += e.amount ?? 0;
    const rawDate = e.createdAt ?? e.updatedAt ?? "";
    const date = rawDate.slice(0, 10); // YYYY-MM-DD
    return { date, cumulative, target };
  });

  return { points, totalBudget: target, totalSpent: cumulative };
}

/**
 * Estimated date when spending reaches the budget target.
 * Returns null if there are fewer than 2 data points or no remaining budget.
 *
 * @param {number} [budgetTarget]
 * @returns {string|null}  ISO date string (YYYY-MM-DD) or null
 */
export function getProjectedEndDate(budgetTarget) {
  const { points, totalBudget } = getBurndownData(budgetTarget);
  if (points.length < 2 || totalBudget <= 0) return null;

  const first = points[0];
  const last = points[points.length - 1];
  if (last.cumulative >= totalBudget) return last.date;

  const msDiff = new Date(last.date).getTime() - new Date(first.date).getTime();
  const spendDiff = last.cumulative - first.cumulative;
  if (spendDiff <= 0) return null;

  const msPerUnit = msDiff / spendDiff;
  const remaining = totalBudget - last.cumulative;
  const projectedMs = new Date(last.date).getTime() + remaining * msPerUnit;
  return new Date(projectedMs).toISOString().slice(0, 10);
}

/**
 * Percentage of budget consumed.
 * @param {number} [budgetTarget]
 * @returns {number}  0–100
 */
export function getBudgetConsumptionPct(budgetTarget) {
  const { points, totalBudget } = getBurndownData(budgetTarget);
  if (totalBudget <= 0 || points.length === 0) return 0;
  return Math.min(100, Math.round((points[points.length - 1].cumulative / totalBudget) * 100));
}
