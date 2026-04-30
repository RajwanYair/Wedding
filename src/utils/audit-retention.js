/**
 * src/utils/audit-retention.js — S456: SOC2-friendly audit log retention helpers.
 *
 * Pure functions over an audit log array. Callers persist the result via
 * `storeSet("auditLog", pruned)`.
 */

/**
 * @typedef {{ ts?: number|string, [key: string]: unknown }} AuditEntry
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @param {unknown} ts
 * @returns {number}  Epoch ms; `0` if unparseable.
 */
function _toEpoch(ts) {
  if (typeof ts === "number" && Number.isFinite(ts)) return ts;
  if (typeof ts === "string") {
    const n = Date.parse(ts);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * Return a new audit-log array containing only entries newer than `days`.
 *
 * @param {AuditEntry[]} entries
 * @param {number} days  Retention window in days (must be > 0). Entries with
 *                       no timestamp are dropped to keep the log honest.
 * @param {number} [now=Date.now()]  Override for tests.
 * @returns {AuditEntry[]}
 */
export function pruneAuditLog(entries, days, now = Date.now()) {
  if (!Array.isArray(entries) || days <= 0) return Array.isArray(entries) ? entries.slice() : [];
  const cutoff = now - days * DAY_MS;
  return entries.filter((e) => {
    const ts = _toEpoch(e?.ts);
    return ts > 0 && ts >= cutoff;
  });
}

/**
 * @param {AuditEntry[]} entries
 * @param {number} days
 * @param {number} [now=Date.now()]
 * @returns {number} How many entries would be removed by `pruneAuditLog`.
 */
export function countExpired(entries, days, now = Date.now()) {
  if (!Array.isArray(entries) || days <= 0) return 0;
  return entries.length - pruneAuditLog(entries, days, now).length;
}

/**
 * Group audit entries by their action key. Useful for SOC 2 frequency reports.
 * @param {AuditEntry[]} entries
 * @returns {Record<string, number>}
 */
export function summariseByAction(entries) {
  /** @type {Record<string, number>} */
  const out = {};
  if (!Array.isArray(entries)) return out;
  for (const e of entries) {
    const a = typeof e?.action === "string" ? e.action : "unknown";
    out[a] = (out[a] ?? 0) + 1;
  }
  return out;
}
