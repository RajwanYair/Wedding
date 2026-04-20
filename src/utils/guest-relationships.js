/**
 * src/utils/guest-relationships.js — Guest relationship graph (Sprint 39)
 *
 * Derives a simple in-memory relationship graph from the guest list using
 * the existing `group` and `side` fields.  Provides helpers for clustering,
 * conflict detection, and table-separation suggestions.
 *
 * Pure functions — no side effects, no external deps.
 *
 * Roadmap ref: Phase 3.6 — Advanced guest management
 *
 * @typedef {{ [guestId: string]: string[] }} AdjacencyMap
 *   Maps each guest ID to the IDs of guests in the same group cluster.
 *
 * @typedef {{
 *   guestA: string,
 *   guestB: string,
 *   reason: "conflict" | "cross_side",
 * }} RelationshipConflict
 */

// ── Graph builder ──────────────────────────────────────────────────────────

/**
 * Build an adjacency map: for each guest, list the IDs of guests who share
 * the same (side, group) pair — i.e. they are in the same cluster.
 * The guest itself is NOT included in its own adjacency list.
 *
 * @param {any[]} guests
 * @returns {AdjacencyMap}
 */
export function buildRelationshipGraph(guests) {
  /** @type {Map<string, string[]>} */
  const clusterKey = new Map();

  // Group by "side|group" key
  for (const g of guests) {
    const key = `${g.side ?? "unknown"}|${g.group ?? "unknown"}`;
    if (!clusterKey.has(key)) clusterKey.set(key, []);
    clusterKey.get(key).push(g.id);
  }

  /** @type {AdjacencyMap} */
  const graph = {};

  for (const g of guests) {
    const key   = `${g.side ?? "unknown"}|${g.group ?? "unknown"}`;
    const peers = clusterKey.get(key) ?? [];
    graph[g.id] = peers.filter((id) => id !== g.id);
  }

  return graph;
}

/**
 * Return all guests whose `group` matches the given group name.
 *
 * @param {any[]} guests
 * @param {string} group
 * @returns {any[]}
 */
export function getGroupMembers(guests, group) {
  return guests.filter((g) => g.group === group);
}

/**
 * Return all guests on the given side (bride | groom | other).
 *
 * @param {any[]} guests
 * @param {string} side
 * @returns {any[]}
 */
export function getSideMembers(guests, side) {
  return guests.filter((g) => g.side === side);
}

// ── Conflict detection ─────────────────────────────────────────────────────

/**
 * Find seating conflicts: pairs of guests who are in the same cluster
 * (same group+side) but assigned to DIFFERENT tables.
 * Returns one conflict entry per separated pair.
 *
 * @param {any[]}          guests
 * @param {AdjacencyMap}   graph
 * @returns {RelationshipConflict[]}
 */
export function findSeparatedGroupMembers(guests, graph) {
  const tableOf = new Map(guests.map((g) => [g.id, g.tableId]));

  /** @type {Set<string>} */
  const seen = new Set();
  /** @type {RelationshipConflict[]} */
  const conflicts = [];

  for (const g of guests) {
    for (const peerId of (graph[g.id] ?? [])) {
      const key = [g.id, peerId].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);

      const tA = tableOf.get(g.id);
      const tB = tableOf.get(peerId);
      if (tA && tB && tA !== tB) {
        conflicts.push({ guestA: g.id, guestB: peerId, reason: "conflict" });
      }
    }
  }

  return conflicts;
}

// ── Cluster statistics ─────────────────────────────────────────────────────

/**
 * Return cluster statistics: each unique (side, group) pair with member count,
 * head count, and how many tables the cluster is currently spread across.
 *
 * @param {any[]} guests
 * @returns {{
 *   key:        string,
 *   side:       string,
 *   group:      string,
 *   members:    number,
 *   heads:      number,
 *   tables:     number,
 *   tableIds:   string[],
 * }[]}
 */
export function getClusterStats(guests) {
  /** @type {Map<string, { side: string, group: string, ids: string[], heads: number, tableIds: Set<string> }>} */
  const clusters = new Map();

  for (const g of guests) {
    const side  = g.side  ?? "unknown";
    const group = g.group ?? "unknown";
    const key   = `${side}|${group}`;

    if (!clusters.has(key)) {
      clusters.set(key, { side, group, ids: [], heads: 0, tableIds: new Set() });
    }

    const c = clusters.get(key);
    c.ids.push(g.id);
    c.heads += (Number(g.count) || 1) + (Number(g.children) || 0);
    if (g.tableId) c.tableIds.add(g.tableId);
  }

  return [...clusters.entries()].map(([key, c]) => ({
    key,
    side:     c.side,
    group:    c.group,
    members:  c.ids.length,
    heads:    c.heads,
    tables:   c.tableIds.size,
    tableIds: [...c.tableIds],
  }));
}

/**
 * Suggest table reassignments to keep clusters together.
 * Returns clusters that are spread across more than one table along with a
 * suggestion for which table they should consolidate to (the most-occupied
 * table in the cluster).
 *
 * @param {any[]}    guests
 * @param {any[]}    tables  Table records with id, capacity
 * @returns {{
 *   clusterKey:     string,
 *   currentTables:  string[],
 *   suggestedTable: string | null,
 * }[]}
 */
export function suggestTableConsolidation(guests, tables) {
  const stats = getClusterStats(guests).filter((c) => c.tables > 1);
  const capacityOf = new Map(tables.map((t) => [t.id, t.capacity ?? 0]));

  return stats.map((c) => {
    // Pick the table with the largest capacity as consolidation target
    const sorted = [...c.tableIds].sort(
      (a, b) => (capacityOf.get(b) ?? 0) - (capacityOf.get(a) ?? 0),
    );
    return {
      clusterKey:     c.key,
      currentTables:  c.tableIds,
      suggestedTable: sorted[0] ?? null,
    };
  });
}
