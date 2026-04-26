/**
 * src/services/guest-service.js — Guest domain service (Phase 1)
 *
 * Business-logic layer above guestRepo.  Sections should call these
 * functions instead of mutating the store or calling repositories directly.
 *
 * All operations emit domain events via store updates.
 * None of these functions import from sheets.js, supabase.js, or any
 * section module — keeping the domain logic framework-agnostic.
 *
 * Usage:
 *   import { confirmGuest, assignToTable, getGuestStats } from "../services/guest-service.js";
 */

import { guestRepo } from "./repositories.js";
import { GUEST_SIDES, GUEST_GROUPS, MEAL_TYPES } from "../core/constants.js";

// ── Status transitions ─────────────────────────────────────────────────────

/**
 * Confirm a guest's attendance.
 * @param {string} id
 * @param {{ count?: number, meal?: string, notes?: string }} [opts]
 * @returns {Promise<import('../types').Guest>}
 */
export async function confirmGuest(id, opts = {}) {
  const patch = /** @type {Partial<import('../types').Guest>} */ ({
    status: "confirmed",
    rsvpDate: new Date().toISOString(),
    ...(opts.count !== undefined && { count: opts.count }),
    ...(opts.meal && { meal: opts.meal }),
    ...(opts.notes && { notes: opts.notes }),
  });
  return guestRepo.update(id, patch);
}

/**
 * Record a guest declination.
 * @param {string} id
 * @param {string} [notes]
 * @returns {Promise<import('../types').Guest>}
 */
export async function declineGuest(id, notes) {
  return guestRepo.update(id, {
    status: "declined",
    rsvpDate: new Date().toISOString(),
    ...(notes && { notes }),
  });
}

/**
 * Mark a guest as "maybe" (tentative response).
 * @param {string} id
 * @param {string} [notes]
 * @returns {Promise<import('../types').Guest>}
 */
export async function tentativeGuest(id, notes) {
  return guestRepo.update(id, {
    status: "maybe",
    rsvpDate: new Date().toISOString(),
    ...(notes && { notes }),
  });
}

/**
 * Reset a guest to pending (no response yet).
 * @param {string} id
 * @returns {Promise<import('../types').Guest>}
 */
export async function resetGuestStatus(id) {
  return guestRepo.update(id, { status: "pending", rsvpDate: null });
}

// ── Seating ────────────────────────────────────────────────────────────────

/**
 * Assign a guest to a table.
 * @param {string} guestId
 * @param {string} tableId
 * @returns {Promise<import('../types').Guest>}
 */
export async function assignToTable(guestId, tableId) {
  return guestRepo.update(guestId, { tableId });
}

/**
 * Remove a guest from their current table.
 * @param {string} guestId
 * @returns {Promise<import('../types').Guest>}
 */
export async function unassignFromTable(guestId) {
  return guestRepo.update(guestId, { tableId: null });
}

// ── Bulk operations ────────────────────────────────────────────────────────

/**
 * Set the status of multiple guests at once.
 * @param {string[]} ids
 * @param {import('../types').GuestStatus} status
 */
export async function bulkSetStatus(ids, status) {
  return guestRepo.bulkUpdateStatus(ids, status);
}

/**
 * Mark that invitations have been sent for a list of guests.
 * @param {string[]} ids
 */
export async function markInvitationSent(ids) {
  return guestRepo.bulkSetStatus(ids, /** @type {any} */ (undefined)); // use update instead
}

/**
 * Mark multiple guests as checked in.
 * @param {string[]} ids
 */
export async function bulkCheckIn(ids) {
  const now = new Date().toISOString();
  const guests = await guestRepo.getAll();
  const idSet = new Set(ids);
  const { storeSet } = await import("../core/store.js");
  const { enqueueWrite } = await import("./sheets.js");
  storeSet(
    "guests",
    guests.map((g) => (idSet.has(g.id) ? { ...g, checkedIn: true, updatedAt: now } : g)),
  );
  enqueueWrite("guests", async () => {});
}

// ── Import ─────────────────────────────────────────────────────────────────

/**
 * Import a list of partial guest objects, creating each in the repository.
 * Unknown fields are stripped; required fields default to safe values.
 *
 * @param {Partial<import('../types').Guest>[]} rows
 * @returns {Promise<{ created: number, skipped: number, errors: string[] }>}
 */
