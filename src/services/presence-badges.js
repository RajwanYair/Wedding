/**
 * src/services/presence-badges.js — S112 realtime presence badges helper.
 *
 * Maps the raw presence list (from `services/presence.js`) into per-row
 * badge data for Tables and Guests UIs. A user is shown with a badge when
 * they are actively viewing the same record (advisory, last-seen ≤ 60s).
 *
 * The presence service tracks coarse "user is online"; this layer adds a
 * per-record overlay populated from the optional `viewing` field. A future
 * Supabase Realtime channel migration will keep this exact API.
 */

/** @typedef {{ email: string, name: string, lastSeen: string, viewing?: string }} PresenceUser */

/**
 * Returns true if a presence entry is fresh (last-seen within `maxAgeMs`).
 * @param {PresenceUser} u
 * @param {number} [maxAgeMs=60000]
 * @param {number} [now=Date.now()]
 */
export function isFresh(u, maxAgeMs = 60_000, now = Date.now()) {
  const t = Date.parse(u.lastSeen);
  if (Number.isNaN(t)) return false;
  return now - t <= maxAgeMs;
}

/**
 * Group fresh presence entries by the record they are viewing.
 * @param {PresenceUser[]} users
 * @param {number} [maxAgeMs]
 * @param {number} [now]
 * @returns {Map<string, PresenceUser[]>}  recordId → users
 */
export function groupByViewing(users, maxAgeMs, now) {
  /** @type {Map<string, PresenceUser[]>} */
  const out = new Map();
  for (const u of users) {
    if (!u?.viewing) continue;
    if (!isFresh(u, maxAgeMs, now)) continue;
    const list = out.get(u.viewing) ?? [];
    list.push(u);
    out.set(u.viewing, list);
  }
  return out;
}

/**
 * Compose a short badge label for one record (initials of up to 3 viewers,
 * plus a "+N" overflow). Stable ordering by name to keep the DOM diff small.
 *
 * @param {PresenceUser[]} viewers
 * @param {number} [maxIcons=3]
 * @returns {{ initials: string[], overflow: number, total: number }}
 */
export function badgeFor(viewers, maxIcons = 3) {
  const sorted = [...viewers].sort((a, b) =>
    (a.name || a.email).localeCompare(b.name || b.email),
  );
  const total = sorted.length;
  const head = sorted.slice(0, maxIcons);
  const initials = head.map((u) => {
    const src = u.name?.trim() || u.email || "?";
    return src.charAt(0).toUpperCase();
  });
  return { initials, overflow: Math.max(0, total - maxIcons), total };
}
