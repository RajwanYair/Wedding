/**
 * Seating optimizer — assign unseated guests to tables greedily.
 *
 * Considers:
 * - Table capacity (`capacity` field).
 * - Group affinity (guests sharing the same `groupId` prefer the same table).
 * - Existing assignments (never reassigns a seated guest).
 *
 * Pure functions; returns new arrays.
 *
 * @typedef {object} SeatGuest
 * @property {string} id
 * @property {string} [tableId]   Existing assignment.
 * @property {string} [groupId]   Family / friend cluster id.
 * @property {string} [status]    "confirmed" | "pending" | "declined"
 *
 * @typedef {object} SeatTable
 * @property {string} id
 * @property {number} capacity
 *
 * @typedef {object} SeatPlan
 * @property {Array<{ guestId: string, tableId: string }>} assignments
 *   New assignments produced by this run.
 * @property {string[]} unseated   Guest ids that could not be placed.
 */

/**
 * Compute the number of remaining seats per table given current guests.
 *
 * @param {ReadonlyArray<SeatTable>} tables
 * @param {ReadonlyArray<SeatGuest>} guests
 * @returns {Map<string, number>}
 */
export function remainingCapacity(tables, guests) {
  /** @type {Map<string, number>} */
  const map = new Map();
  for (const t of tables) map.set(t.id, Math.max(0, Number(t.capacity) || 0));
  for (const g of guests) {
    if (g.tableId && map.has(g.tableId)) {
      map.set(g.tableId, map.get(g.tableId) - 1);
    }
  }
  return map;
}

/**
 * Assign all unseated confirmed guests to tables, keeping group members
 * together when possible.
 *
 * @param {ReadonlyArray<SeatGuest>} guests
 * @param {ReadonlyArray<SeatTable>} tables
 * @param {{ confirmedOnly?: boolean }} [opts]
 * @returns {SeatPlan}
 */
export function planSeating(guests, tables, opts = {}) {
  const confirmedOnly = opts.confirmedOnly !== false;
  const remaining = remainingCapacity(tables, guests);

  // group existing seat counts per table to track which group "owns" each table
  /** @type {Map<string, Map<string, number>>} */
  const groupSeatsPerTable = new Map();
  for (const t of tables) groupSeatsPerTable.set(t.id, new Map());
  for (const g of guests) {
    if (g.tableId && g.groupId && groupSeatsPerTable.has(g.tableId)) {
      const m = groupSeatsPerTable.get(g.tableId);
      m.set(g.groupId, (m.get(g.groupId) ?? 0) + 1);
    }
  }

  const isAssignable = (g) => {
    if (g.tableId) return false;
    if (confirmedOnly && g.status && g.status !== "confirmed") return false;
    return true;
  };

  // Group guests by groupId; ungrouped guests are singletons by their own id.
  /** @type {Map<string, SeatGuest[]>} */
  const groups = new Map();
  for (const g of guests) {
    if (!isAssignable(g)) continue;
    const key = g.groupId ?? `__solo__${g.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(g);
  }

  /** @type {Array<{ guestId: string, tableId: string }>} */
  const assignments = [];
  /** @type {string[]} */
  const unseated = [];

  // Largest groups first — better fit utilisation.
  const orderedGroups = [...groups.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  );

  for (const [groupKey, members] of orderedGroups) {
    // Prefer a table that already hosts this group.
    let chosen = null;
    if (!groupKey.startsWith("__solo__")) {
      let best = -1;
      for (const t of tables) {
        const seats = remaining.get(t.id) ?? 0;
        if (seats < members.length) continue;
        const ownership = groupSeatsPerTable.get(t.id).get(groupKey) ?? 0;
        if (ownership > best) {
          best = ownership;
          chosen = t.id;
        }
      }
    }

    // Fallback: any table with enough room.
    if (!chosen) {
      for (const t of tables) {
        if ((remaining.get(t.id) ?? 0) >= members.length) {
          chosen = t.id;
          break;
        }
      }
    }

    if (chosen) {
      for (const m of members) assignments.push({ guestId: m.id, tableId: chosen });
      remaining.set(chosen, remaining.get(chosen) - members.length);
      if (!groupKey.startsWith("__solo__")) {
        const map = groupSeatsPerTable.get(chosen);
        map.set(groupKey, (map.get(groupKey) ?? 0) + members.length);
      }
      continue;
    }

    // Split the group across tables if no single table fits.
    let leftover = [...members];
    for (const t of tables) {
      if (leftover.length === 0) break;
      const seats = remaining.get(t.id) ?? 0;
      if (seats <= 0) continue;
      const take = Math.min(seats, leftover.length);
      const placed = leftover.slice(0, take);
      for (const m of placed) assignments.push({ guestId: m.id, tableId: t.id });
      remaining.set(t.id, seats - take);
      leftover = leftover.slice(take);
    }
    for (const m of leftover) unseated.push(m.id);
  }

  return { assignments, unseated };
}

/**
 * Apply a plan to a guest list, returning a new array with `tableId` set.
 *
 * @param {ReadonlyArray<SeatGuest>} guests
 * @param {SeatPlan} plan
 * @returns {SeatGuest[]}
 */
export function applyPlan(guests, plan) {
  const map = new Map(plan.assignments.map((a) => [a.guestId, a.tableId]));
  return guests.map((g) => (map.has(g.id) ? { ...g, tableId: map.get(g.id) } : g));
}
