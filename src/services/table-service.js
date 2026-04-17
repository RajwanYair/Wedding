/**
 * src/services/table-service.js — Table domain service (Phase 1)
 *
 * Business-logic layer above tableRepo and guestRepo.
 * Sections should call these functions instead of directly touching the store.
 *
 * Usage:
 *   import { assignGuestToTable, getCapacityReport, autoAssign } from "../services/table-service.js";
 */

import { tableRepo } from "./repositories.js";
import { guestRepo } from "./repositories.js";

// ── Single guest assignment ────────────────────────────────────────────────

/**
 * Assign a guest to a table (validates capacity).
 * Throws when the table is at capacity or the guest is not confirmed.
 *
 * @param {string} guestId
 * @param {string} tableId
 * @param {{ force?: boolean }} [opts]   force=true skips capacity check
 * @returns {Promise<import('../types').Guest>}
 */
export async function assignGuestToTable(guestId, tableId, opts = {}) {
  const [guest, table] = await Promise.all([
    guestRepo.getById(guestId),
    tableRepo.getById(tableId),
  ]);
  if (!guest) throw new Error(`Guest not found: ${guestId}`);
  if (!table) throw new Error(`Table not found: ${tableId}`);

  if (!opts.force) {
    const occupancy = await getTableOccupancy(tableId);
    if (occupancy.seated >= table.capacity) {
      throw new Error(`Table "${table.name}" is at capacity (${table.capacity})`);
    }
  }

  return guestRepo.update(guestId, { tableId });
}

/**
 * Remove a guest from their current table.
 * @param {string} guestId
 * @returns {Promise<import('../types').Guest>}
 */
export async function unassignGuestFromTable(guestId) {
  return guestRepo.update(guestId, { tableId: null });
}

/**
 * Move all guests from one table to another.
 * @param {string} sourceTableId
 * @param {string} targetTableId
 */
export async function moveTable(sourceTableId, targetTableId) {
  const guests = await guestRepo.getActive();
  const toSeat = guests.filter((g) => g.tableId === sourceTableId);
  for (const g of toSeat) {
    await guestRepo.update(g.id, { tableId: targetTableId });
  }
}

// ── Capacity helpers ───────────────────────────────────────────────────────

/**
 * Return occupancy counts for a specific table.
 * @param {string} tableId
 * @returns {Promise<{ capacity: number, seated: number, available: number }>}
 */
export async function getTableOccupancy(tableId) {
  const [table, guests] = await Promise.all([
    tableRepo.getById(tableId),
    guestRepo.getActive(),
  ]);
  if (!table) throw new Error(`Table not found: ${tableId}`);
  const seated = guests.filter((g) => g.tableId === tableId).length;
  return { capacity: table.capacity, seated, available: Math.max(0, table.capacity - seated) };
}

/**
 * Find tables that have at least `minAvailable` empty seats.
 * @param {number} [minAvailable]  Default 1
 * @returns {Promise<Array<import('../types').Table & { seated: number, available: number }>>}
 */
export async function findAvailableTables(minAvailable = 1) {
  const [tables, guests] = await Promise.all([tableRepo.getAll(), guestRepo.getActive()]);
  return tables
    .map((t) => {
      const seated = guests.filter((g) => g.tableId === t.id).length;
      const available = Math.max(0, t.capacity - seated);
      return { ...t, seated, available };
    })
    .filter((t) => t.available >= minAvailable);
}

// ── Capacity report ────────────────────────────────────────────────────────

/**
 * Get a summary of seating capacity.
 * @returns {Promise<{
 *   totalTables: number,
 *   totalCapacity: number,
 *   totalSeated: number,
 *   totalAvailable: number,
 *   occupancyRate: number,
 *   byTable: Array<{
 *     id: string, name: string, capacity: number, seated: number, available: number
 *   }>
 * }>}
 */
export async function getCapacityReport() {
  const [tables, guests] = await Promise.all([tableRepo.getAll(), guestRepo.getActive()]);

  const byTable = tables.map((t) => {
    const seated = guests.filter((g) => g.tableId === t.id).length;
    const available = Math.max(0, t.capacity - seated);
    return { id: t.id, name: t.name, capacity: t.capacity, seated, available };
  });

  const totalCapacity = byTable.reduce((s, t) => s + t.capacity, 0);
  const totalSeated = byTable.reduce((s, t) => s + t.seated, 0);
  const totalAvailable = byTable.reduce((s, t) => s + t.available, 0);
  const occupancyRate = totalCapacity > 0 ? Math.round((totalSeated / totalCapacity) * 100) : 0;

  return {
    totalTables: tables.length,
    totalCapacity,
    totalSeated,
    totalAvailable,
    occupancyRate,
    byTable,
  };
}

// ── Auto-assignment ────────────────────────────────────────────────────────

/**
 * Auto-assign a list of guests to available tables (first-fit strategy).
 * Guests that already have a table are skipped.
 *
 * @param {string[]} guestIds
 * @returns {Promise<{ assigned: number, skipped: number, unplaceable: string[] }>}
 */
export async function autoAssign(guestIds) {
  const [tables, guests] = await Promise.all([tableRepo.getAll(), guestRepo.getActive()]);

  // Build mutable occupancy map
  /** @type {Map<string, number>} tableId → current seated count */
  const occupancy = new Map(
    tables.map((t) => [t.id, guests.filter((g) => g.tableId === t.id).length]),
  );
  /** @type {Map<string, number>} tableId → capacity */
  const capacity = new Map(tables.map((t) => [t.id, t.capacity]));

  const idSet = new Set(guestIds);
  const targets = guests.filter((g) => idSet.has(g.id) && !g.tableId);

  let assigned = 0;
  const skipped = guestIds.length - targets.length; // already seated or not found
  const unplaceable = /** @type {string[]} */ ([]);

  for (const guest of targets) {
    const table = tables.find(
      (t) => (occupancy.get(t.id) ?? 0) < (capacity.get(t.id) ?? 0),
    );
    if (!table) {
      unplaceable.push(guest.id);
      continue;
    }
    await guestRepo.update(guest.id, { tableId: table.id });
    occupancy.set(table.id, (occupancy.get(table.id) ?? 0) + 1);
    assigned++;
  }

  return { assigned, skipped, unplaceable };
}

/**
 * Clear all table assignments for a set of guests (or all guests).
 * @param {string[]} [guestIds]  If omitted, clears all assignments
 */
export async function clearAssignments(guestIds) {
  const guests = await guestRepo.getActive();
  const idSet = guestIds ? new Set(guestIds) : null;
  const toUnassign = idSet
    ? guests.filter((g) => idSet.has(g.id) && g.tableId)
    : guests.filter((g) => g.tableId);
  for (const g of toUnassign) {
    await guestRepo.update(g.id, { tableId: null });
  }
}
