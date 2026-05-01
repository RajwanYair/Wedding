/**
 * src/utils/guest-dedup.js — S455: Guest duplicate detection and merge utility
 *
 * Exports:
 *   findDuplicates(guests)              → DuplicatePair[]
 *   mergeGuests(primaryId, dupId, gs)   → Guest[] (new array with dup removed, primary enriched)
 * @owner sections
 */

import { cleanPhone } from "./phone.js";

/**
 * @typedef {{
 *   id: string,
 *   name?: string,
 *   phone?: string,
 *   [key: string]: unknown
 * }} GuestLike
 */

/**
 * @typedef {{ a: GuestLike, b: GuestLike, reason: string }} DuplicatePair
 */

/**
 * Normalise a phone number for comparison.
 * @param {string|undefined} raw
 * @returns {string}
 */
function _normPhone(raw) {
  if (!raw) return "";
  try {
    return cleanPhone(raw);
  } catch {
    return raw.replace(/\D/g, "");
  }
}

/**
 * Normalise a name for comparison (lowercase, no extra spaces).
 * @param {string|undefined} raw
 * @returns {string}
 */
function _normName(raw) {
  return (raw ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Find likely duplicate guests.
 * Pairs are detected when:
 *   - both have a non-empty phone that normalises to the same string, OR
 *   - both have a non-empty name that normalises to the same string
 *
 * @param {GuestLike[]} guests
 * @returns {DuplicatePair[]}
 */
export function findDuplicates(guests) {
  /** @type {DuplicatePair[]} */
  const pairs = [];
  /** @type {Map<string, GuestLike>} */
  const byPhone = new Map();
  /** @type {Map<string, GuestLike>} */
  const byName = new Map();

  for (const g of guests) {
    const phone = _normPhone(g.phone);
    const name = _normName(g.name);

    if (phone) {
      const existing = byPhone.get(phone);
      if (existing) {
        pairs.push({ a: existing, b: g, reason: "phone" });
      } else {
        byPhone.set(phone, g);
      }
    }

    if (name) {
      const existing = byName.get(name);
      if (existing) {
        // Only add if not already caught by phone match
        const alreadyPaired = pairs.some(
          (p) =>
            (p.a.id === existing.id && p.b.id === g.id) ||
            (p.a.id === g.id && p.b.id === existing.id),
        );
        if (!alreadyPaired) {
          pairs.push({ a: existing, b: g, reason: "name" });
        }
      } else {
        byName.set(name, g);
      }
    }
  }
  return pairs;
}

/**
 * Merge two duplicate guests: keep `primary`, copy non-empty fields from `dup`
 * that are empty on `primary`, then remove `dup` from the list.
 *
 * @param {string} primaryId
 * @param {string} dupId
 * @param {GuestLike[]} guests
 * @returns {GuestLike[]}
 */
export function mergeGuests(primaryId, dupId, guests) {
  const primary = guests.find((g) => g.id === primaryId);
  const dup = guests.find((g) => g.id === dupId);
  if (!primary || !dup) return guests;

  /** @type {GuestLike} */
  const merged = { ...primary };
  for (const [k, v] of Object.entries(dup)) {
    if (k === "id") continue;
    if (!merged[k] && v) merged[k] = v;
  }

  return guests.map((g) => (g.id === primaryId ? merged : g)).filter((g) => g.id !== dupId);
}
