/**
 * src/sections/tables.js — Tables section ESM module (S0.8)
 *
 * Table CRUD, seating floor plan, and auto-assignment logic.
 * No window.* dependencies.
 */

import { storeGet, storeSet, storeSubscribe } from "../core/store.js";
import { el } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { uid } from "../utils/misc.js";
import { sanitize } from "../utils/sanitize.js";
import { enqueueWrite, syncStoreKeyToSheets } from "../services/sheets.js";

/** @type {(() => void)[]} */
const _unsubs = [];

// ── Public lifecycle ──────────────────────────────────────────────────────

/**
 * @param {HTMLElement} _container
 */
export function mount(_container) {
  _unsubs.push(storeSubscribe("tables", renderTables));
  _unsubs.push(storeSubscribe("guests", renderTables));
  renderTables();
}

export function unmount() {
  _unsubs.forEach((fn) => fn());
  _unsubs.length = 0;
}

// ── Table CRUD ────────────────────────────────────────────────────────────

/**
 * @param {Record<string, unknown>} data
 * @param {string|null} [existingId]
 * @returns {{ ok: boolean, errors?: string[] }}
 */
export function saveTable(data, existingId = null) {
  const { value, errors } = sanitize(data, {
    name: { type: "string", required: true, maxLength: 60 },
    capacity: { type: "number", required: true, min: 1, max: 50 },
    shape: { type: "enum", values: ["round", "rect"], default: "round" },
  });
  if (errors.length) return { ok: false, errors };

  const tables = [.../** @type {any[]} */ (storeGet("tables") ?? [])];
  const now = new Date().toISOString();

  if (existingId) {
    const idx = tables.findIndex((tb) => tb.id === existingId);
    if (idx === -1) return { ok: false, errors: [t("error_table_not_found")] };
    tables[idx] = { ...tables[idx], ...value, updatedAt: now };
  } else {
    tables.push({ id: uid(), ...value, createdAt: now, updatedAt: now });
  }

  storeSet("tables", tables);
  enqueueWrite("tables", () => syncStoreKeyToSheets("tables"));
  return { ok: true };
}

/**
 * @param {string} id
 */
export function deleteTable(id) {
  // Unassign any seated guests
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []).map((g) =>
    g.tableId === id ? { ...g, tableId: null } : g,
  );
  storeSet("guests", guests);

  const tables = /** @type {any[]} */ (storeGet("tables") ?? []).filter(
    (tb) => tb.id !== id,
  );
  storeSet("tables", tables);
  enqueueWrite("tables", () => syncStoreKeyToSheets("tables"));
}

/**
 * Auto-assign unassigned guests to tables by group priority.
 * Fills tables in capacity order, preferring family > friends > work > other.
 */
export function autoAssignTables() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const priority = ["family", "friends", "work", "other"];

  /** @type {Map<string, number>} tableId → seats used */
  const usage = new Map(tables.map((tb) => [tb.id, 0]));
  guests
    .filter((g) => g.tableId)
    .forEach((g) => {
      const n = usage.get(g.tableId) ?? 0;
      usage.set(g.tableId, n + (g.count || 1));
    });

  const unassigned = guests.filter(
    (g) => !g.tableId && g.status !== "declined",
  );
  // Sort by group priority
  unassigned.sort(
    (a, b) =>
      priority.indexOf(a.group || "other") -
      priority.indexOf(b.group || "other"),
  );

  const updated = [...guests];
  unassigned.forEach((g) => {
    const guestCount = g.count || 1;
    const table = tables.find((tb) => {
      const used = usage.get(tb.id) ?? 0;
      return tb.capacity - used >= guestCount;
    });
    if (table) {
      const idx = updated.findIndex((ug) => ug.id === g.id);
      if (idx !== -1) updated[idx] = { ...updated[idx], tableId: table.id };
      usage.set(table.id, (usage.get(table.id) ?? 0) + guestCount);
    }
  });

  storeSet("guests", updated);
  enqueueWrite("tables", () => syncStoreKeyToSheets("tables"));
}

// ── Rendering ────────────────────────────────────────────────────────────

