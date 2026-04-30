/**
 * Meal planner — aggregate per-meal-type counts and produce a chef-ready
 * summary from a confirmed guest list.
 *
 * Pure functions. Treats unknown meal types as a separate bucket; never
 * silently merges them into a default.
 *
 * @typedef {object} MealGuest
 * @property {string} id
 * @property {string} [meal]      Free-form meal label.
 * @property {string} [status]    "confirmed" | "pending" | "declined".
 * @property {number} [seats]     Override for party size; defaults to 1.
 *
 * @typedef {object} MealReport
 * @property {number} totalSeats              Total seats across confirmed guests.
 * @property {number} unspecified             Confirmed guests without a meal.
 * @property {Record<string, number>} byType  Per-meal-type seat counts.
 * @property {Array<{ type: string, count: number }>} sorted
 *   Same data sorted by descending count.
 */

/**
 * Normalise a meal label: trim + lowercase. Empty strings become null.
 *
 * @param {unknown} value
 * @returns {string | null}
 */
export function normaliseMeal(value) {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return v.length > 0 ? v : null;
}

/**
 * Tally meal seats from confirmed guests.
 *
 * @param {ReadonlyArray<MealGuest>} guests
 * @returns {MealReport}
 */
export function tallyMeals(guests) {
  /** @type {Record<string, number>} */
  const byType = Object.create(null);
  let totalSeats = 0;
  let unspecified = 0;

  for (const g of guests) {
    if (!g) continue;
    if (g.status && g.status !== "confirmed") continue;
    const seats = Number.isFinite(g.seats) && Number(g.seats) > 0 ? Number(g.seats) : 1;
    totalSeats += seats;
    const meal = normaliseMeal(g.meal);
    if (!meal) {
      unspecified += seats;
      continue;
    }
    byType[meal] = (byType[meal] ?? 0) + seats;
  }

  const sorted = Object.entries(byType)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));

  return { totalSeats, unspecified, byType, sorted };
}

/**
 * Convert a meal report into chef-ready text lines (one per meal type plus
 * a final unspecified row when applicable).
 *
 * @param {MealReport} report
 * @returns {string}
 */
export function formatChefReport(report) {
  const lines = report.sorted.map((row) => `${row.type}\t${row.count}`);
  if (report.unspecified > 0) lines.push(`unspecified\t${report.unspecified}`);
  lines.push(`TOTAL\t${report.totalSeats}`);
  return lines.join("\n");
}
