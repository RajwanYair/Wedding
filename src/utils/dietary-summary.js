/**
 * Dietary requirements aggregator — summarise guest meal preferences and
 * allergies into kitchen-ready counts.
 *
 * @typedef {object} DietaryGuest
 * @property {string} id
 * @property {string} [meal]                 e.g. "vegetarian", "fish"
 * @property {string[]} [allergies]
 * @property {number} [seats]                Defaults to 1.
 * @property {string} [status]               Only "confirmed" / undefined are counted.
 *
 * @typedef {object} DietarySummary
 * @property {number} totalSeats
 * @property {Record<string, number>} byMeal
 * @property {Record<string, number>} byAllergy
 * @property {Array<{ key: string, count: number }>} topAllergies
 */

/**
 * @param {string} value
 * @returns {string}
 */
function normalise(value) {
  return String(value).trim().toLowerCase();
}

/**
 * @param {ReadonlyArray<DietaryGuest>} guests
 * @returns {DietarySummary}
 */
export function summariseDietary(guests) {
  /** @type {Record<string, number>} */
  const byMeal = {};
  /** @type {Record<string, number>} */
  const byAllergy = {};
  let totalSeats = 0;
  for (const g of guests) {
    if (!g) continue;
    if (g.status && g.status !== "confirmed") continue;
    const seats = Number.isFinite(g.seats) && g.seats > 0 ? g.seats : 1;
    totalSeats += seats;
    if (typeof g.meal === "string" && g.meal.length > 0) {
      const key = normalise(g.meal);
      byMeal[key] = (byMeal[key] ?? 0) + seats;
    }
    if (Array.isArray(g.allergies)) {
      const seen = new Set();
      for (const a of g.allergies) {
        if (typeof a !== "string" || a.length === 0) continue;
        const key = normalise(a);
        if (seen.has(key)) continue;
        seen.add(key);
        byAllergy[key] = (byAllergy[key] ?? 0) + seats;
      }
    }
  }
  const topAllergies = Object.entries(byAllergy)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  return { totalSeats, byMeal, byAllergy, topAllergies };
}

/**
 * Render a tab-delimited kitchen report.
 *
 * @param {DietarySummary} summary
 * @returns {string}
 */
export function formatKitchenReport(summary) {
  const lines = ["meal\tcount"];
  const meals = Object.entries(summary.byMeal).sort((a, b) =>
    b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  for (const [k, v] of meals) lines.push(`${k}\t${v}`);
  lines.push(`TOTAL\t${summary.totalSeats}`);
  if (summary.topAllergies.length > 0) {
    lines.push("");
    lines.push("allergy\tcount");
    for (const { key, count } of summary.topAllergies) {
      lines.push(`${key}\t${count}`);
    }
  }
  return lines.join("\n");
}
