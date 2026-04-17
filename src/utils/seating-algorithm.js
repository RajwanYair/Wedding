/**
 * src/utils/seating-algorithm.js — Auto-assign guests to tables (Sprint 93)
 *
 * Greedy bin-packing with simple social affinity heuristics:
 *   1. Keep family / group members together (same group, same side).
 *   2. Respect table capacity.
 *   3. Already-seated guests are not moved.
 *   4. Returns an immutable list of assignments; does not mutate input.
 */

/**
 * @typedef {{ id: string, count?: number, tableId?: string | null, group?: string, side?: string }} Guest
 * @typedef {{ id: string, capacity: number }} Table
 * @typedef {{ guestId: string, tableId: string }} SeatAssignment
 */

/**
 * Compute how many seats are occupied per table, counting existing allocations
 * and already-seated guests.
 *
 * @param {Table[]} tables
 * @param {Guest[]} guests
 * @returns {Map<string, number>}
 */
function buildOccupancyMap(tables, guests) {
  /** @type {Map<string, number>} */
  const occ = new Map(tables.map((t) => [t.id, 0]));
  for (const g of guests) {
    if (g.tableId && occ.has(g.tableId)) {
      occ.set(g.tableId, occ.get(g.tableId) + (g.count ?? 1));
    }
  }
  return occ;
}

/**
 * Sort tables: prefer partially-filled tables (more cohesive seating).
 * @param {Table[]} tables
 * @param {Map<string, number>} occ
 * @returns {Table[]}
 */
function sortTables(tables, occ) {
  return [...tables].sort((a, b) => {
    const remA = a.capacity - (occ.get(a.id) ?? 0);
    const remB = b.capacity - (occ.get(b.id) ?? 0);
    // Prefer tables with less remaining capacity (bin-pack)
    return remA - remB;
  });
}

/**
 * Score a table for a guest based on social affinity.
 * Higher = better fit.
 * @param {Table} table
 * @param {Guest} guest
 * @param {Guest[]} allGuests
 * @param {{ guestId: string, tableId: string }[]} assignments
 * @returns {number}
 */
function affinityScore(table, guest, allGuests, assignments) {
  const assigned = new Set(
    assignments.filter((a) => a.tableId === table.id).map((a) => a.guestId)
  );
  let score = 0;
  for (const g of allGuests) {
    if (!assigned.has(g.id)) continue;
    if (g.group && g.group === guest.group) score += 2;
    if (g.side  && g.side  === guest.side)  score += 1;
  }
  return score;
}

/**
 * Auto-assign unassigned confirmed guests across available tables.
 *
 * @param {Guest[]} guests   Full guest list (confirmed + otherwise).
 * @param {Table[]} tables
 * @param {{ onlyConfirmed?: boolean }} [opts]
 * @returns {SeatAssignment[]}
 */
export function autoAssignSeating(guests, tables, opts = {}) {
  const { onlyConfirmed = true } = opts;

  const eligibleGuests = guests.filter(
    (g) =>
      !g.tableId &&
      (!onlyConfirmed || (g).status === "confirmed")
  );

  if (eligibleGuests.length === 0 || tables.length === 0) return [];

  const occ = buildOccupancyMap(tables, guests);
  /** @type {SeatAssignment[]} */
  const assignments = [];

  for (const guest of eligibleGuests) {
    const need = guest.count ?? 1;
    const sortedTables = sortTables(tables, occ);

    // Find best fitting table with affinity scoring
    let bestTable = null;
    let bestScore = -Infinity;

    for (const table of sortedTables) {
      const remaining = table.capacity - (occ.get(table.id) ?? 0);
      if (remaining < need) continue;
      const score = affinityScore(table, guest, guests, assignments) + (remaining - need) * 0.1;
      if (score > bestScore) {
        bestScore = score;
        bestTable = table;
      }
    }

    if (bestTable) {
      assignments.push({ guestId: guest.id, tableId: bestTable.id });
      occ.set(bestTable.id, (occ.get(bestTable.id) ?? 0) + need);
    }
  }

  return assignments;
}

/**
 * Validate an assignment list — check that no table is over capacity.
 * @param {SeatAssignment[]} assignments
 * @param {Guest[]} guests
 * @param {Table[]} tables
 * @returns {{ valid: boolean, violations: string[] }}
 */
export function validateSeating(assignments, guests, tables) {
  const guestMap = new Map(guests.map((g) => [g.id, g]));
  const tableMap = new Map(tables.map((t) => [t.id, t]));
  /** @type {Map<string, number>} */
  const usage = new Map();

  for (const { guestId, tableId } of assignments) {
    const g = guestMap.get(guestId);
    if (!g) continue;
    usage.set(tableId, (usage.get(tableId) ?? 0) + (g.count ?? 1));
  }

  const violations = [];
  for (const [tableId, used] of usage) {
    const table = tableMap.get(tableId);
    if (!table) { violations.push(`Unknown table: ${tableId}`); continue; }
    if (used > table.capacity) {
      violations.push(`Table ${tableId} over capacity: ${used}/${table.capacity}`);
    }
  }

  return { valid: violations.length === 0, violations };
}
