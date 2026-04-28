/**
 * src/services/seating.js — Unified seating service (S186)
 *
 * Merged from:
 *   - seating-constraints.js (S138) — constraint engine
 *   - seating-solver.js      (S110) — greedy CSP solver
 *   - seating-exporter.js          — CSV / JSON export helpers
 */

import { storeGet, storeSet } from "../core/store.js";

// ── Typedefs ─────────────────────────────────────────────────────────────

/** @typedef {{ id: string, guestId: string, type: "near"|"far", targetGuestId: string, createdAt: string }} SeatingConstraint */
/** @typedef {{ constraintId: string, type: "near"|"far", guestId: string, targetGuestId: string, message: string }} ConstraintViolation */
/** @typedef {{ guestA: string, guestB: string, fromTableId: string|null, toTableId: string|null }} Swap */
/** @typedef {{ id: string, name?: string, groupId?: string, family?: string, mustWith?: string[], avoidWith?: string[] }} SolverGuest */
/** @typedef {{ id: string, name?: string, capacity: number }} SolverTable */
/** @typedef {{ guestId: string, tableId: string|null }} Assignment */
/** @typedef {{ assignments: Assignment[], unsatisfied: Array<{guestId: string, reason: string}>, score: number }} SolverResult */
/** @typedef {{ id: string, name?: string, shape?: string, capacity?: number }} TableRecord */
/** @typedef {{ id: string, firstName?: string, lastName?: string, name?: string, tableId?: string, count?: number }} GuestRecord */
/** @typedef {{ table: string, seat: number, guest: string, count: number }} SeatRow */

// ── Constraint engine (merged from seating-constraints.js, S138) ─────────

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
    let toTableId = guestTable.get(v.targetGuestId) ?? null;

    if (v.type === "far") {
      const other = tables.find((t) => t.id !== fromTableId);
      toTableId = other?.id ?? null;
    }

    return { guestA: v.guestId, guestB: v.targetGuestId, fromTableId, toTableId };
  });
}

// ── Greedy CSP solver (merged from seating-solver.js, S110) ─────────────

/**
 * Solve seating with a deterministic greedy algorithm.
 * @param {SolverGuest[]} guests
 * @param {SolverTable[]} tables
 * @returns {SolverResult}
 */
export function solveSeating(guests, tables) {
  /** @type {Map<string, string[]>} */
  const groupMembers = new Map();
  for (const g of guests) {
    const key = g.groupId ?? g.family ?? `__solo:${g.id}`;
    const list = groupMembers.get(key) ?? [];
    list.push(g.id);
    groupMembers.set(key, list);
  }

  /** @type {Map<string, number>} */
  const remaining = new Map(tables.map((t) => [t.id, t.capacity]));
  /** @type {Map<string, string|null>} */
  const seatOf = new Map(guests.map((g) => [g.id, /** @type {string|null} */ (null)]));
  /** @type {Array<{guestId: string, reason: string}>} */
  const unsatisfied = [];

  const groups = [...groupMembers.entries()].sort((a, b) => b[1].length - a[1].length);

  /** @type {Map<string, SolverGuest>} */
  const byId = new Map(guests.map((g) => [g.id, g]));

  for (const [, members] of groups) {
    let placed = false;
    for (const tbl of tables) {
      const cap = remaining.get(tbl.id) ?? 0;
      if (cap < members.length) continue;
      const seated = [...seatOf.entries()]
        .filter(([, tid]) => tid === tbl.id)
        .map(([gid]) => gid);
      const blocked = members.some((m) => {
        const guest = byId.get(m);
        const avoid = guest?.avoidWith ?? [];
        return avoid.some((a) => seated.includes(a));
      });
      if (blocked) continue;
      for (const m of members) seatOf.set(m, tbl.id);
      remaining.set(tbl.id, cap - members.length);
      placed = true;
      break;
    }
    if (!placed) {
      for (const m of members) {
        const tbl = tables.find((t) => (remaining.get(t.id) ?? 0) > 0);
        if (!tbl) {
          unsatisfied.push({ guestId: m, reason: "no_capacity" });
          continue;
        }
        seatOf.set(m, tbl.id);
        remaining.set(tbl.id, (remaining.get(tbl.id) ?? 0) - 1);
        unsatisfied.push({ guestId: m, reason: "group_split" });
      }
    }
  }

  for (const g of guests) {
    for (const partnerId of g.mustWith ?? []) {
      if (seatOf.get(g.id) !== seatOf.get(partnerId)) {
        unsatisfied.push({ guestId: g.id, reason: `mustWith:${partnerId}` });
      }
    }
  }

  const assignments = [...seatOf.entries()].map(([guestId, tableId]) => ({ guestId, tableId }));
  const placedCount = assignments.filter((a) => a.tableId !== null).length;
  const score =
    guests.length === 0 ? 1 : (placedCount - unsatisfied.length * 0.1) / guests.length;

  return { assignments, unsatisfied, score };
}

// ── Export helpers (merged from seating-exporter.js) ────────────────────

/**
 * Build a flat array of seat rows from tables + guests.
 * @param {TableRecord[]} tables
 * @param {GuestRecord[]} guests
 * @returns {SeatRow[]}
 */
export function buildSeatRows(tables, guests) {
  const tableNameById = new Map(
    tables.map((t) => [t.id, t.name || `Table ${t.id.slice(0, 6)}`]),
  );

  /** @type {SeatRow[]} */
  const rows = [];

  tables.forEach((tbl) => {
    const tableName = tableNameById.get(tbl.id) ?? tbl.id;
    const seated = guests.filter((g) => g.tableId === tbl.id);
    let seatNum = 1;
    seated.forEach((g) => {
      const guestName =
        [g.firstName, g.lastName].filter(Boolean).join(" ") || g.name || g.id;
      rows.push({ table: tableName, seat: seatNum, guest: guestName, count: g.count ?? 1 });
      seatNum++;
    });
  });

  return rows;
}

/**
 * Render seat rows as a UTF-8 CSV string (BOM-prefixed for Excel).
 * @param {SeatRow[]} rows
 * @param {{ tableHeader?: string, seatHeader?: string, guestHeader?: string, countHeader?: string }} [headers]
 * @returns {string}
 */
export function seatRowsToCsv(rows, headers = {}) {
  const H_TABLE = headers.tableHeader ?? "Table";
  const H_SEAT = headers.seatHeader ?? "Seat";
  const H_GUEST = headers.guestHeader ?? "Guest";
  const H_COUNT = headers.countHeader ?? "Headcount";

  const esc = (/** @type {string|number} */ v) => {
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const header = [H_TABLE, H_SEAT, H_GUEST, H_COUNT].map(esc).join(",");
  const body = rows.map((r) => [r.table, r.seat, r.guest, r.count].map(esc).join(","));
  return `\uFEFF${[header, ...body].join("\n")}`;
}

/**
 * Render seat rows as a JSON string.
 * @param {SeatRow[]} rows
 * @returns {string}
 */
export function seatRowsToJson(rows) {
  return JSON.stringify(rows, null, 2);
}

/**
 * Trigger a browser download of the given text as a file.
 * @param {string} text
 * @param {string} filename
 * @param {string} [mimeType]
 */
export function downloadTextFile(text, filename, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