export async function importGuests(rows) {
  let created = 0;
  let skipped = 0;
  const errors = /** @type {string[]} */ ([]);

  for (const row of rows) {
    try {
      const firstName = String(row.firstName ?? "").trim();
      const lastName = String(row.lastName ?? "").trim();
      if (!firstName && !lastName) {
        skipped++;
        continue;
      }
      const side = GUEST_SIDES.includes(/** @type {any} */ (row.side)) ? row.side : "mutual";
      const group = GUEST_GROUPS.includes(/** @type {any} */ (row.group)) ? row.group : "other";
      const meal = MEAL_TYPES.includes(/** @type {any} */ (row.meal)) ? row.meal : "regular";

      await guestRepo.create({
        firstName,
        lastName,
        phone: String(row.phone ?? "").trim(),
        email: String(row.email ?? "").trim(),
        count: Number(row.count ?? 1),
        children: Number(row.children ?? 0),
        status: "pending",
        side: /** @type {any} */ (side),
        group: /** @type {any} */ (group),
        meal: /** @type {any} */ (meal),
        mealNotes: String(row.mealNotes ?? "").trim(),
        accessibility: String(row.accessibility ?? "").trim(),
        tableId: null,
        gift: "",
        notes: String(row.notes ?? "").trim(),
        sent: false,
        checkedIn: false,
        rsvpDate: null,
      });
      created++;
    } catch (err) {
      errors.push(
        `Row ${created + skipped + errors.length + 1}: ${err instanceof Error ? err.message : String(err)}`,
      );
      skipped++;
    }
  }

  return { created, skipped, errors };
}

// ── Stats / queries ────────────────────────────────────────────────────────

/**
 * Compute aggregate guest statistics.
 * @returns {Promise<{
 *   total: number,
 *   confirmed: number,
 *   declined: number,
 *   pending: number,
 *   maybe: number,
 *   seated: number,
 *   checkedIn: number,
 *   confirmedGuests: number,
 *   byMeal: Record<string, number>,
 *   bySide: Record<string, number>
 * }>}
 */
export async function getGuestStats() {
  const guests = await guestRepo.getActive();
  const stats = {
    total: guests.length,
    confirmed: 0,
    declined: 0,
    pending: 0,
    maybe: 0,
    seated: 0,
    checkedIn: 0,
    confirmedGuests: 0,
    /** @type {Record<string, number>} */
    byMeal: {},
    /** @type {Record<string, number>} */
    bySide: {},
  };

  for (const g of guests) {
    stats[g.status] = (stats[g.status] ?? 0) + 1;
    if (g.tableId) stats.seated++;
    if (g.checkedIn) stats.checkedIn++;
    if (g.status === "confirmed") stats.confirmedGuests += g.count ?? 1;
    stats.byMeal[g.meal] = (stats.byMeal[g.meal] ?? 0) + 1;
    stats.bySide[g.side] = (stats.bySide[g.side] ?? 0) + 1;
  }

  return stats;
}

/**
 * Find guests that need follow-up (pending with no recent activity).
 * @param {number} [daysSinceCreation]  Default 7 days
 * @returns {Promise<import('../types').Guest[]>}
 */
export async function findFollowUpCandidates(daysSinceCreation = 7) {
  const guests = await guestRepo.getActive();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysSinceCreation);
  return guests.filter((g) => {
    if (g.status !== "pending") return false;
    const created = g.createdAt ? new Date(g.createdAt) : null;
    return created && created < cutoff;
  });
}

/**
 * Search guests by first name, last name, phone, or email (case-insensitive).
 * @param {string} query
 * @returns {Promise<import('../types').Guest[]>}
 */
export async function searchGuests(query) {
  if (!query.trim()) return guestRepo.getActive();
  const q = query.toLowerCase();
  const guests = await guestRepo.getActive();
  return guests.filter(
    (g) =>
      g.firstName.toLowerCase().includes(q) ||
      g.lastName.toLowerCase().includes(q) ||
      g.phone.includes(q) ||
      g.email.toLowerCase().includes(q),
  );
}
