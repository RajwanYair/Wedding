/**
 * src/utils/seating-analytics.js — Table utilization & seating analytics (Sprint 32)
 *
 * Pure functions that derive occupancy heatmap data, balance scores, and
 * per-table statistics from a list of guests and tables.
 * No side effects, no external deps — fully testable.
 *
 * Roadmap ref: Phase 3.5 — Table utilization heatmap
 */

/**
 * @typedef {{
 *   tableId:       string,
 *   tableName:     string,
 *   capacity:      number,
 *   occupied:      number,
 *   available:     number,
 *   occupancyPct:  number,
 *   heatLevel:     "empty" | "low" | "medium" | "high" | "full" | "over",
 *   mealBreakdown: Record<string, number>,
 *   sideBreakdown: Record<string, number>,
 * }} TableOccupancy
 *
 * @typedef {{
 *   tables:            TableOccupancy[],
 *   totalSeats:        number,
 *   totalOccupied:     number,
 *   totalAvailable:    number,
 *   overallPct:        number,
 *   unassignedGuests:  number,
 *   unassignedHeads:   number,
 *   balanceScore:      number,
 * }} SeatingHeatmap
 */

/**
 * Map an occupancy percentage to a heat level label.
 * @param {number} pct
 * @param {number} capacity
 * @param {number} occupied
 * @returns {"empty"|"low"|"medium"|"high"|"full"|"over"}
 */
function _heatLevel(pct, capacity, occupied) {
  if (occupied > capacity) return "over";
  if (pct === 0)    return "empty";
  if (pct <= 40)    return "low";
  if (pct <= 70)    return "medium";
  if (pct < 100)    return "high";
  return "full";
}

/**
 * Compute table utilization heatmap data from guests and tables.
 *
 * Guest head count:  `(guest.count || 1) + (guest.children || 0)`
 * Only CONFIRMED guests are counted for occupancy (pending guests shown
 * separately in `unassignedGuests`/`unassignedHeads`).
 *
 * @param {any[]} guests  All guests regardless of status
 * @param {any[]} tables  All table records with id, name, capacity
 * @returns {SeatingHeatmap}
 */
export function computeSeatingHeatmap(guests, tables) {
  // Per-table accumulators
  /** @type {Map<string, { occupied: number, meal: Record<string,number>, side: Record<string,number> }>} */
  const acc = new Map(tables.map((t) => [t.id, { occupied: 0, meal: {}, side: {} }]));

  let unassignedGuests = 0;
  let unassignedHeads = 0;

  for (const g of guests) {
    if (g.status !== "confirmed") continue;

    const heads = (Number(g.count) || 1) + (Number(g.children) || 0);
    const tid = g.tableId;

    if (!tid || !acc.has(tid)) {
      unassignedGuests += 1;
      unassignedHeads += heads;
      continue;
    }

    const row = acc.get(tid);
    row.occupied += heads;

    const meal = g.meal || "regular";
    row.meal[meal] = (row.meal[meal] || 0) + heads;

    const side = g.side || "unknown";
    row.side[side] = (row.side[side] || 0) + 1;
  }

  let totalSeats = 0;
  let totalOccupied = 0;

  /** @type {TableOccupancy[]} */
  const tableResults = tables.map((t) => {
    const row = acc.get(t.id) ?? { occupied: 0, meal: {}, side: {} };
    const capacity = Math.max(0, Number(t.capacity) || 0);
    const occupied = row.occupied;
    const available = Math.max(0, capacity - occupied);
    const occupancyPct = capacity === 0 ? 0 : Math.round((occupied / capacity) * 100);

    totalSeats    += capacity;
    totalOccupied += occupied;

    return {
      tableId:      t.id,
      tableName:    t.name ?? t.id,
      capacity,
      occupied,
      available,
      occupancyPct,
      heatLevel:    _heatLevel(occupancyPct, capacity, occupied),
      mealBreakdown: row.meal,
      sideBreakdown: row.side,
    };
  });

  const overallPct = totalSeats === 0 ? 0 : Math.round((totalOccupied / totalSeats) * 100);

  // Balance score: 100 = perfectly uniform; drops as variance increases
  // Computed as (1 - coefficient of variation) * 100, clamped to [0,100].
  let balanceScore = 100;
  if (tableResults.length > 1) {
    const pcts = tableResults.map((r) => r.occupancyPct);
    const mean = pcts.reduce((s, v) => s + v, 0) / pcts.length;
    if (mean > 0) {
      const variance = pcts.reduce((s, v) => s + (v - mean) ** 2, 0) / pcts.length;
      const cv = Math.sqrt(variance) / mean; // coefficient of variation
      balanceScore = Math.max(0, Math.round((1 - Math.min(cv, 1)) * 100));
    }
  }

  return {
    tables: tableResults,
    totalSeats,
    totalOccupied,
    totalAvailable: Math.max(0, totalSeats - totalOccupied),
    overallPct,
    unassignedGuests,
    unassignedHeads,
    balanceScore,
  };
}

/**
 * Return the N most under-utilised and N most over-utilised tables,
 * useful for rebalancing suggestions.
 *
 * @param {TableOccupancy[]} tables  Output of computeSeatingHeatmap().tables
 * @param {number} [n=3]
 * @returns {{ underutilised: TableOccupancy[], overutilised: TableOccupancy[] }}
 */
export function getImbalancedTables(tables, n = 3) {
  const sorted = [...tables].sort((a, b) => a.occupancyPct - b.occupancyPct);
  return {
    underutilised: sorted.slice(0, n),
    overutilised:  sorted.slice(-n).reverse(),
  };
}
