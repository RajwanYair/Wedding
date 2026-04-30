/**
 * Budget allocator — split a total budget across categories by percentage
 * weights. Distributes rounding remainder to the largest weight first to
 * keep the sum exact.
 *
 * @typedef {object} CategoryWeight
 * @property {string} category
 * @property {number} weight        0..1 (or any non-negative number; weights are normalised)
 *
 * @typedef {object} CategoryAllocation
 * @property {string} category
 * @property {number} amount        Whole units (cents/agorot).
 * @property {number} percent       Percentage of total, 1 decimal.
 */

/**
 * Allocate `total` across `weights`. `total` must be a non-negative finite
 * integer-like number (treated as smallest currency unit). Weights are
 * renormalised; zero/negative weights are dropped.
 *
 * @param {number} total
 * @param {ReadonlyArray<CategoryWeight>} weights
 * @returns {CategoryAllocation[]}
 */
export function allocate(total, weights) {
  if (!Number.isFinite(total) || total < 0) {
    throw new RangeError("total must be a non-negative finite number");
  }
  const cleaned = weights
    .filter((w) => w && typeof w.category === "string" && w.weight > 0 && Number.isFinite(w.weight));
  if (cleaned.length === 0) return [];
  const sum = cleaned.reduce((acc, w) => acc + w.weight, 0);
  const totalRounded = Math.round(total);
  const raw = cleaned.map((w) => ({
    category: w.category,
    exact: (w.weight / sum) * totalRounded,
  }));
  const allocated = raw.map((r) => ({ category: r.category, amount: Math.floor(r.exact) }));
  let remainder = totalRounded - allocated.reduce((acc, r) => acc + r.amount, 0);
  // Distribute remainder to entries with largest fractional part.
  const fractions = raw
    .map((r, idx) => ({ idx, frac: r.exact - Math.floor(r.exact) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { idx } of fractions) {
    if (remainder <= 0) break;
    allocated[idx].amount += 1;
    remainder -= 1;
  }
  return allocated.map((a) => ({
    category: a.category,
    amount: a.amount,
    percent: totalRounded === 0 ? 0 : Math.round((a.amount / totalRounded) * 1000) / 10,
  }));
}

/**
 * Subtract spent amounts and return remaining per-category budget. Returns
 * `over: true` when spent exceeds the allocation.
 *
 * @param {ReadonlyArray<CategoryAllocation>} allocations
 * @param {Record<string, number>} spent
 * @returns {Array<CategoryAllocation & { spent: number, remaining: number, over: boolean }>}
 */
export function applySpending(allocations, spent) {
  return allocations.map((a) => {
    const s = Number.isFinite(spent[a.category]) ? spent[a.category] : 0;
    const remaining = a.amount - s;
    return { ...a, spent: s, remaining, over: remaining < 0 };
  });
}
