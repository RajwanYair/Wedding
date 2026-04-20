/**
 * src/utils/budget-burndown.js — Budget burn-down chart data utility
 *
 * Pure functions that transform an expense list + total budget into a time-
 * series suitable for rendering a burn-down (or burn-up) chart.
 * No side effects, no external deps — fully testable.
 */

/**
 * @typedef {{
 *   date:       string,
 *   amount:     number,
 *   category?:  string,
 *   paid?:      boolean,
 * }} Expense
 *
 * @typedef {{
 *   date:       string,
 *   spend:      number,
 *   cumulative: number,
 *   remaining:  number,
 *   pct:        number,
 * }} BurndownPoint
 *
 * @typedef {{
 *   points:        BurndownPoint[],
 *   totalBudget:   number,
 *   totalSpend:    number,
 *   remaining:     number,
 *   pct:           number,
 *   overBudget:    boolean,
 * }} BurndownResult
 */

/**
 * Compute budget burn-down chart data from a list of expenses.
 *
 * Steps:
 *  1. Filter expenses that have a valid date string.
 *  2. Sort chronologically.
 *  3. Group daily spend totals.
 *  4. Accumulate cumulative spend, compute remaining and percentage per day.
 *
 * @param {Expense[]} expenses
 * @param {number} totalBudget  Total planned budget (must be >= 0).
 * @returns {BurndownResult}
 */
export function computeBudgetBurndown(expenses, totalBudget) {
  const budget = Math.max(0, Number(totalBudget) || 0);

  // Normalize: keep only expenses with a parseable date
  const valid = expenses.filter((e) => {
    if (!e.date) return false;
    const d = new Date(e.date);
    return !Number.isNaN(d.getTime());
  });

  // Sort ascending by date
  valid.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Group by ISO date (YYYY-MM-DD)
  /** @type {Map<string, number>} */
  const dailyMap = new Map();
  for (const e of valid) {
    const key = new Date(e.date).toISOString().slice(0, 10);
    const amount = Math.max(0, Number(e.amount) || 0);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + amount);
  }

  // Build data points
  let cumulative = 0;
  /** @type {BurndownPoint[]} */
  const points = [];
  for (const [date, spend] of dailyMap) {
    cumulative += spend;
    const remaining = budget - cumulative;
    const pct = budget === 0 ? 0 : Math.round((cumulative / budget) * 100);
    points.push({ date, spend, cumulative, remaining, pct });
  }

  const totalSpend = cumulative;
  const remaining = budget - totalSpend;
  const pct = budget === 0 ? 0 : Math.round((totalSpend / budget) * 100);

  return {
    points,
    totalBudget:  budget,
    totalSpend,
    remaining,
    pct,
    overBudget:   totalSpend > budget,
  };
}

/**
 * Return a filtered view of `BurndownResult.points` up to and including
 * `untilDate` (inclusive, ISO date string "YYYY-MM-DD").
 *
 * @param {BurndownPoint[]} points
 * @param {string} untilDate  ISO date string "YYYY-MM-DD"
 * @returns {BurndownPoint[]}
 */
export function sliceBurndownUpTo(points, untilDate) {
  return points.filter((p) => p.date <= untilDate);
}

/**
 * Return the projected total spend by extrapolating the current daily average
 * over `totalDays` remaining days.
 *
 * @param {BurndownPoint[]} points
 * @param {number} totalDays  How many days the budget covers in total.
 * @returns {number}  Projected total spend (rounded to 2 decimal places).
 */
export function projectFinalSpend(points, totalDays) {
  if (!points.length || totalDays <= 0) return 0;
  const totalSpend = points[points.length - 1].cumulative;
  const daysElapsed = points.length;
  const dailyAvg = totalSpend / daysElapsed;
  return Math.round(dailyAvg * totalDays * 100) / 100;
}
