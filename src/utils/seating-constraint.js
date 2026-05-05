/**
 * src/utils/seating-constraint.js — S652 Relationship-based seating constraints
 *
 * Pure helpers for defining guest relationship constraints (keep-together,
 * keep-apart), validating table assignments against constraints, and
 * surfacing conflicts.
 *
 * @module seating-constraint
 * @owner tables
 */

/**
 * @typedef {object} Constraint
 * @property {string} guestA
 * @property {string} guestB
 * @property {"together"|"apart"} type
 * @property {string} [reason]
 */

/**
 * @typedef {object} Violation
 * @property {string} guestA
 * @property {string} guestB
 * @property {"together"|"apart"} type
 * @property {string} [reason]
 * @property {string} [tableA]
 * @property {string} [tableB]
 */

/**
 * Create a keep-together constraint.
 *
 * @param {string} guestA
 * @param {string} guestB
 * @param {string} [reason]
 * @returns {Constraint}
 */
export function keepTogether(guestA, guestB, reason) {
  return {
    guestA: String(guestA ?? ""),
    guestB: String(guestB ?? ""),
    type: "together",
    reason: reason ?? undefined,
  };
}

/**
 * Create a keep-apart constraint.
 *
 * @param {string} guestA
 * @param {string} guestB
 * @param {string} [reason]
 * @returns {Constraint}
 */
export function keepApart(guestA, guestB, reason) {
  return {
    guestA: String(guestA ?? ""),
    guestB: String(guestB ?? ""),
    type: "apart",
    reason: reason ?? undefined,
  };
}

/**
 * Validate a set of table assignments against constraints.
 *
 * @param {Constraint[]} constraints
 * @param {Record<string, string>} assignments - guestId → tableId
 * @returns {Violation[]}
 */
export function validateConstraints(constraints, assignments) {
  if (!Array.isArray(constraints) || !assignments) return [];
  const violations = [];

  for (const c of constraints) {
    const tableA = assignments[c.guestA];
    const tableB = assignments[c.guestB];

    if (tableA === undefined || tableB === undefined) continue;

    if (c.type === "together" && tableA !== tableB) {
      violations.push({ ...c, tableA, tableB });
    } else if (c.type === "apart" && tableA === tableB) {
      violations.push({ ...c, tableA, tableB });
    }
  }

  return violations;
}

/**
 * Check if a specific guest assignment violates any constraints.
 *
 * @param {string} guestId
 * @param {string} tableId
 * @param {Constraint[]} constraints
 * @param {Record<string, string>} assignments
 * @returns {Violation[]}
 */
export function checkGuestAssignment(guestId, tableId, constraints, assignments) {
  if (!Array.isArray(constraints) || !assignments) return [];
  const tempAssignments = { ...assignments, [guestId]: tableId };
  return validateConstraints(
    constraints.filter((c) => c.guestA === guestId || c.guestB === guestId),
    tempAssignments,
  );
}

/**
 * Get all constraints involving a specific guest.
 *
 * @param {Constraint[]} constraints
 * @param {string} guestId
 * @returns {Constraint[]}
 */
export function constraintsForGuest(constraints, guestId) {
  if (!Array.isArray(constraints)) return [];
  return constraints.filter((c) => c.guestA === guestId || c.guestB === guestId);
}

/**
 * Find guests that must sit with a given guest.
 *
 * @param {Constraint[]} constraints
 * @param {string} guestId
 * @returns {string[]}
 */
export function mustSitWith(constraints, guestId) {
  return constraintsForGuest(constraints, guestId)
    .filter((c) => c.type === "together")
    .map((c) => (c.guestA === guestId ? c.guestB : c.guestA));
}

/**
 * Find guests that must NOT sit with a given guest.
 *
 * @param {Constraint[]} constraints
 * @param {string} guestId
 * @returns {string[]}
 */
export function mustNotSitWith(constraints, guestId) {
  return constraintsForGuest(constraints, guestId)
    .filter((c) => c.type === "apart")
    .map((c) => (c.guestA === guestId ? c.guestB : c.guestA));
}

/**
 * Check for contradictory constraints (same pair with both together+apart).
 *
 * @param {Constraint[]} constraints
 * @returns {{ guestA: string, guestB: string }[]}
 */
export function findContradictions(constraints) {
  if (!Array.isArray(constraints)) return [];
  /** @type {Map<string, Set<string>>} */
  const together = new Map();
  /** @type {Map<string, Set<string>>} */
  const apart = new Map();

  for (const c of constraints) {
    const [a, b] = c.guestA < c.guestB ? [c.guestA, c.guestB] : [c.guestB, c.guestA];
    const target = c.type === "together" ? together : apart;
    if (!target.has(a)) target.set(a, new Set());
    // @ts-ignore
    target.get(a).add(b);
  }

  const contradictions = [];
  for (const [a, bSet] of together) {
    if (!apart.has(a)) continue;
    for (const b of bSet) {
      // @ts-ignore
      if (apart.get(a).has(b)) {
        contradictions.push({ guestA: a, guestB: b });
      }
    }
  }
  return contradictions;
}

/**
 * Summarize constraint statistics.
 *
 * @param {Constraint[]} constraints
 * @returns {{ total: number, together: number, apart: number, contradictions: number }}
 */
export function constraintSummary(constraints) {
  if (!Array.isArray(constraints)) return { total: 0, together: 0, apart: 0, contradictions: 0 };
  let together = 0;
  let apart = 0;
  for (const c of constraints) {
    if (c.type === "together") together++;
    else if (c.type === "apart") apart++;
  }
  return {
    total: constraints.length,
    together,
    apart,
    contradictions: findContradictions(constraints).length,
  };
}
