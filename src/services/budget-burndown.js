/**
 * src/services/budget-burndown.js — Unified budget service (S193)
 *
 * Merged from:
 *   - budget-burndown.js (S46) — burn-down analytics (pure)
 *   - budget-tracker.js  (S115) — envelope CRUD + variance
 */

import { storeGet, storeSet } from "../core/store.js";

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

// ── Projection helpers (merged from budget-projection.js, S124) ──────────

/** @typedef {{ amount: number, paidAt: string, category?: string }} ExpenseInput */
/** @typedef {{ date: string, spent: number, remaining: number }} BurndownPoint */

const _ymd = (/** @type {string} */ s) => {
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
};

/**
 * Build a per-day burn-down series.
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

// ── Budget envelope tracker (merged from budget-tracker.js, S115) ─────────

/**
 * @typedef {{
 *   category:    string,
 *   limit:       number,
 *   spent:       number,
 *   entries:     { amount: number, note?: string, ts: number }[],
 *   updatedAt:   number,
 * }} BudgetEnvelope
 *
 * @typedef {{ limit: number, spent: number, remaining: number, isOver: boolean, runRate: number }} EnvelopeSummary
 */

/** @returns {Record<string, BudgetEnvelope>} */
function _getEnvelopes() {
  return /** @type {Record<string, BudgetEnvelope>} */ (storeGet("budgetEnvelopes") ?? {});
}

/** @param {Record<string, BudgetEnvelope>} all */
function _saveEnvelopes(all) {
  storeSet("budgetEnvelopes", all);
}

/**
 * Create or overwrite a budget envelope.
 * @param {{ category: string, limit: number }} opts
 */
export function createEnvelope({ category, limit }) {
  if (!category?.trim()) throw new Error("budget-tracker: category is required");
  if (limit < 0) throw new Error("budget-tracker: limit must be >= 0");
  const all = _getEnvelopes();
  all[category] = {
    category,
    limit,
    spent: all[category]?.spent ?? 0,
    entries: all[category]?.entries ?? [],
    updatedAt: Date.now(),
  };
  _saveEnvelopes(all);
}

/**
 * Record a spend against a category.
 * @param {string} category
 * @param {number} amount
 * @param {string} [note]
 * @returns {boolean}
 */
export function recordSpend(category, amount, note) {
  const all = _getEnvelopes();
  const env = all[category];
  if (!env) return false;
  if (amount <= 0) throw new Error("budget-tracker: amount must be > 0");
  env.entries.push({ amount, note, ts: Date.now() });
  env.spent += amount;
  env.updatedAt = Date.now();
  _saveEnvelopes(all);
  return true;
}

/**
 * Get a summary for one envelope.
 * @param {string} category
 * @returns {EnvelopeSummary | null}
 */
export function getEnvelopeSummary(category) {
  const env = _getEnvelopes()[category];
  if (!env) return null;
  const remaining = env.limit - env.spent;
  const runRate = env.entries.length > 0 ? env.spent / env.entries.length : 0;
  return { limit: env.limit, spent: env.spent, remaining, isOver: remaining < 0, runRate };
}

/**
 * Get summaries for all envelopes.
 * @returns {Record<string, EnvelopeSummary>}
 */
export function getAllSummaries() {
  const all = _getEnvelopes();
  /** @type {Record<string, EnvelopeSummary>} */
  const out = {};
  for (const cat of Object.keys(all)) {
    const summary = getEnvelopeSummary(cat);
    if (summary) out[cat] = summary;
  }
  return out;
}

/**
 * Total budget vs total spent across all envelopes.
 * @returns {{ totalLimit: number, totalSpent: number, totalRemaining: number }}
 */
export function getTotalBudget() {
  const envs = Object.values(_getEnvelopes());
  const totalLimit = envs.reduce((s, e) => s + e.limit, 0);
  const totalSpent = envs.reduce((s, e) => s + e.spent, 0);
  return { totalLimit, totalSpent, totalRemaining: totalLimit - totalSpent };
}

/**
 * List categories that are over budget.
 * @returns {string[]}
 */
export function getOverBudgetCategories() {
  return Object.values(_getEnvelopes())
    .filter((e) => e.spent > e.limit)
    .map((e) => e.category);
}
