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
import { pushUndo } from "../utils/undo.js";
import {
  validateSeating,
  buildSeatRows,
  seatRowsToCsv,
  seatRowsToJson,
  downloadTextFile,
} from "../services/seating.js";
import {
  validateFurniture,
  findCollisions,
  totalArea,
} from "../utils/floor-plan.js";
import {
  planSeating as _planSeating,
  applyPlan as _applyPlan,
  remainingCapacity as _remainingCapacity,
} from "../utils/seating-optimizer.js";
import {
  keepTogether as _keepTogether,
  keepApart as _keepApart,
  validateConstraints as _validateConstraints,
} from "../utils/seating-constraint.js";
import {
  autoAssign as _autoAssign,
  createSeatGuest as _createSeatGuest,
  createSeatTable as _createSeatTable,
} from "../utils/guest-seating-auto.js";
import { getPreset as _getFloorPreset, listPresets as _listFloorPresets } from "../utils/floor-plan-presets.js";
import { toSvg as _floorPlanToSvg, exportLayout as _exportLayout } from "../utils/floor-plan-io.js";

// ── Public lifecycle ──────────────────────────────────────────────────────

class TablesSection extends BaseSection {
  async onMount() {
    this.subscribe("tables", renderTables);
    this.subscribe("guests", renderTables);
    this.subscribe("floorPlan", _renderFloorPlanCanvas);
    renderTables();
    _renderFloorPlanCanvas();
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
  // S411: snapshot tables before deletion so Ctrl+Z can restore it
  const tablesBefore = /** @type {any[]} */ (storeGet("tables") ?? []);
  const target = tablesBefore.find((tb) => tb.id === id);
  if (target) {
    pushUndo(t("undo_delete_table") || `Delete table ${target.name}`, "tables", [...tablesBefore]);
  }

  // Unassign any seated guests
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []).map((g) =>
    g.tableId === id ? { ...g, tableId: null } : g,
  );
  storeSet("guests", guests);

  const tables = tablesBefore.filter((tb) => tb.id !== id);
  storeSet("tables", tables);
  enqueueWrite("tables", () => syncStoreKeyToSheets("tables"));
}

/**
 * Auto-assign unassigned guests to tables by group priority.
 * S690: Upgraded to use guest-seating-auto.js `autoAssign` with constraints.
 */
export function autoAssignTables() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);

  const seatGuests = guests
    .filter((g) => g.status !== "declined")
    .map((g) =>
      _createSeatGuest({
        id: g.id,
        name: `${g.firstName || ""} ${g.lastName || ""}`.trim(),
        group: g.group ?? null,
        tableId: g.tableId ?? null,
        preferNear: [],
        avoidNear: [],
      }),
    );
  const seatTables = tables.map((tb) =>
    _createSeatTable({
      id: tb.id,
      label: tb.name || tb.id,
      capacity: tb.capacity || 8,
      assigned: guests.filter((g) => g.tableId === tb.id).map((g) => g.id),
    }),
  );

  const result = _autoAssign(seatGuests, seatTables);

  const assignMap = new Map(
    result.tables.flatMap((tb) => tb.assigned.map((gid) => [gid, tb.id])),
  );
  const updated = guests.map((g) => ({
    ...g,
    tableId: assignMap.has(g.id) ? assignMap.get(g.id) : g.tableId ?? null,
  }));

  storeSet("guests", updated);
  enqueueWrite("tables", () => syncStoreKeyToSheets("tables"));
}

// ── S690: Seating constraint config ──────────────────────────────────────

/** @type {import("../utils/seating-constraint.js").Constraint[]} */
let _seatingConstraints = [];

/** Toggle the seating constraint config panel. */
export function toggleSeatingConstraints() {
  const panel = /** @type {HTMLElement|null} */ (document.getElementById("seatingConstraintsPanel"));
  if (!panel) return;
  panel.hidden = !panel.hidden;
  if (!panel.hidden) {
    _populateConstraintGuestLists();
    _renderConstraintList();
  }
}

/**
 * Add a seating constraint from the constraint form fields.
 */
