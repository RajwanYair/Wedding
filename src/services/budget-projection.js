/**
 * src/services/budget-projection.js — S124 budget burn-down (pure).
 *
 * Pure aggregation helpers for the budget chart. Unlike the existing
 * `budget-burndown.js` which reads from the store, these functions take
 * `expenses[]` directly so they're easy to test and reuse for exports.
 */

/** @typedef {{ amount: number, paidAt: string, category?: string }} ExpenseInput */
/** @typedef {{ date: string, spent: number, remaining: number }} BurndownPoint */

const _ymd = (s) => {
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
};

/**
 * Build a per-day burn-down series.
 *
 * @param {number} budgetTotal
 * @param {ExpenseInput[]} expenses
 * @returns {BurndownPoint[]}
 */
export function buildBurndownSeries(budgetTotal, expenses) {
  const total = Math.max(0, Number(budgetTotal) || 0);
  /** @type {Map<string, number>} */
  const perDay = new Map();
  for (const e of expenses ?? []) {
    if (typeof e.amount !== "number" || e.amount <= 0) continue;
    const d = _ymd(e.paidAt);
    if (!d) continue;
    perDay.set(d, (perDay.get(d) ?? 0) + e.amount);
  }
  const dates = Array.from(perDay.keys()).sort();
  let spent = 0;
  return dates.map((date) => {
    spent += perDay.get(date) ?? 0;
    return { date, spent, remaining: total - spent };
  });
}

/**
 * Project total spend at event date using average daily burn.
 *
 * @param {number} budgetTotal
 * @param {ExpenseInput[]} expenses
 * @param {string} eventDate ISO date
 * @param {Date} [now=new Date()]
 */
export function projectOverrun(budgetTotal, expenses, eventDate, now = new Date()) {
  const total = Math.max(0, Number(budgetTotal) || 0);
  const list = (expenses ?? []).filter(
    (e) => typeof e.amount === "number" && e.amount > 0 && _ymd(e.paidAt),
  );
  if (list.length === 0) {
    return { projectedSpend: 0, projectedOverrun: -total, dailyBurn: 0 };
  }
  const sortedMs = list.map((e) => Date.parse(e.paidAt)).sort((a, b) => a - b);
  const first = sortedMs[0];
  const todayMs = now.getTime();
  const eventMs = Date.parse(eventDate);
  const daysSoFar = Math.max(1, Math.ceil((todayMs - first) / 86_400_000));
  const spent = list.reduce((s, e) => s + e.amount, 0);
  const dailyBurn = spent / daysSoFar;
  const daysRemaining = Math.max(0, Math.ceil((eventMs - todayMs) / 86_400_000));
  const projectedSpend = spent + dailyBurn * daysRemaining;
  return { projectedSpend, projectedOverrun: projectedSpend - total, dailyBurn };
}

/**
 * Sum spend per category (sorted desc).
 * @param {ExpenseInput[]} expenses
 */
export function categoryBreakdown(expenses) {
  /** @type {Map<string, number>} */
  const perCat = new Map();
  for (const e of expenses ?? []) {
    if (typeof e.amount !== "number" || e.amount <= 0) continue;
    const c = e.category ?? "uncategorised";
    perCat.set(c, (perCat.get(c) ?? 0) + e.amount);
  }
  return Array.from(perCat.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}