export function renderTables() {
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const floor = el.seatingFloor;
  if (!floor) return;

  floor.textContent = "";
  tables.forEach((tb) => {
    const seated = guests.filter((g) => g.tableId === tb.id).length;
    const card = document.createElement("div");
    card.className = `table-card table-card--${tb.shape || "round"}`;
    card.dataset.id = tb.id;

    const name = document.createElement("h3");
    name.textContent = tb.name;
    card.appendChild(name);

    const info = document.createElement("p");
    info.textContent = `${seated}/${tb.capacity} ${t("seated")}`;
    card.appendChild(info);

    // Action buttons
    const actions = document.createElement("div");
    actions.className = "table-card-actions";
    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-small btn-secondary";
    editBtn.textContent = t("btn_edit");
    editBtn.dataset.action = "openEditTableModal";
    editBtn.dataset.actionArg = tb.id;
    actions.appendChild(editBtn);
    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-small btn-danger u-ml-xs";
    delBtn.textContent = t("btn_delete");
    delBtn.dataset.action = "deleteTable";
    delBtn.dataset.actionArg = tb.id;
    actions.appendChild(delBtn);
    card.appendChild(actions);

    floor.appendChild(card);
  });

  if (el.tablesEmpty) {
    el.tablesEmpty.classList.toggle("u-hidden", tables.length > 0);
  }

  // Unassigned guests list
  const unassignedEl = document.getElementById("unassignedGuests");
  if (unassignedEl) {
    const unassigned = guests.filter(
      (g) => !g.tableId && g.status !== "declined",
    );
    unassignedEl.textContent = "";
    if (unassigned.length === 0) {
      const p = document.createElement("p");
      p.className = "u-text-muted";
      p.setAttribute("data-i18n", "all_guests_seated");
      p.textContent = t("all_guests_seated");
      unassignedEl.appendChild(p);
    } else {
      unassigned.forEach((g) => {
        const row = document.createElement("div");
        row.className = "unassigned-row";
        row.textContent = `${g.firstName} ${g.lastName || ""} (${t("count")}: ${g.count || 1})`;
        unassignedEl.appendChild(row);
      });
    }
  }
}

/**
 * Trigger browser print for the seating chart.
 */
export function printSeatingChart() {
  window.print();
}

/**
 * Trigger browser print for place cards.
 */
export function printPlaceCards() {
  document.body.classList.add("print-place-cards");
  window.print();
  document.body.classList.remove("print-place-cards");
}

/**
 * Trigger browser print for table signs.
 */
export function printTableSigns() {
  document.body.classList.add("print-table-signs");
  window.print();
  document.body.classList.remove("print-table-signs");
}

/**
 * Look up what table a guest is seated at.
 * Shows a result in the find-table output element.
 */
export function findTable() {
  const input = /** @type {HTMLInputElement|null} */ (
    document.getElementById("findTableInput")
  );
  const output = document.getElementById("findTableResult");
  if (!input || !output) return;

  const query = input.value.trim().toLowerCase();
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);

  const guest = guests.find(
    (g) =>
      `${g.firstName} ${g.lastName}`.toLowerCase().includes(query) ||
      (g.phone || "").includes(query),
  );

  if (!guest) {
    output.textContent = t("guest_not_found") || "Guest not found";
    return;
  }
  if (!guest.tableId) {
    output.textContent = t("no_table_assigned") || "No table assigned";
    return;
  }
  const table = tables.find((tb) => tb.id === guest.tableId);
  output.textContent = table
    ? `${t("table")}: ${table.name}`
    : t("table_not_found") || "Table not found";
}

/**
 * Pre-fill the table modal with an existing table and open it.
 * @param {string} id
 */
export function openTableForEdit(id) {
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const tb = tables.find((t) => t.id === id);
  if (!tb) return;
  const setVal = (elId, val) => {
    const input = /** @type {HTMLInputElement|HTMLSelectElement|null} */ (
      document.getElementById(elId)
    );
    if (input) input.value = String(val ?? "");
  };
  setVal("tableModalId", tb.id);
  setVal("tableName", tb.name ?? "");
  setVal("tableCapacity", tb.capacity ?? 10);
  setVal("tableShape", tb.shape ?? "round");
  const title = document.getElementById("tableModalTitle");
  if (title) title.setAttribute("data-i18n", "modal_edit_table");
}

// ── Stats ─────────────────────────────────────────────────────────────────

/**
 * Compute table occupancy statistics from the current store.
 * @returns {{ totalTables: number, totalCapacity: number, totalSeated: number, available: number }}
 */
export function getTableStats() {
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);

  const totalCapacity = tables.reduce((s, t) => s + (t.capacity || 0), 0);
  const totalSeated = guests.reduce(
    (s, g) => s + (g.tableId ? g.count || 1 : 0),
    0,
  );

  return {
    totalTables: tables.length,
    totalCapacity,
    totalSeated,
    available: totalCapacity - totalSeated,
  };
}
