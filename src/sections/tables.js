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
import { pushUndo } from "../utils/undo.js";

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
    notes: { type: "string", required: false, maxLength: 200 },
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
  // Snapshot for undo
  const allTables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const victim = allTables.find((tb) => tb.id === id);
  if (victim) pushUndo(`Delete table ${victim.name}`, "tables", JSON.parse(JSON.stringify(allTables)));
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
    const seated = guests
      .filter((g) => g.tableId === tb.id)
      .reduce((s, g) => s + (g.count || 1), 0);
    const cap = tb.capacity || 1;
    const fillPct = Math.round((seated / cap) * 100);
    const fillClass =
      fillPct >= 100
        ? "table-card--full"
        : fillPct >= 85
          ? "table-card--almost"
          : fillPct >= 50
            ? "table-card--half"
            : "";
    const card = document.createElement("div");
    card.className =
      `table-card table-card--${tb.shape || "round"} ${fillClass}`.trim();
    card.dataset.id = tb.id;

    // S23.3 — Detect dietary conflict (vegan/vegetarian + non-veg at same table)
    const tableGuests = guests.filter((g) => g.tableId === tb.id);
    const meals = tableGuests.map((g) => g.meal || "regular");
    const hasVegOrVegan = meals.some(
      (m) => m === "vegan" || m === "vegetarian",
    );
    const hasNonVeg = meals.some(
      (m) => m === "regular" || m === "kosher" || m === "gluten_free",
    );
    const hasDietaryConflict =
      hasVegOrVegan && hasNonVeg && tableGuests.length > 1;
    if (hasDietaryConflict) {
      const conflictBadge = document.createElement("span");
      conflictBadge.className = "table-conflict-badge";
      conflictBadge.title = t("table_dietary_conflict");
      conflictBadge.textContent = "⚠️";
      card.appendChild(conflictBadge);
    }

    const name = document.createElement("h3");
    name.textContent = tb.name;
    card.appendChild(name);

    const info = document.createElement("p");
    info.textContent = `${seated}/${tb.capacity} ${t("seated")}`;
    if (fillPct >= 100) info.className = "u-text-danger";
    else if (fillPct >= 85) info.className = "u-text-warning";
    card.appendChild(info);

    // Sprint 5: Capacity progress bar
    const bar = document.createElement("div");
    bar.className = "progress-bar progress-bar--table";
    const fill = document.createElement("div");
    fill.className = "progress-fill";
    fill.style.width = `${Math.min(fillPct, 100)}%`;
    bar.appendChild(fill);
    card.appendChild(bar);

    // Sprint 5: Dietary summary icons
    const dietaryIcons = _buildDietaryIcons(tableGuests);
    if (dietaryIcons) card.appendChild(dietaryIcons);

    // Sprint 5: Table notes
    if (tb.notes) {
      const notesEl = document.createElement("p");
      notesEl.className = "u-text-muted u-text-sm";
      notesEl.textContent = tb.notes;
      card.appendChild(notesEl);
    }

    // Action buttons
    const actions = document.createElement("div");
    actions.className = "table-card-actions";
    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-small btn-secondary";
    editBtn.textContent = t("btn_edit");
    editBtn.dataset.action = "openEditTableModal";
    editBtn.dataset.actionArg = tb.id;
    actions.appendChild(editBtn);
    // S21.4 Per-table place-card print button
    const printCardsBtn = document.createElement("button");
    printCardsBtn.className = "btn btn-small btn-ghost u-ml-xs";
    printCardsBtn.title = t("print_place_cards");
    printCardsBtn.textContent = "🃏";
    printCardsBtn.dataset.action = "printTablePlaceCards";
    printCardsBtn.dataset.actionArg = tb.id;
    actions.appendChild(printCardsBtn);
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

    floor.appendChild(card);
  });

  if (el.tablesEmpty) {
    el.tablesEmpty.classList.toggle("u-hidden", tables.length > 0);
  }

  // S17.4 Overbooking banner
  _renderOverbookingBanner(tables, guests);

  // Unassigned guests list
  _renderUnassigned(guests);

  // S11.2 Transport manifest
  _renderTransportManifest(guests);
}

