/**
 * seating-ai.js — Constraint-based seating suggestion engine (Phase 3.2)
 *
 * Assigns guests to tables using a greedy constraint-satisfaction approach:
 *   1. Sort guests by group/side affinity.
 *   2. Place each group together on the same table where capacity allows.
 *   3. Report conflicts (over-capacity tables, unplaced guests).
 *
 * Pure functions — no DOM, no store, no side effects.
 * The "AI" here is a deterministic CSP solver, not an LLM.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * @typedef {{ id: string, firstName?: string, lastName?: string,
 *             group?: string, side?: string, guestCount?: number,
 *             tableId?: string }} SeatGuest
 * @typedef {{ id: string, name?: string, capacity?: number }} SeatTable
 * @typedef {{ guestId: string, tableId: string }} Assignment
 * @typedef {{ assignments: Assignment[], unplaced: string[], conflicts: string[] }} SeatingPlan
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Group guests by an affinity key: `${side}:${group}` or `${side}` or `misc`.
 * @param {SeatGuest[]} guests
 * @returns {Map<string, SeatGuest[]>}
 */
export function groupByAffinity(guests) {
  const map = new Map();
  for (const g of guests) {
    const key = [g.side ?? '', g.group ?? ''].filter(Boolean).join(':') || 'misc';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(g);
  }
  return map;
}

/**
 * Build a capacity tracker from a list of tables.
 * Returns a Map of tableId → remaining seats.
 * @param {SeatTable[]} tables
 * @returns {Map<string, number>}
 */
export function buildCapacityMap(tables) {
  const map = new Map();
  for (const t of tables) {
    map.set(t.id, t.capacity ?? 0);
  }
  return map;
}

/**
 * Find the table with the most remaining capacity that can fit `size` guests.
 * Returns null if no table has enough room.
 * @param {Map<string, number>} capacityMap
 * @param {number} size
 * @returns {string | null}
 */
export function findBestTable(capacityMap, size) {
  let bestId = null;
  let bestRemaining = -1;
  for (const [id, remaining] of capacityMap) {
    if (remaining >= size && remaining > bestRemaining) {
      bestId = id;
      bestRemaining = remaining;
    }
  }
  return bestId;
}

// ---------------------------------------------------------------------------
// Core planner
// ---------------------------------------------------------------------------

/**
 * Suggest a seating plan that respects group affinity and table capacity.
 *
 * Algorithm:
 *   1. Group guests by affinity key (side:group).
 *   2. Sort groups largest-first (fills tables efficiently).
 *   3. For each group, try to place all members on one table.
 *      If no single table fits, split the group and report a conflict.
 *   4. After placing groups, place any remaining individual guests.
 *
 * @param {SeatGuest[]} guests
 * @param {SeatTable[]} tables
 * @returns {SeatingPlan}
 */
export function suggestSeating(guests, tables) {
  /** @type {Assignment[]} */
  const assignments = [];
  /** @type {string[]} */
  const unplaced = [];
  /** @type {string[]} */
  const conflicts = [];

  if (guests.length === 0 || tables.length === 0) {
    return { assignments, unplaced: guests.map(g => g.id), conflicts };
  }

  const capacityMap = buildCapacityMap(tables);
  const affinityGroups = groupByAffinity(guests);

  // Sort groups largest-first
  const sortedGroups = [...affinityGroups.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  );

  for (const [groupKey, members] of sortedGroups) {
    const groupSize = members.length;
    const tableId = findBestTable(capacityMap, groupSize);

    if (tableId !== null) {
      // Fits entirely on one table
      for (const g of members) {
        assignments.push({ guestId: g.id, tableId });
      }
      capacityMap.set(tableId, (capacityMap.get(tableId) ?? 0) - groupSize);
    } else {
      // Try to split the group across tables
      const remaining = [...members];
      let allPlaced = true;

      while (remaining.length > 0) {
        const chunk = remaining[0];
        const chunkTable = findBestTable(capacityMap, 1);
        if (chunkTable === null) {
          // No space anywhere
          for (const g of remaining) unplaced.push(g.id);
          allPlaced = false;
          break;
        }
        assignments.push({ guestId: chunk.id, tableId: chunkTable });
        capacityMap.set(chunkTable, (capacityMap.get(chunkTable) ?? 0) - 1);
        remaining.shift();
      }

      if (!allPlaced || groupSize > 1) {
        conflicts.push(`Group "${groupKey}" could not be seated together (split or unplaced)`);
      }
    }
  }

  return { assignments, unplaced, conflicts };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Score a seating plan (0–100).
 * Higher is better.
 *
 * Metrics:
 *   - Placement rate: how many guests are placed (50 pts)
 *   - Group cohesion: fraction of groups kept together (50 pts)
 *
 * @param {SeatingPlan} plan
 * @param {SeatGuest[]} guests
 * @returns {{ score: number, placementRate: number, cohesionRate: number }}
 */
export function scoreSeatingPlan(plan, guests) {
  const { assignments, conflicts } = plan;
  const total = guests.length;
  if (total === 0) return { score: 100, placementRate: 1, cohesionRate: 1 };

  const placementRate = total > 0 ? assignments.length / total : 0;

  // Count distinct groups and how many were split (had conflicts)
  const affinityGroups = groupByAffinity(guests);
  const totalGroups = affinityGroups.size;
  const splitGroups = conflicts.length;
  const cohesionRate = totalGroups > 0 ? Math.max(0, (totalGroups - splitGroups) / totalGroups) : 1;

  const score = Math.round(placementRate * 50 + cohesionRate * 50);
  return { score, placementRate, cohesionRate };
}

// ---------------------------------------------------------------------------
// Diff utility
// ---------------------------------------------------------------------------

/**
 * Compare an existing assignment map with a suggested plan.
 * Returns lists of guests whose table changed or who were newly placed/unplaced.
 *
 * @param {Record<string, string>} existing   guestId → tableId
 * @param {SeatingPlan} suggested
 * @returns {{ moved: string[], newlyPlaced: string[], newlyUnplaced: string[] }}
 */
export function diffSeatingPlans(existing, suggested) {
  const moved = [];
  const newlyPlaced = [];
  const newlyUnplaced = [];

  for (const { guestId, tableId } of suggested.assignments) {
    if (!(guestId in existing)) {
      newlyPlaced.push(guestId);
    } else if (existing[guestId] !== tableId) {
      moved.push(guestId);
    }
  }

  for (const guestId of suggested.unplaced) {
    if (guestId in existing) newlyUnplaced.push(guestId);
  }

  return { moved, newlyPlaced, newlyUnplaced };
}
