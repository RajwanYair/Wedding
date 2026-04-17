/**
 * src/services/budget-tracker.js — Budget envelope tracker (Sprint 115)
 *
 * Tracks a set of budget envelopes (categories), records spend, and reports
 * variance.  All state is persisted under "budgetEnvelopes" in the store.
 *
 * Usage:
 *   import { createEnvelope, recordSpend, getEnvelopeSummary } from "./budget-tracker.js";
 *
 *   createEnvelope({ category: "venue", limit: 50_000 });
 *   recordSpend("venue", 15_000, "Deposit");
 *   getEnvelopeSummary("venue"); // { limit, spent, remaining, isOver }
 */

import { storeGet, storeSet } from "../core/store.js";

// ── Types ──────────────────────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────────

/** @returns {Record<string, BudgetEnvelope>} */
function _getAll() {
  return /** @type {Record<string, BudgetEnvelope>} */ (storeGet("budgetEnvelopes") ?? {});
}

/** @param {Record<string, BudgetEnvelope>} all */
function _save(all) {
  storeSet("budgetEnvelopes", all);
}

// ── CRUD ──────────────────────────────────────────────────────────────────

/**
 * Create or overwrite a budget envelope.
 * @param {{ category: string, limit: number }} opts
 */
export function createEnvelope({ category, limit }) {
  if (!category?.trim()) throw new Error("budget-tracker: category is required");
  if (limit < 0) throw new Error("budget-tracker: limit must be >= 0");
  const all = _getAll();
  all[category] = {
    category,
    limit,
    spent: all[category]?.spent ?? 0,
    entries: all[category]?.entries ?? [],
    updatedAt: Date.now(),
  };
  _save(all);
}

/**
 * Record a spend against a category.
 * @param {string}  category
 * @param {number}  amount
 * @param {string}  [note]
 * @returns {boolean}  false if envelope not found
 */
export function recordSpend(category, amount, note) {
  const all = _getAll();
  const env = all[category];
  if (!env) return false;
  if (amount <= 0) throw new Error("budget-tracker: amount must be > 0");
  env.entries.push({ amount, note, ts: Date.now() });
  env.spent     += amount;
  env.updatedAt  = Date.now();
  _save(all);
  return true;
}

// ── Queries ────────────────────────────────────────────────────────────────

/**
 * Get a summary for one envelope.
 * @param {string} category
 * @returns {EnvelopeSummary | null}
 */
export function getEnvelopeSummary(category) {
  const env = _getAll()[category];
  if (!env) return null;
  const remaining = env.limit - env.spent;
  const runRate   = env.entries.length > 0 ? env.spent / env.entries.length : 0;
  return {
    limit:     env.limit,
    spent:     env.spent,
    remaining,
    isOver:    remaining < 0,
    runRate,
  };
}

/**
 * Get summaries for all envelopes.
 * @returns {Record<string, EnvelopeSummary>}
 */
export function getAllSummaries() {
  const all = _getAll();
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
  const all = _getAll();
  const envs = Object.values(all);
  const totalLimit   = envs.reduce((s, e) => s + e.limit, 0);
  const totalSpent   = envs.reduce((s, e) => s + e.spent, 0);
  return { totalLimit, totalSpent, totalRemaining: totalLimit - totalSpent };
}

/**
 * List categories that are over budget.
 * @returns {string[]}
 */
export function getOverBudgetCategories() {
  const all = _getAll();
  return Object.values(all)
    .filter((e) => e.spent > e.limit)
    .map((e) => e.category);
}
