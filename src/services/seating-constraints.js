/**
 * src/services/seating-constraints.js — Sprint 138
 *
 * Seating constraint engine: enforce "near" / "far" guest relationships.
 */

import { initStore, storeGet, storeSet } from "../core/store.js";

initStore({ seatingConstraints: { value: [] } });

/**
 * @typedef {{ id: string, guestId: string, type: "near"|"far", targetGuestId: string, createdAt: string }} SeatingConstraint
 * @typedef {{ constraintId: string, type: "near"|"far", guestId: string, targetGuestId: string, message: string }} ConstraintViolation
 * @typedef {{ guestA: string, guestB: string, fromTableId: string|null, toTableId: string|null }} Swap
 */

/**
 * Add a seating constraint.
 * @param {{ guestId: string, type: "near"|"far", targetGuestId: string }} params
 * @returns {string} Constraint id
 */
export function addConstraint({ guestId, type, targetGuestId }) {
  if (type !== "near" && type !== "far") throw new Error(`Invalid constraint type: ${type}`);
  const id = `sc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const constraint = { id, guestId, type, targetGuestId, createdAt: new Date().toISOString() };
  const existing = storeGet("seatingConstraints") ?? [];
  storeSet("seatingConstraints", [...existing, constraint]);
  return id;
}

/**
 * Remove a constraint by id.
 * @param {string} id
 */
export function removeConstraint(id) {
  const constraints = (storeGet("seatingConstraints") ?? []).filter((c) => c.id !== id);
  storeSet("seatingConstraints", constraints);
}

/**
 * List all constraints.
 * @returns {SeatingConstraint[]}
 */
export function listConstraints() {
  return storeGet("seatingConstraints") ?? [];
}

/**
 * Validate a seating arrangement against all constraints.
 * @param {Array<{ id: string, guestIds: string[] }>} tables
 * @returns {ConstraintViolation[]}
 */
export function validateSeating(tables) {
  const constraints = storeGet("seatingConstraints") ?? [];
  /** @type {Map<string, string>} guestId → tableId */
  const guestTable = new Map();
  for (const table of tables) {
    for (const gid of table.guestIds ?? []) {
      guestTable.set(gid, table.id);
    }
  }

  /** @type {ConstraintViolation[]} */
  const violations = [];
  for (const c of constraints) {
    const tableA = guestTable.get(c.guestId);
    const tableB = guestTable.get(c.targetGuestId);
    if (tableA === undefined || tableB === undefined) continue;

    if (c.type === "near" && tableA !== tableB) {
      violations.push({
        constraintId: c.id,
        type: "near",
        guestId: c.guestId,
        targetGuestId: c.targetGuestId,
        message: `Guests ${c.guestId} and ${c.targetGuestId} must be at the same table`,
      });
    } else if (c.type === "far" && tableA === tableB) {
      violations.push({
        constraintId: c.id,
        type: "far",
        guestId: c.guestId,
        targetGuestId: c.targetGuestId,
        message: `Guests ${c.guestId} and ${c.targetGuestId} must not be at the same table`,
      });
    }
  }
  return violations;
}

/**
 * Suggest minimal swaps to resolve constraint violations.
 * Simple heuristic: for "near" violations, suggest moving guestId to targetId's table.
 * For "far" violations, suggest moving guestId to a different table.
 *
 * @param {Array<{ id: string, guestIds: string[] }>} tables
 * @param {ConstraintViolation[]} violations
 * @returns {Swap[]}
 */
export function suggestSwaps(tables, violations) {
  /** @type {Map<string, string>} guestId → tableId */
  const guestTable = new Map();
  for (const table of tables) {
    for (const gid of table.guestIds ?? []) {
      guestTable.set(gid, table.id);
    }
  }

  /** @type {Swap[]} */
  return violations.map((v) => {
    const fromTableId = guestTable.get(v.guestId) ?? null;
    let toTableId     = guestTable.get(v.targetGuestId) ?? null;

    if (v.type === "far") {
      // Move to a different table
      const other = tables.find((t) => t.id !== fromTableId);
      toTableId = other?.id ?? null;
    }

    return { guestA: v.guestId, guestB: v.targetGuestId, fromTableId, toTableId };
  });
}