export function addSeatingConstraint() {
  const aEl = /** @type {HTMLInputElement|null} */ (document.getElementById("constraintGuestA"));
  const bEl = /** @type {HTMLInputElement|null} */ (document.getElementById("constraintGuestB"));
  const typeEl = /** @type {HTMLSelectElement|null} */ (document.getElementById("constraintType"));
  if (!aEl || !bEl || !typeEl) return;

  const nameA = aEl.value.trim();
  const nameB = bEl.value.trim();
  const type = /** @type {"together"|"apart"} */ (typeEl.value === "apart" ? "apart" : "together");

  if (!nameA || !nameB || nameA === nameB) return;

  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const gA = guests.find((g) => `${g.firstName || ""} ${g.lastName || ""}`.trim() === nameA);
  const gB = guests.find((g) => `${g.firstName || ""} ${g.lastName || ""}`.trim() === nameB);

  const idA = gA?.id ?? nameA;
  const idB = gB?.id ?? nameB;

  const constraint =
    type === "apart" ? _keepApart(idA, idB, `${nameA} / ${nameB}`) : _keepTogether(idA, idB, `${nameA} / ${nameB}`);
  _seatingConstraints = [..._seatingConstraints, constraint];

  aEl.value = "";
  bEl.value = "";
  _renderConstraintList();
  _renderConstraintViolations();
}

/**
 * Fill the guest datalists for constraint input autocomplete.
 */
function _populateConstraintGuestLists() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  for (const listId of ["constraintGuestListA", "constraintGuestListB"]) {
    const dl = document.getElementById(listId);
    if (!dl) continue;
    dl.textContent = "";
    for (const g of guests) {
      const name = `${g.firstName || ""} ${g.lastName || ""}`.trim();
      if (!name) continue;
      const opt = document.createElement("option");
      opt.value = name;
      dl.appendChild(opt);
    }
  }
}

/**
 * Render the list of current constraints.
 */
function _renderConstraintList() {
  const list = document.getElementById("seatingConstraintList");
  if (!list) return;
  list.textContent = "";

  if (!_seatingConstraints.length) {
    const p = document.createElement("p");
    p.className = "u-text-muted";
    p.textContent = t("constraint_empty");
    list.appendChild(p);
    return;
  }

  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const nameMap = new Map(
    guests.map((g) => [g.id, `${g.firstName || ""} ${g.lastName || ""}`.trim()]),
  );

  _seatingConstraints.forEach((c, idx) => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:0.5rem;align-items:center;padding:0.25rem 0;font-size:0.875rem";

    const icon = document.createElement("span");
    icon.textContent = c.type === "together" ? "🤝" : "↔️";

    const label = document.createElement("span");
    label.style.flex = "1";
    const nameA = nameMap.get(c.guestA) ?? c.guestA;
    const nameB = nameMap.get(c.guestB) ?? c.guestB;
    label.textContent = `${nameA} ${c.type === "together" ? t("constraint_together") : t("constraint_apart")} ${nameB}`;

    const del = document.createElement("button");
    del.className = "btn btn-ghost btn-small";
    del.textContent = "✕";
    del.addEventListener("click", () => {
      _seatingConstraints = _seatingConstraints.filter((_, i) => i !== idx);
      _renderConstraintList();
      _renderConstraintViolations();
    });

    row.appendChild(icon);
    row.appendChild(label);
    row.appendChild(del);
    list.appendChild(row);
  });
}

/**
 * Validate current table assignments against constraints and show violations.
 */
