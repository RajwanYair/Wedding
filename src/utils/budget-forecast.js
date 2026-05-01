/**
 * Budget forecast — project final spend from current expenses against a budget.
 *
 * Pure functions over expense + budget arrays.
 *
 * @typedef {object} ForecastExpense
 * @property {string} category
 * @property {number} amount   Spent so far in this category.
 * @property {number} [planned] Optional originally planned amount.
 *
 * @typedef {object} BudgetLine
 * @property {string} category
 * @property {number} amount   Allocated budget for this category.
 *
 * @typedef {object} CategoryForecast
 * @property {string} category
 * @property {number} budget
 * @property {number} spent
 * @property {number} remaining
 * @property {number} variance       budget − spent (negative ⇒ over-budget).
 * @property {number} utilisation    spent / budget (0 if budget is zero).
 * @property {boolean} overBudget
 *
 * @typedef {object} ForecastSummary
 * @property {number} totalBudget
 * @property {number} totalSpent
 * @property {number} totalRemaining
 * @property {number} utilisation
 * @property {number} categoriesOverBudget
 * @property {CategoryForecast[]} categories
 * @owner shared
 */

/**
 * Reduce expense rows into per-category totals.
 *
 * @param {ReadonlyArray<ForecastExpense>} expenses
 * @returns {Map<string, number>}
 */
export function spendByCategory(expenses) {
  /** @type {Map<string, number>} */
  const map = new Map();
  for (const e of expenses) {
    if (!e || typeof e.category !== "string") continue;
    const amt = Number(e.amount);
    if (!Number.isFinite(amt)) continue;
    map.set(e.category, (map.get(e.category) ?? 0) + amt);
  }
  return map;
}

/**
 * Build a per-category and overall forecast.
 *
 * @param {ReadonlyArray<BudgetLine>} budget
 * @param {ReadonlyArray<ForecastExpense>} expenses
 * @returns {ForecastSummary}
 */
export function forecast(budget, expenses) {
  const spent = spendByCategory(expenses);
  /** @type {CategoryForecast[]} */
  const categories = [];
  let totalBudget = 0;
  let totalSpent = 0;
  let categoriesOverBudget = 0;

  const seen = new Set();
  for (const line of budget) {
    if (!line || typeof line.category !== "string") continue;
    const b = Number(line.amount);
    const budgetAmt = Number.isFinite(b) ? b : 0;
    const s = spent.get(line.category) ?? 0;
    seen.add(line.category);
    const variance = budgetAmt - s;
    const overBudget = s > budgetAmt;
    if (overBudget) categoriesOverBudget += 1;
    totalBudget += budgetAmt;
    totalSpent += s;
    categories.push({
      category: line.category,
      budget: budgetAmt,
      spent: s,
      remaining: variance,
      variance,
      utilisation: budgetAmt > 0 ? s / budgetAmt : 0,
      overBudget,
    });
  }

  // Categories with spend but no budget line.
  for (const [cat, s] of spent) {
    if (seen.has(cat)) continue;
    totalSpent += s;
    categoriesOverBudget += 1;
    categories.push({
      category: cat,
      budget: 0,
      spent: s,
      remaining: -s,
      variance: -s,
      utilisation: 0,
      overBudget: true,
    });
  }

  return {
    totalBudget,
    totalSpent,
    totalRemaining: totalBudget - totalSpent,
    utilisation: totalBudget > 0 ? totalSpent / totalBudget : 0,
    categoriesOverBudget,
    categories,
  };
}

/**
 * Linear projection of final spend at a given progress ratio (0..1).
 * Useful before the wedding to estimate end-state cost from interim spending.
 *
 * @param {number} spent       Currently spent.
 * @param {number} progress    0..1 share of timeline elapsed.
 * @returns {number} Projected total at completion (NaN if progress ≤ 0).
 */
export function projectFinal(spent, progress) {
  const p = Number(progress);
  const s = Number(spent);
  if (!Number.isFinite(p) || !Number.isFinite(s) || p <= 0) return Number.NaN;
  return s / Math.min(1, p);
}
