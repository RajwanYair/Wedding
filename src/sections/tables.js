/**
 * src/sections/tables.js — Tables section ESM module (S0.8)
 *
 * Table CRUD, seating floor plan, and auto-assignment logic.
 * No window.* dependencies.
 */

import { storeGet, storeSet } from "../core/store.js";
import { BaseSection, fromSection } from "../core/section-base.js";
import { el } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { uid } from "../utils/misc.js";
import { sanitize } from "../utils/sanitize.js";
import { enqueueWrite, syncStoreKeyToSheets } from "../core/sync.js";
import { TABLE_SHAPES } from "../core/constants.js";
import { validateSeating } from "../services/seating-constraints.js";
import {
  buildSeatRows,
  seatRowsToCsv,
  seatRowsToJson,
  downloadTextFile,
} from "../services/seating-exporter.js";

// ── Public lifecycle ──────────────────────────────────────────────────────

class TablesSection extends BaseSection {
  async onMount() {
    this.subscribe("tables", renderTables);
    this.subscribe("guests", renderTables);
    renderTables();
  }
}

export const { mount, unmount, capabilities } = fromSection(new TablesSection("tables"));

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
    shape: { type: "enum", values: [...TABLE_SHAPES], default: "round" },
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

  const tables = /** @type {any[]} */ (storeGet("tables") ?? []).filter((tb) => tb.id !== id);
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

  const unassigned = guests.filter((g) => !g.tableId && g.status !== "declined");
  // Sort by group priority
  unassigned.sort(
    (a, b) => priority.indexOf(a.group || "other") - priority.indexOf(b.group || "other"),
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

function renderTables() {
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const floor = el.seatingFloor;
  if (!floor) return;

  floor.textContent = "";

  // Compute seating constraint violations (Sprint 26 / C1)
  const guestTableMap = new Map(guests.filter((g) => g.tableId).map((g) => [g.id, g.tableId]));
  const tablesForValidation = tables.map((tb) => ({
    id: tb.id,
    guestIds: guests.filter((g) => g.tableId === tb.id).map((g) => g.id),
  }));
  const violations = validateSeating(tablesForValidation);
  /** @type {Set<string>} */
  const violatingTableIds = new Set();
  for (const v of violations) {
    const tA = guestTableMap.get(v.guestId);
    const tB = guestTableMap.get(v.targetGuestId);
    if (tA) violatingTableIds.add(tA);
    if (tB) violatingTableIds.add(tB);
  }
  _renderConstraintsBanner(violations, guests, floor);

  tables.forEach((tb) => {
    const seated = guests.filter((g) => g.tableId === tb.id).length;
    const card = document.createElement("div");
    card.className = `table-card table-card--${tb.shape || "round"}`;
    card.dataset.id = tb.id;

    const name = document.createElement("h3");
    name.textContent = tb.name;
    card.appendChild(name);

    const info = document.createElement("p");
    info.textContent = `${seated}/${tb.capacity} ${t("plural_seated", { count: seated })}`;
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

    // S12.4 Drop zone for drag-and-drop
    card.addEventListener("dragover", (e) => {
      e.preventDefault();
      card.classList.add("drop-highlight");
    });
    card.addEventListener("dragleave", () => {
      card.classList.remove("drop-highlight");
    });
    card.addEventListener("drop", (e) => {
      e.preventDefault();
      card.classList.remove("drop-highlight");
      const guestId = e.dataTransfer?.getData("text/plain");
      if (guestId) _assignGuestToTable(guestId, tb.id);
    });

    // Sprint 26: mark tables with constraint violations
    if (violatingTableIds.has(tb.id)) {
      card.classList.add("table-card--violation");
      const badge = document.createElement("span");
      badge.className = "constraint-violation-badge";
      badge.setAttribute("aria-label", t("seating_constraint_violation_hint"));
      badge.textContent = "⚠";
      name.appendChild(badge);
    }

    floor.appendChild(card);
  });

  if (el.tablesEmpty) {
    el.tablesEmpty.classList.toggle("u-hidden", tables.length > 0);
  }

  // Unassigned guests list
  _renderUnassigned(guests);

  // S11.2 Transport manifest
  _renderTransportManifest(guests);
}

// ── Constraint violations banner (Sprint 26 / C1) ─────────────────────

/**
 * Render a seating-constraint violations banner above the floor.
 * Clears any previous banner first.
 *
 * @param {import('../services/seating-constraints.js').ConstraintViolation[]} violations
 * @param {any[]} guests
 * @param {HTMLElement} floor
 */
function _renderConstraintsBanner(violations, guests, floor) {
  const bannerId = "seating-constraints-banner";
  const parent = floor.parentElement;
  const existing = parent?.querySelector(`#${bannerId}`);
  if (existing) existing.remove();
  if (!violations.length || !parent) return;

  const banner = document.createElement("div");
  banner.id = bannerId;
  banner.className = "constraint-violations-banner";
  banner.setAttribute("role", "alert");

  const heading = document.createElement("strong");
  heading.textContent = `⚠ ${t("seating_constraints_violations")}: ${violations.length}`;
  banner.appendChild(heading);

  const list = document.createElement("ul");
  violations.slice(0, 5).forEach((v) => {
    const gA = guests.find((g) => g.id === v.guestId);
    const gB = guests.find((g) => g.id === v.targetGuestId);
    const nameA = gA ? `${gA.firstName} ${gA.lastName ?? ""}`.trim() : v.guestId;
    const nameB = gB ? `${gB.firstName} ${gB.lastName ?? ""}`.trim() : v.targetGuestId;
    const key = v.type === "near" ? "seating_violation_near" : "seating_violation_far";
    const li = document.createElement("li");
    li.textContent = t(key).replace("{a}", nameA).replace("{b}", nameB);
    list.appendChild(li);
  });
  if (violations.length > 5) {
    const extra = document.createElement("li");
    extra.textContent = t("plural_constraints_more", { count: violations.length - 5 });
    list.appendChild(extra);
  }
  banner.appendChild(list);
  parent.insertBefore(banner, floor);
}

/** @param {any[]} guests */
function _renderUnassigned(guests) {
  const unassignedEl = document.getElementById("unassignedGuests");
  if (!unassignedEl) return;
  const unassigned = guests.filter((g) => !g.tableId && g.status !== "declined");
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
      // S12.4 Draggable
      row.draggable = true;
      row.dataset.guestId = g.id;
      row.addEventListener("dragstart", (e) => {
        e.dataTransfer?.setData("text/plain", g.id);
        row.classList.add("dragging");
      });
      row.addEventListener("dragend", () => {
        row.classList.remove("dragging");
      });
      unassignedEl.appendChild(row);
    });
  }
}

