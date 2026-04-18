/**
 * src/utils/guest-search.js — Guest search/filter utilities
 *
 * Pure functions for filtering and searching guest lists by name, phone,
 * status, side, group, meal, table, and accessibility needs.
 * No imports from other src modules — fully self-contained.
 */

/**
 * Normalize a string for fuzzy comparison: lowercase, strip diacritics, trim.
 * @param {string} s
 * @returns {string}
 */
export function normalizeSearch(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Check if a guest matches a free-text search query.
 * Matches against: firstName, lastName, phone, email, notes.
 * @param {any} guest
 * @param {string} query
 * @returns {boolean}
 */
export function guestMatchesQuery(guest, query) {
  if (!query) return true;
  const q = normalizeSearch(query);
  const fields = [
    guest.firstName,
    guest.lastName,
    `${guest.firstName ?? ""} ${guest.lastName ?? ""}`,
    guest.phone,
    guest.email,
    guest.notes,
  ];
  return fields.some((f) => f && normalizeSearch(String(f)).includes(q));
}

/**
 * Filter a guests array by an optional set of criteria.
 * All criteria are ANDed together; omitted keys are not filtered.
 *
 * @param {any[]} guests
 * @param {{
 *   query?: string,
 *   status?: string | string[],
 *   side?: string,
 *   group?: string,
 *   meal?: string,
 *   tableId?: string,
 *   accessibility?: boolean,
 *   checkedIn?: boolean,
 * }} [filters]
 * @returns {any[]}
 */
export function filterGuests(guests, filters = {}) {
  return guests.filter((g) => {
    if (filters.query !== undefined && !guestMatchesQuery(g, filters.query)) return false;

    if (filters.status !== undefined) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      if (!statuses.includes(g.status)) return false;
    }

    if (filters.side !== undefined && g.side !== filters.side) return false;
    if (filters.group !== undefined && g.group !== filters.group) return false;
    if (filters.meal !== undefined && g.meal !== filters.meal) return false;
    if (filters.tableId !== undefined && g.tableId !== filters.tableId) return false;

    if (filters.accessibility !== undefined && Boolean(g.accessibility) !== filters.accessibility) {
      return false;
    }

    if (filters.checkedIn !== undefined && Boolean(g.checkedIn) !== filters.checkedIn) {
      return false;
    }

    return true;
  });
}

/**
 * Sort a guest list by a given field.
 * @param {any[]} guests
 * @param {"firstName" | "lastName" | "status" | "side" | "group" | "createdAt" | "updatedAt"} field
 * @param {"asc" | "desc"} [dir]
 * @returns {any[]}
 */
export function sortGuests(guests, field, dir = "asc") {
  const sorted = [...guests].sort((a, b) => {
    const va = (a[field] ?? "").toString().toLowerCase();
    const vb = (b[field] ?? "").toString().toLowerCase();
    return va < vb ? -1 : va > vb ? 1 : 0;
  });
  return dir === "desc" ? sorted.reverse() : sorted;
}
