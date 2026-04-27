/**
 * src/services/seating-solver.js — S110 AI seating CSP solver (greedy v1).
 *
 * Greedy seating heuristic that assigns guests to tables under the
 * constraints encoded on each guest:
 *   - `groupId` / `family`  — same group prefers same table
 *   - `mustWith: string[]`  — hard pairing (best-effort)
 *   - `avoidWith: string[]` — hard separation (best-effort)
 *
 * Returns assignments + a list of unsatisfied constraints. Pure function —
 * no side effects, no store writes. The Tables section will call this and
 * present results for user confirmation.
 *
 * Future v2 (Cluster IV) will swap in a true backtracking CSP solver.
 */

/** @typedef {{ id: string, name?: string, groupId?: string, family?: string, mustWith?: string[], avoidWith?: string[] }} SolverGuest */
/** @typedef {{ id: string, name?: string, capacity: number }} SolverTable */
/** @typedef {{ guestId: string, tableId: string|null }} Assignment */
/** @typedef {{ assignments: Assignment[], unsatisfied: Array<{guestId: string, reason: string}>, score: number }} SolverResult */

/**
 * Solve seating with a deterministic greedy algorithm.
 * Stable — same input → same output (no randomness).
 *
 * @param {SolverGuest[]} guests
 * @param {SolverTable[]} tables
 * @returns {SolverResult}
 */
export function solveSeating(guests, tables) {
  /** @type {Map<string, string[]>} */
  const groupMembers = new Map();
  for (const g of guests) {
    const key = g.groupId ?? g.family ?? `__solo:${g.id}`;
    const list = groupMembers.get(key) ?? [];
    list.push(g.id);
    groupMembers.set(key, list);
  }

  /** @type {Map<string, number>} */
  const remaining = new Map(tables.map((t) => [t.id, t.capacity]));
  /** @type {Map<string, string|null>} */
  const seatOf = new Map(guests.map((g) => [g.id, /** @type {string|null} */ (null)]));
  /** @type {Array<{guestId: string, reason: string}>} */
  const unsatisfied = [];

  // Sort groups largest first (better packing).
  const groups = [...groupMembers.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  );

  /** @type {Map<string, SolverGuest>} */
  const byId = new Map(guests.map((g) => [g.id, g]));

  for (const [, members] of groups) {
    // Try to find a table that fits the whole group and respects avoidWith.
    let placed = false;
    for (const tbl of tables) {
      const cap = remaining.get(tbl.id) ?? 0;
      if (cap < members.length) continue;
      // Check avoidWith conflicts with anyone already at this table.
      const seated = [...seatOf.entries()]
        .filter(([, tid]) => tid === tbl.id)
        .map(([gid]) => gid);
      const blocked = members.some((m) => {
        const guest = byId.get(m);
        const avoid = guest?.avoidWith ?? [];
        return avoid.some((a) => seated.includes(a));
      });
      if (blocked) continue;
      for (const m of members) seatOf.set(m, tbl.id);
      remaining.set(tbl.id, cap - members.length);
      placed = true;
      break;
    }
    if (!placed) {
      // Fallback: split members across any open seats.
      for (const m of members) {
        const tbl = tables.find((t) => (remaining.get(t.id) ?? 0) > 0);
        if (!tbl) {
          unsatisfied.push({ guestId: m, reason: "no_capacity" });
          continue;
        }
        seatOf.set(m, tbl.id);
        remaining.set(tbl.id, (remaining.get(tbl.id) ?? 0) - 1);
        unsatisfied.push({ guestId: m, reason: "group_split" });
      }
    }
  }

  // Verify mustWith pairings (advisory only at v1).
  for (const g of guests) {
    for (const partnerId of g.mustWith ?? []) {
      if (seatOf.get(g.id) !== seatOf.get(partnerId)) {
        unsatisfied.push({ guestId: g.id, reason: `mustWith:${partnerId}` });
      }
    }
  }

  const assignments = [...seatOf.entries()].map(([guestId, tableId]) => ({
    guestId,
    tableId,
  }));
  const placedCount = assignments.filter((a) => a.tableId !== null).length;
  const score =
    guests.length === 0
      ? 1
      : (placedCount - unsatisfied.length * 0.1) / guests.length;

  return { assignments, unsatisfied, score };
}
