/**
 * src/utils/budget-planner.js
 * Wedding budget allocation, tracking, and variance analysis helpers.
 * Pure data — no DOM, no network, no localStorage.
 *
 * @module budget-planner
 */

// ── Category definitions ───────────────────────────────────────────────────

/**
 * Standard wedding budget categories with suggested allocation percentages.
 * Percentages sum to 100.
 * @type {Readonly<Record<string, { label: string, defaultPct: number }>>}
 */
export const BUDGET_CATEGORIES = Object.freeze({
  venue: { label: "Venue & Catering", defaultPct: 35 },
  photography: { label: "Photography & Video", defaultPct: 12 },
  music: { label: "Music & Entertainment", defaultPct: 8 },
  flowers: { label: "Flowers & Decor", defaultPct: 10 },
  attire: { label: "Attire & Beauty", defaultPct: 8 },
  stationery: { label: "Stationery & Gifts", defaultPct: 4 },
  transport: { label: "Transport", defaultPct: 4 },
  officiant: { label: "Ceremony & Officiant", defaultPct: 3 },
  honeymoon: { label: "Honeymoon", defaultPct: 10 },
  miscellaneous: { label: "Miscellaneous", defaultPct: 6 },
});

// ── Plan builders ──────────────────────────────────────────────────────────

/**
 * Builds a default budget plan from a total amount.
 * Allocates amounts based on `defaultPct` weights.
 * @param {number} totalBudget
 * @returns {Array<{ category: string, label: string, allocated: number, spent: number, pct: number }>}
 */
export function buildDefaultBudgetPlan(totalBudget) {
  if (typeof totalBudget !== "number" || totalBudget <= 0) return [];
  return Object.entries(BUDGET_CATEGORIES).map(
    ([category, { label, defaultPct }]) => ({
      category,
      label,
      allocated: Math.round((totalBudget * defaultPct) / 100),
      spent: 0,
      pct: defaultPct,
    }),
  );
}

/**
 * Creates a single budget line item.
 * @param {string} category
 * @param {number} allocated
 * @param {number} [spent=0]
 * @returns {{ category: string, allocated: number, spent: number, remaining: number }}
 */
export function createBudgetLine(category, allocated, spent = 0) {
  if (!category || typeof allocated !== "number") return null;
  const safeSpent = typeof spent === "number" ? spent : 0;
  return {
    category,
    label: BUDGET_CATEGORIES[category]?.label ?? category,
    allocated: Math.max(0, allocated),
    spent: Math.max(0, safeSpent),
    remaining: Math.max(0, allocated - safeSpent),
  };
}

// ── Analysis helpers ───────────────────────────────────────────────────────

/**
 * Computes overall budget summary from a list of line items.
 * @param {Array<{ allocated: number, spent: number }>} lines
 * @returns {{ totalAllocated: number, totalSpent: number, totalRemaining: number, utilizationRate: number, isOverBudget: boolean }}
 */
export function summarizeBudget(lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    return {
      totalAllocated: 0,
      totalSpent: 0,
      totalRemaining: 0,
      utilizationRate: 0,
      isOverBudget: false,
    };
  }
  const totalAllocated = lines.reduce((s, l) => s + (l.allocated ?? 0), 0);
  const totalSpent = lines.reduce((s, l) => s + (l.spent ?? 0), 0);
  const totalRemaining = totalAllocated - totalSpent;

  return {
    totalAllocated,
    totalSpent,
    totalRemaining,
    utilizationRate: totalAllocated > 0 ? totalSpent / totalAllocated : 0,
    isOverBudget: totalSpent > totalAllocated,
  };
}

/**
 * Returns line items that are over their individual allocation.
 * @param {Array<{ category: string, allocated: number, spent: number }>} lines
 * @returns {Array}
 */
export function getOverBudgetLines(lines) {
  if (!Array.isArray(lines)) return [];
  return lines.filter((l) => (l.spent ?? 0) > (l.allocated ?? 0));
}

/**
 * Computes the variance for each line item (spent − allocated).
 * Positive = over budget; negative = under budget.
 * @param {Array<{ category: string, allocated: number, spent: number }>} lines
 * @returns {Array<{ category: string, variance: number, variancePct: number }>}
 */
export function computeVariances(lines) {
  if (!Array.isArray(lines)) return [];
  return lines.map((l) => {
    const variance = (l.spent ?? 0) - (l.allocated ?? 0);
    const variancePct = (l.allocated ?? 0) > 0 ? variance / l.allocated : 0;
    return { category: l.category, variance, variancePct };
  });
}

/**
 * Reallocates the unspent surplus from under-budget lines to a target category.
 * Returns an updated copy of the lines array (does not mutate).
 * @param {Array<{ category: string, allocated: number, spent: number }>} lines
 * @param {string} targetCategory
 * @returns {Array}
 */
export function reallocateSurplus(lines, targetCategory) {
  if (!Array.isArray(lines) || !targetCategory) return lines ?? [];
  const surplus = lines.reduce((s, l) => {
    const under = (l.allocated ?? 0) - (l.spent ?? 0);
    return l.category !== targetCategory && under > 0 ? s + under : s;
  }, 0);

  return lines.map((l) => {
    if (l.category === targetCategory) {
      return { ...l, allocated: (l.allocated ?? 0) + surplus };
    }
    // Trim allocation to what was actually spent (floor at spent)
    const trimmed = Math.max(l.spent ?? 0, 0);
    return l.category !== targetCategory && (l.allocated ?? 0) > (l.spent ?? 0)
      ? { ...l, allocated: trimmed }
      : l;
  });
}

// ── Formatting helpers ─────────────────────────────────────────────────────

/**
 * Formats a number as a currency string (ILS default).
 * @param {number} amount
 * @param {string} [currency="ILS"]
 * @param {string} [locale="he-IL"]
 * @returns {string}
 */
export function formatBudgetAmount(amount, currency = "ILS", locale = "he-IL") {
  if (typeof amount !== "number" || !isFinite(amount)) return "";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Returns a traffic-light status for a budget line.
 * "green" < 80 % · "amber" 80–100 % · "red" > 100 %
 * @param {{ allocated: number, spent: number }} line
 * @returns {"green"|"amber"|"red"}
 */
export function budgetLineStatus(line) {
  if (!line || (line.allocated ?? 0) === 0) return "green";
  const ratio = (line.spent ?? 0) / line.allocated;
  if (ratio > 1) return "red";
  if (ratio >= 0.8) return "amber";
  return "green";
}

/**
 * Sorts budget lines by variance descending (most over-budget first).
 * @param {Array} lines
 * @returns {Array}
 */
export function sortByVariance(lines) {
  if (!Array.isArray(lines)) return [];
  return [...lines].sort((a, b) => {
    const va = (a.spent ?? 0) - (a.allocated ?? 0);
    const vb = (b.spent ?? 0) - (b.allocated ?? 0);
    return vb - va;
  });
}
