/**
 * src/utils/budget-benchmark.js — S649 Regional budget benchmarks
 *
 * Pure helpers for comparing a wedding budget against regional averages,
 * category-level benchmarks, and deviation scoring.
 *
 * @module budget-benchmark
 * @owner analytics
 */

/**
 * @typedef {object} CategoryBenchmark
 * @property {string} category
 * @property {number} average
 * @property {number} low
 * @property {number} high
 */

/**
 * Israeli wedding regional benchmark data (NIS).
 * Source: aggregated from Israeli planner surveys 2025-2026.
 */
const ISRAEL_BENCHMARKS = {
  center: { venue: 45000, catering: 35000, photography: 8000, dj: 6000, flowers: 7000, dress: 12000, invitations: 3000, makeup: 3500, transportation: 4000, decor: 8000 },
  north: { venue: 35000, catering: 28000, photography: 7000, dj: 5000, flowers: 5500, dress: 10000, invitations: 2500, makeup: 3000, transportation: 3500, decor: 6000 },
  south: { venue: 32000, catering: 26000, photography: 6500, dj: 4500, flowers: 5000, dress: 9000, invitations: 2000, makeup: 2800, transportation: 3000, decor: 5500 },
  jerusalem: { venue: 40000, catering: 32000, photography: 7500, dj: 5500, flowers: 6000, dress: 11000, invitations: 2800, makeup: 3200, transportation: 3500, decor: 7000 },
};

/**
 * Get benchmark data for a region.
 *
 * @param {string} region
 * @returns {Record<string, number>|null}
 */
export function getRegionalBenchmark(region) {
  if (!region || typeof region !== "string") return null;
  // @ts-ignore
  return ISRAEL_BENCHMARKS[region.toLowerCase()] ?? null;
}

/**
 * List available benchmark regions.
 *
 * @returns {string[]}
 */
export function getAvailableRegions() {
  return Object.keys(ISRAEL_BENCHMARKS);
}

/**
 * Compare actual spending against regional benchmark for a single category.
 *
 * @param {number} actual
 * @param {number} benchmark
 * @returns {{ deviation: number, deviationPercent: number, status: "under"|"on-track"|"over" }}
 */
export function compareCategorySpend(actual, benchmark) {
  if (typeof actual !== "number" || typeof benchmark !== "number" || benchmark === 0) {
    return { deviation: 0, deviationPercent: 0, status: "on-track" };
  }
  const deviation = actual - benchmark;
  const deviationPercent = Math.round((deviation / benchmark) * 100);
  let status = "on-track";
  if (deviationPercent > 15) status = "over";
  else if (deviationPercent < -15) status = "under";
  // @ts-ignore
  return { deviation, deviationPercent, status };
}

/**
 * Compare full budget against regional benchmarks.
 *
 * @param {Record<string, number>} actualByCategory - { venue: 50000, catering: 30000, ... }
 * @param {string} region
 * @returns {{ category: string, actual: number, benchmark: number,
 *             deviation: number, deviationPercent: number, status: string }[]}
 */
export function compareFullBudget(actualByCategory, region) {
  const benchmark = getRegionalBenchmark(region);
  if (!benchmark || !actualByCategory || typeof actualByCategory !== "object") return [];

  const results = [];
  for (const category of Object.keys(benchmark)) {
    const actual = actualByCategory[category] ?? 0;
    const bm = benchmark[category];
    const comp = compareCategorySpend(actual, bm);
    results.push({
      category,
      actual,
      benchmark: bm,
      deviation: comp.deviation,
      deviationPercent: comp.deviationPercent,
      status: comp.status,
    });
  }
  return results;
}

/**
 * Calculate total budget deviation score.
 *
 * @param {Record<string, number>} actualByCategory
 * @param {string} region
 * @returns {{ totalActual: number, totalBenchmark: number, deviation: number,
 *             deviationPercent: number, overCategories: number, underCategories: number }}
 */
export function budgetDeviationScore(actualByCategory, region) {
  const comparison = compareFullBudget(actualByCategory, region);
  if (comparison.length === 0) {
    return { totalActual: 0, totalBenchmark: 0, deviation: 0, deviationPercent: 0, overCategories: 0, underCategories: 0 };
  }

  let totalActual = 0;
  let totalBenchmark = 0;
  let overCategories = 0;
  let underCategories = 0;

  for (const c of comparison) {
    totalActual += c.actual;
    totalBenchmark += c.benchmark;
    if (c.status === "over") overCategories++;
    else if (c.status === "under") underCategories++;
  }

  const deviation = totalActual - totalBenchmark;
  const deviationPercent = totalBenchmark === 0 ? 0 : Math.round((deviation / totalBenchmark) * 100);

  return { totalActual, totalBenchmark, deviation, deviationPercent, overCategories, underCategories };
}

/**
 * Get top N over-budget categories.
 *
 * @param {Record<string, number>} actualByCategory
 * @param {string} region
 * @param {number} [n=3]
 * @returns {{ category: string, deviation: number, deviationPercent: number }[]}
 */
export function topOverBudget(actualByCategory, region, n = 3) {
  const comparison = compareFullBudget(actualByCategory, region);
  return comparison
    .filter((c) => c.status === "over")
    .sort((a, b) => b.deviation - a.deviation)
    .slice(0, n)
    .map(({ category, deviation, deviationPercent }) => ({ category, deviation, deviationPercent }));
}

/**
 * Get savings opportunities — categories significantly under benchmark.
 *
 * @param {Record<string, number>} actualByCategory
 * @param {string} region
 * @returns {{ category: string, saved: number, savedPercent: number }[]}
 */
export function savingsOpportunities(actualByCategory, region) {
  const comparison = compareFullBudget(actualByCategory, region);
  return comparison
    .filter((c) => c.status === "under")
    .map(({ category, deviation, deviationPercent }) => ({
      category,
      saved: Math.abs(deviation),
      savedPercent: Math.abs(deviationPercent),
    }));
}
