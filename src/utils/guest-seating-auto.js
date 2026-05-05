/**
 * src/utils/guest-seating-auto.js — Auto-assign guests to tables with constraint satisfaction (S673)
 *
 * @module guest-seating-auto
 * @owner guest
 */

/**
 * @typedef {object} SeatGuest
 * @property {string} id
 * @property {string} name
 * @property {string|null} group
 * @property {string|null} tableId
 * @property {string[]} preferNear
 * @property {string[]} avoidNear
 */

/**
 * @typedef {object} SeatTable
 * @property {string} id
 * @property {string} label
 * @property {number} capacity
 * @property {string[]} assigned
 */

/**
 * @typedef {object} Constraint
 * @property {"near"|"avoid"|"same-table"|"different-table"} type
 * @property {string} guestA
 * @property {string} guestB
 * @property {number} weight
 */

/**
 * @typedef {object} AssignmentResult
 * @property {SeatTable[]} tables
 * @property {string[]} unassigned
 * @property {number} score
 * @property {number} violationCount
 */

/**
 * Create a seating guest.
 * @param {object} params
 * @param {string} params.id
 * @param {string} params.name
 * @param {string|null} [params.group]
 * @param {string[]} [params.preferNear]
 * @param {string[]} [params.avoidNear]
 * @returns {SeatGuest}
 */
export function createSeatGuest({ id, name, group, preferNear, avoidNear }) {
  return {
    id,
    name: (name || "").trim(),
    group: group || null,
    tableId: null,
    preferNear: preferNear || [],
    avoidNear: avoidNear || [],
  };
}

/**
 * Create a seating table.
 * @param {object} params
 * @param {string} params.id
 * @param {string} params.label
 * @param {number} params.capacity
 * @returns {SeatTable}
 */
export function createSeatTable({ id, label, capacity }) {
  return {
    id,
    label: (label || "").trim(),
    capacity: Math.max(1, capacity || 8),
    assigned: [],
  };
}

/**
 * Extract constraints from guest preferences.
 * @param {SeatGuest[]} guests
 * @returns {Constraint[]}
 */
export function extractConstraints(guests) {
  const constraints = [];
  const seen = new Set();

  for (const g of guests) {
    for (const near of g.preferNear) {
      const key = [g.id, near].sort().join("-");
      if (!seen.has(key)) {
        seen.add(key);
        constraints.push({ type: "near", guestA: g.id, guestB: near, weight: 1 });
      }
    }
    for (const avoid of g.avoidNear) {
      const key = `avoid-${[g.id, avoid].sort().join("-")}`;
      if (!seen.has(key)) {
        seen.add(key);
        constraints.push({ type: "avoid", guestA: g.id, guestB: avoid, weight: 2 });
      }
    }
  }

  return constraints;
}

/**
 * Auto-assign guests to tables using greedy group-first algorithm.
 * @param {SeatGuest[]} guests
 * @param {SeatTable[]} tables
 * @returns {AssignmentResult}
 */
export function autoAssign(guests, tables) {
  const tableCopies = tables.map((t) => ({ ...t, assigned: [...t.assigned] }));
  const unassigned = [];

  // Group guests by group
  const groups = {};
  const ungrouped = [];

  for (const g of guests) {
    if (g.group) {
      if (!groups[g.group]) groups[g.group] = [];
      groups[g.group].push(g);
    } else {
      ungrouped.push(g);
    }
  }

  // Assign groups first (largest groups first)
  const sortedGroups = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);

  for (const [_groupName, members] of sortedGroups) {
    // Find table with enough space
    const table = tableCopies.find((t) => t.capacity - t.assigned.length >= members.length);
    if (table) {
      for (const m of members) {
        table.assigned.push(m.id);
      }
    } else {
      // Split across tables
      const remaining = [...members];
      for (const t of tableCopies) {
        const space = t.capacity - t.assigned.length;
        if (space > 0 && remaining.length > 0) {
          const batch = remaining.splice(0, space);
          for (const m of batch) {
            t.assigned.push(m.id);
          }
        }
      }
      unassigned.push(...remaining.map((m) => m.id));
    }
  }

  // Assign ungrouped guests to remaining spaces
  for (const g of ungrouped) {
    const table = tableCopies.find((t) => t.capacity - t.assigned.length > 0);
    if (table) {
      table.assigned.push(g.id);
    } else {
      unassigned.push(g.id);
    }
  }

  const score = calculateScore(tableCopies, guests);
  const violationCount = countViolations(tableCopies, guests);

  return { tables: tableCopies, unassigned, score, violationCount };
}

/**
 * Calculate assignment score (higher = better).
 * @param {SeatTable[]} tables
 * @param {SeatGuest[]} guests
 * @returns {number}
 */
export function calculateScore(tables, guests) {
  let score = 0;
  const guestMap = new Map(guests.map((g) => [g.id, g]));

  for (const table of tables) {
    const tableSet = new Set(table.assigned);

    for (const gId of table.assigned) {
      const guest = guestMap.get(gId);
      if (!guest) continue;

      // +1 for each preferNear satisfied
      for (const near of guest.preferNear) {
        if (tableSet.has(near)) score++;
      }
      // -2 for each avoidNear violated
      for (const avoid of guest.avoidNear) {
        if (tableSet.has(avoid)) score -= 2;
      }
    }

    // Bonus for same-group at same table
    const groups = {};
    for (const gId of table.assigned) {
      const guest = guestMap.get(gId);
      if (guest?.group) {
        groups[guest.group] = (groups[guest.group] || 0) + 1;
      }
    }
    for (const count of Object.values(groups)) {
      if (count > 1) score += count;
    }
  }

  return score;
}

/**
 * Count constraint violations.
 * @param {SeatTable[]} tables
 * @param {SeatGuest[]} guests
 * @returns {number}
 */
export function countViolations(tables, guests) {
  let violations = 0;
  const guestMap = new Map(guests.map((g) => [g.id, g]));

  for (const table of tables) {
    const tableSet = new Set(table.assigned);
    for (const gId of table.assigned) {
      const guest = guestMap.get(gId);
      if (!guest) continue;
      for (const avoid of guest.avoidNear) {
        if (tableSet.has(avoid)) violations++;
      }
    }
  }

  return violations;
}

/**
 * Get seating stats.
 * @param {SeatTable[]} tables
 * @param {SeatGuest[]} guests
 * @returns {{ totalGuests: number, seated: number, unassigned: number, tableUtilization: number, avgOccupancy: number }}
 */
export function getSeatingStats(tables, guests) {
  const seated = tables.reduce((s, t) => s + t.assigned.length, 0);
  const totalCapacity = tables.reduce((s, t) => s + t.capacity, 0);
  const utilization = totalCapacity > 0 ? Math.round((seated / totalCapacity) * 100) : 0;
  const avgOccupancy = tables.length > 0 ? Math.round(seated / tables.length) : 0;

  return {
    totalGuests: guests.length,
    seated,
    unassigned: guests.length - seated,
    tableUtilization: utilization,
    avgOccupancy,
  };
}
