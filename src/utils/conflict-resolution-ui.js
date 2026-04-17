/**
 * src/utils/conflict-resolution-ui.js — Conflict modal render helpers (Sprint 92)
 *
 * Pure utility functions that translate `ConflictResult[]` from
 * conflict-detector.js into data structures ready for the conflict modal.
 * No DOM manipulation — returns plain objects.
 */

/**
 * @typedef {{ id: string, field: string, localVal: unknown, remoteVal: unknown, strategy: string }} ConflictResult
 * @typedef {{ id: string, label: string, local: string, remote: string, strategy: string }} ConflictRow
 * @typedef {{ id: string, conflicts: ConflictRow[], resolvedBy?: string }} ConflictGroup
 */

/** Human-readable field labels.  Falls back to title-cased field name. */
const FIELD_LABELS = {
  firstName:    "First Name",
  lastName:     "Last Name",
  phone:        "Phone",
  email:        "Email",
  status:       "RSVP Status",
  tableId:      "Table",
  meal:         "Meal Preference",
  mealNotes:    "Meal Notes",
  accessibility:"Accessibility",
  notes:        "Notes",
  count:        "Guest Count",
  side:         "Side",
  group:        "Group",
  gift:         "Gift",
};

/**
 * Convert a camelCase field name to a human-readable label.
 * @param {string} field
 * @returns {string}
 */
function fieldLabel(field) {
  return (
    FIELD_LABELS[field] ??
    field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
  );
}

/**
 * Format a conflict value for display.
 * @param {unknown} val
 * @returns {string}
 */
function formatValue(val) {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  return String(val);
}

/**
 * Convert a flat ConflictResult[] into grouped ConflictGroup[] for rendering.
 * @param {ConflictResult[]} conflicts
 * @returns {ConflictGroup[]}
 */
export function buildConflictGroups(conflicts) {
  /** @type {Map<string, ConflictGroup>} */
  const groups = new Map();

  for (const c of conflicts) {
    if (!groups.has(c.id)) {
      groups.set(c.id, { id: c.id, conflicts: [] });
    }
    groups.get(c.id).conflicts.push({
      id:       `${c.id}__${c.field}`,
      label:    fieldLabel(c.field),
      local:    formatValue(c.localVal),
      remote:   formatValue(c.remoteVal),
      strategy: c.strategy,
    });
  }

  return [...groups.values()];
}

/**
 * Check if any conflict exists for a specific field across all groups.
 * @param {ConflictResult[]} conflicts
 * @param {string} field
 * @returns {boolean}
 */
export function hasConflictForField(conflicts, field) {
  return conflicts.some((c) => c.field === field);
}

/**
 * Get a summary string for display in a toast or banner.
 * @param {ConflictGroup[]} groups
 * @returns {string}
 */
export function conflictSummary(groups) {
  const total = groups.reduce((n, g) => n + g.conflicts.length, 0);
  if (total === 0) return "No conflicts";
  if (groups.length === 1) {
    return `${total} field conflict${total === 1 ? "" : "s"} for 1 record`;
  }
  return `${total} conflict${total === 1 ? "" : "s"} across ${groups.length} records`;
}

/**
 * Filter groups to only those needing manual resolution (strategy = "manual").
 * @param {ConflictGroup[]} groups
 * @returns {ConflictGroup[]}
 */
export function filterManualConflicts(groups) {
  return groups
    .map((g) => ({
      ...g,
      conflicts: g.conflicts.filter((c) => c.strategy === "manual"),
    }))
    .filter((g) => g.conflicts.length > 0);
}
