/**
 * src/services/whats-new-engine.js — S126 "What's New" decision engine.
 *
 * Pure, DOM-free helpers that complement `src/core/whats-new.js`. They
 * decide whether the modal should appear and produce the items list, so
 * the same logic can be unit-tested and reused outside the browser.
 */

/** Compare two semver-ish versions. Returns -1 / 0 / 1. */
export function compareSemver(/** @type {string|number} */ a, /** @type {string|number} */ b) {
  const pa = String(a ?? "").split(/[.+-]/).slice(0, 3).map((n) => Number.parseInt(n, 10));
  const pb = String(b ?? "").split(/[.+-]/).slice(0, 3).map((n) => Number.parseInt(n, 10));
  for (let i = 0; i < 3; i++) {
    const ai = Number.isFinite(pa[i]) ? pa[i] : 0;
    const bi = Number.isFinite(pb[i]) ? pb[i] : 0;
    if (ai > bi) return 1;
    if (ai < bi) return -1;
  }
  return 0;
}

/**
 * Should the What's New modal be shown?
 *
 * @param {{ currentVersion: string, lastSeenVersion?: string|null, isAdmin?: boolean }} input
 */
export function shouldShowWhatsNew({ currentVersion, lastSeenVersion, isAdmin }) {
  if (!isAdmin) return false;
  if (!currentVersion) return false;
  if (!lastSeenVersion) return true;
  return compareSemver(currentVersion, lastSeenVersion) > 0;
}

/** @typedef {{ version: string, date: string, items: string[] }} WhatsNewEntry */

/**
 * Collect entries from the manifest that are *newer* than `sinceVersion`.
 *
 * @param {WhatsNewEntry[]} entries
 * @param {string|null|undefined} sinceVersion
 * @returns {WhatsNewEntry[]}
 */
export function collectNewerEntries(entries, sinceVersion) {
  return (entries ?? [])
    .filter((e) => e?.version && (!sinceVersion || compareSemver(e.version, sinceVersion) > 0))
    .sort((a, b) => -compareSemver(a.version, b.version));
}

/**
 * Flatten entries to a single de-duplicated list of items, newest version
 * first. Useful for a simple "see all changes since last login" modal.
 *
 * @param {WhatsNewEntry[]} entries
 */
export function flattenItems(entries) {
  const seen = new Set();
  /** @type {string[]} */
  const out = [];
  for (const e of entries ?? []) {
    for (const it of e.items ?? []) {
      if (typeof it !== "string") continue;
      const key = it.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}