function _renderConstraintViolations() {
  const el = document.getElementById("seatingViolations");
  if (!el) return;
  if (!_seatingConstraints.length) {
    el.textContent = "";
    return;
  }

  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const assignments = Object.fromEntries(guests.filter((g) => g.tableId).map((g) => [g.id, g.tableId]));
  const violations = _validateConstraints(_seatingConstraints, assignments);

  if (!violations.length) {
    el.style.color = "var(--color-success, #22c55e)";
    el.textContent = t("constraint_no_violations");
    return;
  }

  el.style.color = "var(--color-danger, #ef4444)";
  el.textContent = t("constraint_violations").replace("{n}", String(violations.length));
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
 * @param {import('../services/seating.js').ConstraintViolation[]} violations
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
    routes.get(route)?.push(g);
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
 * S422: Open a print window with QR table cards (one per table).
 * Each card shows the table name, capacity, and a QR code linking to the
 * table check-in URL. Uses `qr-code.js` (zero deps) for client-side QR.
 */
export async function printQrTableCards() {
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  if (!tables.length) return;

  const { getQrDataUrl, buildCheckinUrl } = await import("../utils/qr-code.js");
  const cards = await Promise.all(
    tables.map(async (tb) => {
      const url = buildCheckinUrl(tb.id);
      const dataUrl = await getQrDataUrl(url, 180);
      return { name: tb.name || tb.id, capacity: tb.capacity ?? 10, dataUrl, url };
    }),
  );

  const cardHtml = cards
    .map(
      (c) =>
        `<div class="qr-card">
          <h2>${c.name.replace(/[<>&"]/g, (/** @type {string} */ ch) => (/** @type {Record<string,string>} */({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }))[ch] ?? ch)}</h2>
          <img src="${c.dataUrl}" alt="QR ${c.name}" width="180" height="180" />
          <p>${c.capacity} מקומות</p>
        </div>`,
    )
    .join("");

  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<title>כרטיסי QR לשולחנות</title>
<style>
  body{font-family:Arial,sans-serif;margin:0;padding:16px;background:#fff}
  .qr-grid{display:flex;flex-wrap:wrap;gap:16px;justify-content:center}
  .qr-card{border:2px solid #ccc;border-radius:8px;padding:16px;text-align:center;width:220px;break-inside:avoid}
  .qr-card h2{margin:0 0 8px;font-size:1.1rem}
  .qr-card p{margin:8px 0 0;font-size:0.85rem;color:#666}
  @media print{body{padding:0}.qr-grid{gap:8px}}
</style>
</head>
<body>
<div class="qr-grid">${cardHtml}</div>
</body>
</html>`);
  win.document.close();
  win.onload = () => win.print();
}

/**
 * Pre-fill the table modal with an existing table and open it.
 * @param {string} id
 */
export function openTableForEdit(id) {
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const tb = tables.find((t) => t.id === id);
  if (!tb) return;
  const setVal = (/** @type {string} */ elId, /** @type {string|number} */ val) => {
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

// ── S612: Floor-plan collision validator ──────────────────────────────────

/**
 * Read the persisted floor-plan layout. Stored under the `floorPlan`
 * store key as `{ items: Furniture[], room: { width, height } }`.
 * @returns {{ items: any[], room: { width: number, height: number } }}
 */
export function getFloorPlan() {
  const fp = /** @type {any} */ (storeGet("floorPlan")) ?? {};
  return {
    items: Array.isArray(fp.items) ? fp.items : [],
    room: fp.room && typeof fp.room === "object" ? fp.room : { width: 0, height: 0 },
  };
}

/**
 * Validate every furniture item in the current layout against the room
 * bounds and shape constraints, then collect any pairwise collisions.
 *
 * @returns {{ ok: boolean, errors: Record<string, string[]>, collisions: Array<[string, string]>, area: number }}
 */
export function validateFloorPlanLayout() {
  const { items, room } = getFloorPlan();
  /** @type {Record<string, string[]>} */
  const errors = {};
  for (const item of items) {
    const errs = validateFurniture(item, room);
    if (errs.length > 0) errors[item.id || "(unknown)"] = errs;
  }
  const collisions = findCollisions(items);
  return {
    ok: Object.keys(errors).length === 0 && collisions.length === 0,
    errors,
    collisions,
    area: totalArea(items),
  };
}

/**
 * Persist a single furniture item if it passes validation and does not
 * collide with any other item in the saved layout.
 *
 * @param {any} item
 * @returns {{ ok: boolean, errors?: string[], collidesWith?: string[] }}
 */
export function saveFloorPlanItem(item) {
  const { items, room } = getFloorPlan();
  const errs = validateFurniture(item, room);
  if (errs.length > 0) return { ok: false, errors: errs };
  const next = [...items.filter((i) => i.id !== item.id), item];
  const collisions = findCollisions(next).filter((p) => p.includes(item.id));
  if (collisions.length > 0) {
    return {
      ok: false,
      errors: [t("floor_plan_collision_detected")],
      collidesWith: collisions.map(([a, b]) => (a === item.id ? b : a)),
    };
  }
  storeSet("floorPlan", { items: next, room });
  enqueueWrite("floorPlan", () => syncStoreKeyToSheets("floorPlan"));
  return { ok: true };
}

// ── S616: Seating optimizer wiring ───────────────────────────────────────

/**
 * Build a deterministic seating plan for unseated confirmed guests using
 * the pure seating-optimizer helper.
 *
 * @param {{ confirmedOnly?: boolean }} [opts]
 * @returns {ReturnType<typeof _planSeating>}
 */
export function buildSeatingPlan(opts) {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  return _planSeating(guests, tables, opts ?? {});
}

/**
 * Apply a seating plan in-place, persist the updated guest list, and return
 * the count of new assignments + any leftover unseated ids.
 *
 * @param {ReturnType<typeof _planSeating>} plan
 * @returns {{ assigned: number, unseated: string[] }}
 */
export function commitSeatingPlan(plan) {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const next = _applyPlan(guests, plan);
  storeSet("guests", next);
  enqueueWrite("guests", () => syncStoreKeyToSheets("guests"));
  return { assigned: plan.assignments.length, unseated: [...plan.unseated] };
}

/** @returns {Record<string, number>} remaining seats per tableId */
export function getRemainingSeatsByTable() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  return Object.fromEntries(_remainingCapacity(tables, guests));
}

// ── S691: Floor-plan canvas ───────────────────────────────────────────────

/**
 * Apply a preset floor-plan layout to the store and re-render the canvas.
 * The preset select value drives which template is loaded.
 */
export function applyFloorPlanPreset() {
  const sel = /** @type {HTMLSelectElement|null} */ (document.getElementById("floorPlanPreset"));
  const presetId = sel?.value;
  if (!presetId) return;

  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const preset = _getFloorPreset(presetId, { tableCount: tables.length || 10 });
  if (!preset) return;

  storeSet("floorPlan", { items: preset.items, room: preset.room });
  enqueueWrite("floorPlan", () => syncStoreKeyToSheets("tables"));
  _renderFloorPlanCanvas();
}

/**
 * Export the current floor-plan canvas as an inline SVG download.
 */
export function exportFloorPlanSvg() {
  const fp = /** @type {any} */ (storeGet("floorPlan")) ?? {};
  const items = Array.isArray(fp.items) ? fp.items : [];
  const room = fp.room ?? { width: 800, height: 600 };
  const svg = _floorPlanToSvg(room, items);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "floor-plan.svg";
  a.click();
}

/**
 * Render the SVG floor-plan into #floorPlanCanvas, with collision highlights.
 */
function _renderFloorPlanCanvas() {
  const canvas = document.getElementById("floorPlanCanvas");
  const collisionEl = document.getElementById("floorPlanCollisions");
  if (!canvas) return;

  const fp = /** @type {any} */ (storeGet("floorPlan")) ?? {};
  const items = Array.isArray(fp.items) ? fp.items : [];
  const room = fp.room ?? { width: 800, height: 600 };

  if (!items.length) {
    canvas.textContent = t("floor_plan_empty");
    if (collisionEl) collisionEl.textContent = "";
    return;
  }

  const svg = _floorPlanToSvg(room, items);
  canvas.innerHTML = ""; // replaces existing SVG (safe: SVG markup from our own toSvg utility, no user data)
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, "image/svg+xml");
  const svgEl = doc.documentElement;
  svgEl.style.maxWidth = "100%";
  svgEl.style.height = "auto";
  canvas.appendChild(svgEl);

  // Show collision warnings
  const collisions = findCollisions(items);
  if (collisionEl) {
    if (collisions.length) {
      collisionEl.style.color = "var(--color-danger, #ef4444)";
      collisionEl.textContent = t("floor_plan_collisions").replace("{n}", String(collisions.length));
    } else {
      collisionEl.style.color = "var(--color-success, #22c55e)";
      collisionEl.textContent = t("floor_plan_no_collisions");
    }
  }
}