// ── S12.4 Drag-and-drop assignment ────────────────────────────────────────

/**
 * Assign a guest to a table via drag-and-drop.
 * @param {string} guestId
 * @param {string} tableId
 */
function _assignGuestToTable(guestId, tableId) {
  const guests = [.../** @type {any[]} */ (storeGet("guests") ?? [])];
  const idx = guests.findIndex((g) => g.id === guestId);
  if (idx !== -1) {
    guests[idx] = { ...guests[idx], tableId, updatedAt: new Date().toISOString() };
    storeSet("guests", guests);
    enqueueWrite("guests", () => syncStoreKeyToSheets("guests"));
  }
}

// ── S11.2 Transport Manifest ──────────────────────────────────────────────

/** @param {any[]} guests */
function _renderTransportManifest(guests) {
  const container = document.getElementById("transportManifest");
  if (!container) return;
  container.textContent = "";

  const withTransport = guests.filter((g) => g.transport && g.status !== "declined");
  if (withTransport.length === 0) {
    const p = document.createElement("p");
    p.className = "u-text-muted";
    p.textContent = t("transport_none") || "No transport requests";
    container.appendChild(p);
    return;
  }

  /** @type {Map<string, any[]>} route → guests */
  const routes = new Map();
  withTransport.forEach((g) => {
    const route = g.transport;
    if (!routes.has(route)) routes.set(route, []);
    routes.get(route).push(g);
  });

  routes.forEach((passengers, route) => {
    const section = document.createElement("div");
    section.className = "transport-route";

    const header = document.createElement("h4");
    const totalPax = passengers.reduce((s, g) => s + (g.count || 1) + (g.children || 0), 0);
    header.textContent = `🚌 ${route} — ${t("plural_transport_passengers", { count: totalPax })}`;
    section.appendChild(header);

    const table = document.createElement("table");
    table.className = "guest-table u-w-full";
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    [t("col_name"), t("col_phone"), t("col_guests_count")].forEach((h) => {
      const th = document.createElement("th");
      th.textContent = h;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    passengers.forEach((g) => {
      const tr = document.createElement("tr");
      const cells = [
        `${g.firstName} ${g.lastName || ""}`,
        g.phone || "",
        String((g.count || 1) + (g.children || 0)),
      ];
      cells.forEach((txt) => {
        const td = document.createElement("td");
        td.textContent = txt;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    section.appendChild(table);
    container.appendChild(section);
  });
}

/**
 * Export transport manifest as CSV.
 */
export function exportTransportCSV() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const withTransport = guests.filter((g) => g.transport && g.status !== "declined");
  const header = "Route,Name,Phone,Count";
  const rows = withTransport.map((g) =>
    [
      `"${g.transport}"`,
      `"${g.firstName} ${g.lastName || ""}"`,
      `"${g.phone || ""}"`,
      (g.count || 1) + (g.children || 0),
    ].join(","),
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "transport-manifest.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Print transport manifest.
 */
export function printTransportManifest() {
  document.body.classList.add("print-transport");
  window.print();
  document.body.classList.remove("print-transport");
}

// ── C1 Sprint 39: Seating chart export ───────────────────────────────────

/**
 * Export the full seating chart as a UTF-8 CSV file.
 * Columns: Table, Seat, Guest, Headcount.
 */
export function exportSeatMapCsv() {
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const rows = buildSeatRows(tables, guests);
  const csv = seatRowsToCsv(rows, {
    tableHeader: t("seating_export_col_table"),
    seatHeader: t("seating_export_col_seat"),
    guestHeader: t("seating_export_col_guest"),
    countHeader: t("seating_export_col_count"),
  });
  downloadTextFile(csv, "seating-chart.csv", "text/csv;charset=utf-8");
}

/**
 * Export the full seating chart as a JSON file.
 */
export function exportSeatMapJson() {
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const rows = buildSeatRows(tables, guests);
  downloadTextFile(seatRowsToJson(rows), "seating-chart.json", "application/json");
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
  const totalSeated = guests.reduce((s, g) => s + (g.tableId ? g.count || 1 : 0), 0);

  return {
    totalTables: tables.length,
    totalCapacity,
    totalSeated,
    available: totalCapacity - totalSeated,
  };
}

/**
 * Find tables with mixed dietary needs.
 * @returns {Array<{ tableId: string, tableName: string, meals: string[] }>}
 */
export function getTablesWithMixedDiets() {
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const result = [];
  for (const table of tables) {
    const seated = guests.filter((guest) => guest.tableId === table.id);
    const meals = [...new Set(seated.map((guest) => guest.meal || "regular"))];
    if (meals.length > 1) {
      result.push({ tableId: table.id, tableName: table.name || table.id, meals });
    }
  }
  return result;
}

/**
 * Compute table utilization percentages.
 * @returns {Array<{ tableId: string, name: string, capacity: number, seated: number, utilization: number }>}
 */
export function getTableUtilization() {
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  return tables.map((table) => {
    const seated = guests.filter((guest) => guest.tableId === table.id).length;
    const capacity = table.capacity || 10;
    return {
      tableId: table.id,
      name: table.name || table.id,
      capacity,
      seated,
      utilization: Math.round((seated / capacity) * 100),
    };
  });
}

/**
 * Count side balance per table.
 * @returns {Array<{ tableId: string, name: string, groom: number, bride: number, mutual: number }>}
 */
export function getTableSideBalance() {
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  return tables.map((table) => {
    const seated = guests.filter((guest) => guest.tableId === table.id);
    return {
      tableId: table.id,
      name: table.name || table.id,
      groom: seated.filter((guest) => guest.side === "groom").length,
      bride: seated.filter((guest) => guest.side === "bride").length,
      mutual: seated.filter((guest) => guest.side === "mutual" || !guest.side).length,
    };
  });
}

/**
 * Detect over-capacity tables.
 * @returns {Array<{ tableId: string, name: string, capacity: number, seated: number, over: number }>}
 */
export function getOverCapacityTables() {
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const overbooked = [];
  for (const table of tables) {
    const seated = guests.filter((guest) => guest.tableId === table.id).length;
    const capacity = table.capacity || 10;
    if (seated > capacity) {
      overbooked.push({
        tableId: table.id,
        name: table.name || table.id,
        capacity,
        seated,
        over: seated - capacity,
      });
    }
  }
  return overbooked;
}

/**
 * Count unseated confirmed guests by side and group.
 * @returns {{ total: number, bySide: Record<string, number>, byGroup: Record<string, number> }}
 */
export function getUnseatedGuestBreakdown() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const unseated = guests.filter((guest) => guest.status === "confirmed" && !guest.tableId);
  /** @type {Record<string, number>} */
  const bySide = {};
  /** @type {Record<string, number>} */
  const byGroup = {};
  for (const guest of unseated) {
    const side = guest.side || "mutual";
    bySide[side] = (bySide[side] || 0) + 1;
    const group = guest.group || "other";
    byGroup[group] = (byGroup[group] || 0) + 1;
  }
  return { total: unseated.length, bySide, byGroup };
}
