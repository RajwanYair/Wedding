/**
 * src/utils/audit-filter.js — S588 audit log viewer filtering
 *
 * Pure helpers used by the Settings → Audit Log viewer to filter
 * entries by action, entity, user, free-text query, and date range.
 *
 * @owner platform-team
 */

/**
 * @typedef {object} AuditEntry
 * @property {string=} action
 * @property {string=} entity
 * @property {string|null=} entityId
 * @property {string=} userEmail
 * @property {string=} ts                 // ISO timestamp
 * @property {unknown=} diff
 */

/**
 * @typedef {object} AuditFilter
 * @property {string=} action             // exact action match
 * @property {string=} entity             // exact entity match
 * @property {string=} userEmail          // case-insensitive substring
 * @property {string=} query              // free-text across all fields
 * @property {string=} from               // ISO date lower bound (inclusive)
 * @property {string=} to                 // ISO date upper bound (inclusive)
 */

/**
 * Filter a list of audit entries by the supplied criteria.
 * All criteria combine with logical AND. Empty/undefined criteria are ignored.
 *
 * @param {readonly AuditEntry[]} entries
 * @param {AuditFilter} [filter]
 * @returns {AuditEntry[]}
 */
export function filterAuditEntries(entries, filter = {}) {
  if (!Array.isArray(entries)) return [];
  const fromMs = filter.from ? Date.parse(filter.from) : Number.NEGATIVE_INFINITY;
  const toMs = filter.to ? Date.parse(filter.to) : Number.POSITIVE_INFINITY;
  const q = (filter.query ?? "").trim().toLowerCase();
  const userQ = (filter.userEmail ?? "").trim().toLowerCase();

  return entries.filter((e) => {
    if (filter.action && e.action !== filter.action) return false;
    if (filter.entity && e.entity !== filter.entity) return false;
    if (userQ && !(e.userEmail ?? "").toLowerCase().includes(userQ)) return false;
    if (e.ts) {
      const t = Date.parse(e.ts);
      if (Number.isFinite(t) && (t < fromMs || t > toMs)) return false;
    }
    if (q) {
      const hay = [
        e.action,
        e.entity,
        e.entityId,
        e.userEmail,
        typeof e.diff === "string" ? e.diff : JSON.stringify(e.diff ?? ""),
      ]
        .map((v) => String(v ?? "").toLowerCase())
        .join(" ");
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/**
 * Return the unique sorted set of action names present in `entries`.
 * Used to populate the audit log filter <select>.
 *
 * @param {readonly AuditEntry[]} entries
 * @returns {string[]}
 */
export function uniqueAuditActions(entries) {
  const out = new Set();
  for (const e of entries ?? []) {
    if (e?.action) out.add(e.action);
  }
  return [...out].sort();
}

/**
 * Return the unique sorted set of entity names present in `entries`.
 *
 * @param {readonly AuditEntry[]} entries
 * @returns {string[]}
 */
export function uniqueAuditEntities(entries) {
  const out = new Set();
  for (const e of entries ?? []) {
    if (e?.entity) out.add(e.entity);
  }
  return [...out].sort();
}
