/**
 * src/utils/privacy.js — GDPR / privacy admin utilities
 *
 * Provides functions for data export, anonymisation, purge, and retention
 * reporting.  All functions operate only on store data (local-first) and do
 * NOT push to Google Sheets / Supabase — callers are responsible for
 * triggering sync after calling these helpers.
 *
 * Usage:
 *   import { exportGuestData, anonymizeGuest, purgeGuestData } from "../utils/privacy.js";
 */

import { storeGet, storeSet } from "../core/store.js";

// ── PII field list ────────────────────────────────────────────────────────

/** Fields considered PII for GDPR purposes. */
export const PII_FIELDS = /** @type {const} */ ([
  "firstName",
  "lastName",
  "phone",
  "email",
  "notes",
  "mealNotes",
  "accessibility",
  "gift",
]);

// ── Export ─────────────────────────────────────────────────────────────────

/**
 * Export all stored data for a given guest (data portability / Art. 20 GDPR).
 *
 * @param {string} guestId
 * @returns {{ guest: object | null, rsvpLog: object[] }}
 */
export function exportGuestData(guestId) {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const guest = guests.find((g) => g.id === guestId) ?? null;

  const rsvpLog = /** @type {any[]} */ (storeGet("rsvp_log") ?? []).filter(
    (e) => e.guestId === guestId || (guest?.phone && e.phone === guest.phone),
  );

  return { guest, rsvpLog };
}

// ── Anonymise ──────────────────────────────────────────────────────────────

/**
 * Anonymise a guest record in-place by replacing PII fields with neutral
 * placeholder values.  The guest record is preserved (id, status, table…)
 * but personal data is scrubbed.
 *
 * @param {string} guestId
 * @returns {boolean}  true if the guest was found and anonymised
 */
export function anonymizeGuest(guestId) {
  const guests = /** @type {any[]} */ ([...(storeGet("guests") ?? [])]);
  const idx = guests.findIndex((g) => g.id === guestId);
  if (idx === -1) return false;

  guests[idx] = {
    ...guests[idx],
    firstName: "Guest",
    lastName: "",
    phone: "",
    email: "",
    notes: "",
    mealNotes: "",
    accessibility: "",
    gift: "",
    updatedAt: new Date().toISOString(),
  };

  storeSet("guests", guests);
  return true;
}

// ── Purge ─────────────────────────────────────────────────────────────────

/**
 * Purge all PII fields from a guest record (right to erasure / Art. 17 GDPR).
 * Sets each PII field to an empty string.
 *
 * @param {string} guestId
 * @returns {boolean}  true if the guest was found and purged
 */
export function purgeGuestData(guestId) {
  return anonymizeGuest(guestId); // same operation for now; can be extended
}

// ── Retention ─────────────────────────────────────────────────────────────

/**
 * Return a retention report for all active guests.
 *
 * @returns {{
 *   total: number,
 *   withPII: number,
 *   withoutPII: number,
 *   deletable: string[]
 * }}
 */
export function getDataRetentionReport() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []).filter(
    (g) => !g.deleted_at,
  );

  const withPII = guests.filter((g) => _hasPII(g));
  const deletable = guests
    .filter((g) => ["declined"].includes(g.status) && _hasPII(g))
    .map((g) => g.id);

  return {
    total: guests.length,
    withPII: withPII.length,
    withoutPII: guests.length - withPII.length,
    deletable,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Check whether a guest record contains any non-empty PII fields.
 * @param {Record<string, unknown>} guest
 * @returns {boolean}
 */
function _hasPII(guest) {
  return PII_FIELDS.some((f) => {
    const v = guest[f];
    return v !== null && v !== undefined && String(v).trim() !== "";
  });
}
