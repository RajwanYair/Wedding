/**
 * src/utils/guest-tags.js — S460: Guest tag bulk operations.
 *
 * Pure functions over a Guest[] list. Tags are stored as `string[]` on each
 * guest. Functions return new arrays so callers can pass the result straight
 * to `storeSet("guests", …)`.
 * @owner shared
 */

/**
 * @typedef {{
 *   id: string,
 *   tags?: string[],
 *   status?: string,
 *   [key: string]: unknown
 * }} GuestLite
 */

/**
 * @param {string} tag
 * @returns {string}
 */
function _normTag(tag) {
  return String(tag ?? "").trim().toLowerCase();
}

/**
 * Add a tag to every guest whose id is in `ids`. No-op when the tag is empty.
 *
 * @param {GuestLite[]} guests
 * @param {string[]} ids
 * @param {string} tag
 * @returns {GuestLite[]}
 */
export function addTag(guests, ids, tag) {
  const t = _normTag(tag);
  if (!t || !Array.isArray(guests) || !Array.isArray(ids)) {
    return Array.isArray(guests) ? guests.slice() : [];
  }
  const idSet = new Set(ids);
  return guests.map((g) => {
    if (!idSet.has(g.id)) return g;
    const tags = Array.isArray(g.tags) ? g.tags : [];
    return tags.includes(t) ? g : { ...g, tags: [...tags, t] };
  });
}

/**
 * Remove a tag from every guest whose id is in `ids`.
 *
 * @param {GuestLite[]} guests
 * @param {string[]} ids
 * @param {string} tag
 * @returns {GuestLite[]}
 */
export function removeTag(guests, ids, tag) {
  const t = _normTag(tag);
  if (!t || !Array.isArray(guests) || !Array.isArray(ids)) {
    return Array.isArray(guests) ? guests.slice() : [];
  }
  const idSet = new Set(ids);
  return guests.map((g) => {
    if (!idSet.has(g.id)) return g;
    const tags = Array.isArray(g.tags) ? g.tags.filter((x) => x !== t) : [];
    return { ...g, tags };
  });
}

/**
 * Return the unique sorted set of tags across all guests.
 *
 * @param {GuestLite[]} guests
 * @returns {string[]}
 */
export function listTags(guests) {
  const out = new Set();
  if (!Array.isArray(guests)) return [];
  for (const g of guests) {
    if (Array.isArray(g.tags)) for (const t of g.tags) if (t) out.add(_normTag(t));
  }
  return [...out].sort();
}

/**
 * Filter guests by tag. Returns guests with `tag` in their tags array.
 *
 * @param {GuestLite[]} guests
 * @param {string} tag
 * @returns {GuestLite[]}
 */
export function filterByTag(guests, tag) {
  const t = _normTag(tag);
  if (!t || !Array.isArray(guests)) return [];
  return guests.filter((g) => Array.isArray(g.tags) && g.tags.includes(t));
}

/**
 * Set a status on every guest whose id is in `ids`.
 *
 * @param {GuestLite[]} guests
 * @param {string[]} ids
 * @param {string} status
 * @returns {GuestLite[]}
 */
export function bulkSetStatus(guests, ids, status) {
  if (!status || !Array.isArray(guests) || !Array.isArray(ids)) {
    return Array.isArray(guests) ? guests.slice() : [];
  }
  const idSet = new Set(ids);
  return guests.map((g) => (idSet.has(g.id) ? { ...g, status } : g));
}