/** Show/hide overbooking warning banner */
function _renderOverbookingBanner(tables, guests) {
  let bannerEl = document.getElementById("overbookingBanner");
  if (!bannerEl) {
    bannerEl = document.createElement("div");
    bannerEl.id = "overbookingBanner";
    bannerEl.className = "alert alert--warning u-hidden";
    const floor = el.seatingFloor;
    if (floor?.parentElement) floor.parentElement.insertBefore(bannerEl, floor);
  }
  const overbooked = tables.filter((tb) => {
    const seated = guests.filter((g) => g.tableId === tb.id).reduce((s, g) => s + (g.count || 1), 0);
    return seated > (tb.capacity || 0);
  });
  if (overbooked.length > 0) {
    bannerEl.textContent = `⚠️ ${t("tables_overbooked")}: ${overbooked.map((tb) => tb.name).join(", ")}`;
    bannerEl.classList.remove("u-hidden");
  } else {
    bannerEl.classList.add("u-hidden");
  }
}

/** @param {any[]} guests */
function _renderUnassigned(guests) {
  const unassignedEl = document.getElementById("unassignedGuests");
  if (!unassignedEl) return;
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

  const withTransport = guests.filter(
    (g) => g.transport && g.status !== "declined",
  );
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
    const totalPax = passengers.reduce(
      (s, g) => s + (g.count || 1) + (g.children || 0),
      0,
    );
    header.textContent = `🚌 ${route} — ${totalPax} ${t("transport_passengers")}`;
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
  const withTransport = guests.filter(
    (g) => g.transport && g.status !== "declined",
  );
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

// ── S16.2 Smart Table Optimizer ─────────────────────────────────────────

/**
 * Smart table auto-assign that balances guests by side, group, and dietary.
 * Groups guests by (side + group), then assigns each group to the best-fit table,
 * keeping same-side/group guests together and considering dietary preferences.
 */
export function smartAutoAssign() {
  const guests = [.../** @type {any[]} */ (storeGet("guests") ?? [])];
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);

  /** @type {Map<string, number>} */
  const usage = new Map(tables.map((tb) => [tb.id, 0]));
  guests.filter((g) => g.tableId).forEach((g) => {
    usage.set(g.tableId, (usage.get(g.tableId) ?? 0) + (g.count || 1));
  });

  const unassigned = guests.filter((g) => !g.tableId && g.status !== "declined");
  if (unassigned.length === 0) return 0;

  // Group by side+group key
  /** @type {Map<string, any[]>} */
  const groups = new Map();
  unassigned.forEach((g) => {
    const key = `${g.side || "mutual"}_${g.group || "friends"}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(g);
  });

  let assigned = 0;
  // Sort groups by size (largest first for best packing)
  const sortedGroups = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  for (const [_key, groupGuests] of sortedGroups) {
    // Find best-fit table: closest capacity to needed, preferring tables with same-side occupants
    const side = groupGuests[0]?.side || "mutual";
    const bestTable = tables
      .filter((tb) => (tb.capacity || 0) - (usage.get(tb.id) ?? 0) >= 1)
      .sort((a, b) => {
        const freeA = (a.capacity || 0) - (usage.get(a.id) ?? 0);
        const freeB = (b.capacity || 0) - (usage.get(b.id) ?? 0);
        // Prefer tables with same-side guests already
        const sameA = guests.filter((g) => g.tableId === a.id && g.side === side).length;
        const sameB = guests.filter((g) => g.tableId === b.id && g.side === side).length;
        if (sameB !== sameA) return sameB - sameA; // more same-side = better
        return freeA - freeB; // tighter fit = better
      });

    // Assign guests from this group to the best available tables
    for (const g of groupGuests) {
      const cnt = g.count || 1;
      const table = bestTable.find((tb) => (tb.capacity || 0) - (usage.get(tb.id) ?? 0) >= cnt);
      if (table) {
        const idx = guests.findIndex((ug) => ug.id === g.id);
        if (idx !== -1) { guests[idx] = { ...guests[idx], tableId: table.id }; assigned++; }
        usage.set(table.id, (usage.get(table.id) ?? 0) + cnt);
      }
    }
  }

  storeSet("guests", guests);
  enqueueWrite("guests", () => syncStoreKeyToSheets("guests"));
  return assigned;
}

// ── F4.1.1 Table Assignment Suggestions ──────────────────────────────────

/**
 * Return table assignment suggestions without applying them.
 * Each suggestion includes the guest, recommended table, and reasoning.
 * @returns {{ guestId: string, guestName: string, tableId: string, tableName: string, reason: string }[]}
 */
export function suggestTableAssignments() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);

  /** @type {Map<string, number>} */
  const usage = new Map(tables.map((tb) => [tb.id, 0]));
  guests.filter((g) => g.tableId).forEach((g) => {
    usage.set(g.tableId, (usage.get(g.tableId) ?? 0) + (g.count || 1));
  });

  const unassigned = guests.filter(
    (g) => !g.tableId && g.status !== "declined",
  );

  /** @type {{ guestId: string, guestName: string, tableId: string, tableName: string, reason: string }[]} */
  const suggestions = [];

  for (const g of unassigned) {
    const side = g.side || "mutual";
    const group = g.group || "friends";
    const meal = g.meal || "regular";
    const cnt = g.count || 1;

    // Score each table
    let bestTable = null;
    let bestScore = -Infinity;
    let bestReason = "";

    for (const tb of tables) {
      const free = (tb.capacity || 0) - (usage.get(tb.id) ?? 0);
      if (free < cnt) continue;

      let score = 0;
      const reasons = [];

      // Same side bonus
      const sameSide = guests.filter(
        (og) => og.tableId === tb.id && og.side === side,
      ).length;
      if (sameSide > 0) {
        score += sameSide * 3;
        reasons.push(t("suggest_same_side") || "אותו צד");
      }

      // Same group bonus
      const sameGroup = guests.filter(
        (og) => og.tableId === tb.id && og.group === group,
      ).length;
      if (sameGroup > 0) {
        score += sameGroup * 2;
        reasons.push(t("suggest_same_group") || "אותה קבוצה");
      }

      // Meal compatibility bonus (avoid mixing special diets)
      const isSpecialMeal = meal !== "regular";
      if (isSpecialMeal) {
        const sameMeal = guests.filter(
          (og) => og.tableId === tb.id && og.meal === meal,
        ).length;
        if (sameMeal > 0) {
          score += 2;
          reasons.push(t("suggest_same_meal") || "העדפת תזונה דומה");
        }
      }

      // Tighter fit = slightly better (avoids spreading across many tables)
      score += (1 - free / (tb.capacity || 1));

      if (score > bestScore) {
        bestScore = score;
        bestTable = tb;
        bestReason = reasons.length > 0 ? reasons.join(", ") : (t("suggest_best_fit") || "מקום פנוי");
      }
    }

    if (bestTable) {
      const name = [g.firstName, g.lastName].filter(Boolean).join(" ") || g.id;
      suggestions.push({
        guestId: g.id,
        guestName: name,
        tableId: bestTable.id,
        tableName: String(bestTable.name || bestTable.id),
        reason: bestReason,
      });
      // Track projected usage to avoid over-suggesting the same table
      usage.set(bestTable.id, (usage.get(bestTable.id) ?? 0) + cnt);
    }
  }

  return suggestions;
}

// ── Sprint 5: Dietary Icons Helper ───────────────────────────────────────

const MEAL_ICONS = { vegetarian: "🥬", vegan: "🌱", gluten_free: "🚫🌾", kosher: "✡️" };

/** @param {any[]} tableGuests @returns {HTMLElement|null} */
function _buildDietaryIcons(tableGuests) {
  const counts = {};
  for (const g of tableGuests) {
    const m = g.meal || "regular";
    if (m === "regular") continue;
    counts[m] = (counts[m] || 0) + 1;
  }
  const keys = Object.keys(counts);
  if (!keys.length) return null;
  const wrap = document.createElement("div");
  wrap.className = "table-dietary-icons";
  for (const k of keys) {
    const sp = document.createElement("span");
    sp.className = "table-dietary-icon";
    sp.title = `${t(`meal_${k}`)} (${counts[k]})`;
    sp.textContent = MEAL_ICONS[k] || "🍽️";
    wrap.appendChild(sp);
  }
  return wrap;
}

// ── Sprint 5: Export single table CSV ────────────────────────────────────

/**
 * Export a single table's guest list as CSV.
 * @param {string} tableId
 */
export function exportTableCSV(tableId) {
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const table = tables.find((tb) => tb.id === tableId);
  if (!table) return;
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const seated = guests.filter((g) => g.tableId === tableId);
  const header = "FirstName,LastName,Count,Meal,Status";
  const rows = seated.map((g) =>
    [g.firstName || "", g.lastName || "", g.count || 1, g.meal || "regular", g.status || "pending"].join(","),
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `table-${table.name || tableId}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
