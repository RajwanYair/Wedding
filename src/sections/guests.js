/**
 * src/sections/guests.js — Guests section ESM module (S0.8)
 *
 * Guest CRUD, filtering, sorting, export, optimistic UI, and Sheets sync.
 * No window.* dependencies — uses reactive store and named imports.
 */

import { storeGet, storeSet, storeSubscribe } from "../core/store.js";
import { el } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { uid } from "../utils/misc.js";
import { cleanPhone, isValidPhone } from "../utils/phone.js";
import { sanitize } from "../utils/sanitize.js";
import { enqueueWrite, syncStoreKeyToSheets } from "../services/sheets.js";
import { pushUndo } from "../utils/undo.js";

/** @type {(() => void)[]} */
const _unsubs = [];

/** @type {Set<string>} IDs of guests awaiting sync confirmation (S3.3 optimistic UI) */
const _pendingSync = new Set();

/** @type {string} current filter: "all" | status | side | group */
let _filter = "all";

/** @type {boolean} show VIP guests only */
let _vipOnly = false;

/** @type {string} current sort field */
let _sortField = "lastName";

/** @type {string} current search query */
let _searchQuery = "";

// ── Public lifecycle ──────────────────────────────────────────────────────

/**
 * Mount the guests section.
 * @param {HTMLElement} _container
 */
export function mount(_container) {
  _unsubs.push(storeSubscribe("guests", renderGuests));
  renderGuests();
}

/** Unmount — unsubscribe from store. */
export function unmount() {
  _unsubs.forEach((fn) => fn());
  _unsubs.length = 0;
}

// ── Guest CRUD ────────────────────────────────────────────────────────────

/**
 * Add or update a guest in the store, optimistically mark as pending sync.
 * @param {Record<string, unknown>} data  Raw form data (validated internally)
 * @param {string|null} [existingId]      Omit to create; provide to update
 * @returns {{ ok: boolean, errors?: string[] }}
 */
export function saveGuest(data, existingId = null) {
  const schema = {
    firstName: { type: "string", required: true, maxLength: 80 },
    lastName: { type: "string", required: false, maxLength: 80 },
    phone: { type: "string", required: false },
    email: { type: "string", required: false, maxLength: 120 },
    count: { type: "number", min: 1, max: 50, default: 1 },
    children: { type: "number", min: 0, max: 20, default: 0 },
    status: {
      type: "enum",
      values: ["pending", "confirmed", "declined", "maybe"],
      default: "pending",
    },
    side: {
      type: "enum",
      values: ["groom", "bride", "mutual"],
      default: "mutual",
    },
    group: {
      type: "enum",
      values: ["family", "friends", "work", "other"],
      default: "friends",
    },
    meal: {
      type: "enum",
      values: ["regular", "vegetarian", "vegan", "gluten_free", "kosher"],
      default: "regular",
    },
    rsvpSource: {
      type: "enum",
      values: ["web", "whatsapp", "phone", "manual", "other"],
      default: "manual",
    },
  };
  const { value, errors } = sanitize(data, schema);
  if (errors.length) return { ok: false, errors };

  // Normalise phone
  if (value.phone) value.phone = cleanPhone(String(value.phone));

  const guests = [.../** @type {any[]} */ (storeGet("guests") ?? [])];
  const now = new Date().toISOString();

  // Duplicate phone detection
  if (value.phone) {
    const duplicate = guests.find(
      (g) => g.phone === value.phone && g.id !== existingId,
    );
    if (duplicate) {
      return {
        ok: false,
        errors: [t("error_duplicate_phone") || "Duplicate phone number"],
      };
    }
  }

  if (existingId) {
    const idx = guests.findIndex((g) => g.id === existingId);
    if (idx === -1) return { ok: false, errors: [t("error_guest_not_found")] };
    guests[idx] = { ...guests[idx], ...value, updatedAt: now };
    _pendingSync.add(existingId);
  } else {
    const guest = { id: uid(), ...value, createdAt: now, updatedAt: now };
    guests.push(guest);
    _pendingSync.add(guest.id);
  }

  storeSet("guests", guests);
  enqueueWrite("guests", () => syncStoreKeyToSheets("guests"));
  return { ok: true };
}

/**
 * Delete a guest by ID.
 * @param {string} id
 */
export function deleteGuest(id) {
  const all = /** @type {any[]} */ (storeGet("guests") ?? []);
  const victim = all.find((g) => g.id === id);
  if (victim) {
    pushUndo(
      `Delete guest ${victim.firstName}`,
      "guests",
      JSON.parse(JSON.stringify(all)),
    );
  }
  const guests = all.filter((g) => g.id !== id);
  storeSet("guests", guests);
  _pendingSync.delete(id);
  enqueueWrite("guests", () => syncStoreKeyToSheets("guests"));
}

/**
 * Mark all pending syncs as resolved (called by sheets service on success).
 */
export function clearGuestPendingSync() {
  _pendingSync.clear();
  // Remove data-sync-pending attribute from all rows
  document.querySelectorAll("tr[data-sync-pending]").forEach((tr) => {
    delete (/** @type {HTMLElement} */ (tr).dataset.syncPending);
  });
}

// ── Rendering ────────────────────────────────────────────────────────────

/**
 * Set the active filter and re-render.
 * @param {string} filter
 */
export function setFilter(filter) {
  _filter = filter;
  renderGuests();
}

/**
 * Set the sort field and re-render.
 * @param {string} field
 */
export function setSortField(field) {
  _sortField = field;
  renderGuests();
}

/**
 * Set the search query and re-render.
 * @param {string} query
 */
export function setSearchQuery(query) {
  _searchQuery = query.toLowerCase();
  renderGuests();
}

/**
 * Render the guest table from current store state, applying filter + sort.
 */
export function renderGuests() {
  const tbody = el.guestTableBody;
  const empty = el.guestsEmpty;
  if (!tbody) return;

  let guests = /** @type {any[]} */ (storeGet("guests") ?? []);

  // S14.1 Multi-criteria filter
  if (_filter !== "all") {
    guests = guests.filter(
      (g) => g.status === _filter || g.side === _filter || g.group === _filter,
    );
  }
  if (_multiFilter.status !== "all") {
    guests = guests.filter((g) => g.status === _multiFilter.status);
  }
  if (_multiFilter.side !== "all") {
    guests = guests.filter((g) => g.side === _multiFilter.side);
  }
  if (_multiFilter.group !== "all") {
    guests = guests.filter(
      (g) => (g.group || "friends") === _multiFilter.group,
    );
  }
  if (_multiFilter.meal !== "all") {
    guests = guests.filter((g) => (g.meal || "regular") === _multiFilter.meal);
  }
  if (_multiFilter.table !== "all") {
    if (_multiFilter.table === "unassigned") {
      guests = guests.filter((g) => !g.tableId);
    } else {
      guests = guests.filter((g) => g.tableId === _multiFilter.table);
    }
  }

  // S17.1 Full-text search (name, phone, email, notes, group, meal, tags)
  if (_searchQuery) {
    guests = guests.filter(
      (g) =>
        `${g.firstName} ${g.lastName}`.toLowerCase().includes(_searchQuery) ||
        (g.phone || "").includes(_searchQuery) ||
        (g.email || "").toLowerCase().includes(_searchQuery) ||
        (g.notes || "").toLowerCase().includes(_searchQuery) ||
        (g.meal || "").toLowerCase().includes(_searchQuery) ||
        (g.group || "").toLowerCase().includes(_searchQuery) ||
        (Array.isArray(g.tags) ? g.tags.join(" ") : "")
          .toLowerCase()
          .includes(_searchQuery),
    );
  }

  // S19.2 VIP-only filter
  if (_vipOnly) {
    guests = guests.filter((g) => g.vip === true);
  }

  // Sort
  guests = [...guests].sort((a, b) => {
    const av = String(a[_sortField] ?? "");
    const bv = String(b[_sortField] ?? "");
    return av.localeCompare(bv, "he");
  });

  // Table rows
  tbody.textContent = "";
  guests.forEach((g) => {
    const tr = document.createElement("tr");
    tr.dataset.id = g.id;
    if (_pendingSync.has(g.id)) tr.dataset.syncPending = "1";

    // S11.4 Checkbox column
    const checkTd = document.createElement("td");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "guest-select-cb";
    cb.dataset.guestId = g.id;
    cb.addEventListener("change", _updateBatchToolbar);
    checkTd.appendChild(cb);
    tr.appendChild(checkTd);

    const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
    const table = tables.find((tb) => tb.id === g.tableId);
    const cells = [
      `${g.firstName} ${g.lastName || ""}`,
      t(`side_${g.side}`) || g.side || "",
      g.phone || "",
      String((g.count || 1) + (g.children || 0)),
      t(`meal_${g.meal}`) || g.meal || "",
      g.transport || "",
      t(`status_${g.status}`) || g.status,
      table ? table.name : "",
    ];
    cells.forEach((txt, ci) => {
      const td = document.createElement("td");
      // S15.5 — Highlight search terms in name, phone columns
      if (_searchQuery && (ci === 0 || ci === 2)) {
        _highlightText(td, txt, _searchQuery);
      } else {
        td.textContent = txt;
      }
      // S14.5 — Show tags in name cell
      if (ci === 0 && Array.isArray(g.tags) && g.tags.length > 0) {
        g.tags.forEach((tag) => {
          const badge = document.createElement("span");
          badge.className = "badge badge--tag";
          badge.textContent = tag;
          td.appendChild(document.createTextNode(" "));
          td.appendChild(badge);
        });
      }
      tr.appendChild(td);
    });

    // Actions cell
    const actionsTd = document.createElement("td");
    actionsTd.className = "u-text-nowrap";
    // S21.5 Notes expand button
    if (g.notes) {
      const notesBtn = document.createElement("button");
      notesBtn.className = "btn btn-icon btn-small u-mr-xs";
      notesBtn.title = t("guest_notes_expand");
      notesBtn.textContent = "📝";
      notesBtn.dataset.action = "toggleGuestNotes";
      notesBtn.dataset.actionArg = g.id;
      actionsTd.appendChild(notesBtn);
    }
    // S22.4 RSVP source badge
    if (g.rsvpSource && g.rsvpSource !== "manual") {
      const srcBadge = document.createElement("span");
      srcBadge.className = "badge badge--info u-mr-xs";
      srcBadge.title = t("label_rsvp_source");
      const srcIcons = { web: "🌐", whatsapp: "💬", phone: "📞", other: "❓" };
      srcBadge.textContent = srcIcons[g.rsvpSource] ?? "❓";
      actionsTd.appendChild(srcBadge);
    }
    // S19.2 VIP star button
    const vipBtn = document.createElement("button");
    vipBtn.className = `btn btn-icon btn-small u-mr-xs${g.vip ? " btn-vip-active" : ""}`;
    vipBtn.title = t("guest_vip_toggle");
    vipBtn.textContent = g.vip ? "⭐" : "☆";
    vipBtn.dataset.action = "toggleGuestVip";
    vipBtn.dataset.actionArg = g.id;
    actionsTd.appendChild(vipBtn);
    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-small btn-secondary";
    editBtn.textContent = t("btn_edit");
    editBtn.dataset.action = "openEditGuestModal";
    editBtn.dataset.actionArg = g.id;
    actionsTd.appendChild(editBtn);
    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-small btn-danger u-ml-xs";
    delBtn.textContent = t("btn_delete");
    delBtn.dataset.action = "deleteGuest";
    delBtn.dataset.actionArg = g.id;
    actionsTd.appendChild(delBtn);
    tr.appendChild(actionsTd);

    tbody.appendChild(tr);
  });

  if (empty) {
    empty.classList.toggle("u-hidden", guests.length > 0);
  }
  renderMealSummary();
}

/**
 * S21.1 — Render a meal-type summary bar in #mealSummaryBar.
 * Shows counts for each meal type across ALL guests (not filtered).
 */
export function renderMealSummary() {
  const bar = document.getElementById("mealSummaryBar");
  if (!bar) return;
  const allGuests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const MEAL_TYPES = [
    { key: "regular", icon: "🍽️" },
    { key: "vegetarian", icon: "🥗" },
    { key: "vegan", icon: "🌱" },
    { key: "gluten_free", icon: "🌾" },
    { key: "kosher", icon: "✡️" },
    { key: "other", icon: "🍴" },
  ];
  bar.textContent = "";
  MEAL_TYPES.forEach(({ key, icon }) => {
    const count = allGuests.filter((g) => (g.meal || "regular") === key).length;
    if (count === 0) return;
    const chip = document.createElement("span");
    chip.className = "meal-chip";
    chip.title = t(`meal_${key}`);
    chip.textContent = `${icon} ${t(`meal_${key}`)} ${count}`;
    bar.appendChild(chip);
  });
}

/**
 * Export guest list as CSV blob URL.
 * @returns {string} object URL
 */
export function exportGuestsCsv() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const header = "ID,First,Last,Phone,Status,Count,Children,Side,Group,Meal";
  const rows = guests.map(
    (g) =>
      `${g.id},${g.firstName},${g.lastName || ""},${g.phone || ""},` +
      `${g.status},${g.count || 1},${g.children || 0},${g.side || ""},` +
      `${g.group || ""},${g.meal || ""}`,
  );
  const csv = [header, ...rows].join("\n");
  return URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );
}

/** @returns {boolean} */
export function isValidGuestPhone(phone) {
  return isValidPhone(phone);
}

/**
 * Export guest list as CSV file download.
 */
export function exportGuestsCSV() {
  const url = exportGuestsCsv();
  const a = document.createElement("a");
  a.href = url;
  a.download = "guests.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Set filter by side (groom/bride/mutual).
 * @param {string} side
 */
export function setSideFilter(side) {
  _filter = side;
  renderGuests();
}

/**
 * Trigger browser print for guest list.
 */
export function printGuests() {
  window.print();
}

/**
 * S23.2 — Open a print window with guests grouped by table assignment.
 * Confirmed guests first, then others; unseated guests in a separate section.
 */
export function printGuestsByTable() {
  const allGuests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const tableNames = new Map(tables.map((tb) => [tb.id, tb.name]));

  /** @type {Map<string|null, any[]>} */
  const byTable = new Map();
  byTable.set(null, []);
  for (const tb of tables) byTable.set(tb.id, []);
  for (const g of allGuests) {
    const key = g.tableId ?? null;
    if (!byTable.has(key)) byTable.set(key, []);
    byTable.get(key).push(g);
  }

  const esc = (/** @type {string} */ s) => String(s).replace(/</g, "&lt;").replace(/>/g, "&gt;");

  let html = `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8">
<title>${t("print_guests_by_table")}</title>
<style>body{font-family:Arial,sans-serif;direction:rtl;padding:1rem}
h1{text-align:center;margin-bottom:.5rem}
.subtitle{text-align:center;color:#666;margin-bottom:1.5rem}
h2{background:#f0f0f0;padding:4px 10px;margin:1rem 0 4px;border-radius:4px}
table{width:100%;border-collapse:collapse;margin-bottom:6px;font-size:.9rem}
th,td{padding:5px 8px;border:1px solid #ccc;text-align:right}
th{background:#e8e8e8}
.un{font-style:italic;color:#888}
@media print{button{display:none}}</style></head><body>
<h1>${esc(t("print_guests_by_table"))}</h1>
<p class="subtitle">${new Date().toLocaleDateString("he-IL")} \u2022 ${allGuests.length} ${esc(t("stat_guests"))}</p>
<button onclick="window.print()" style="margin-bottom:1rem">🖨️ ${esc(t("action_print"))}</button>`;

  for (const [tableId, guestList] of byTable) {
    if (guestList.length === 0) continue;
    const tableName = tableId ? (tableNames.get(tableId) ?? tableId) : t("print_unseated");
    html += `<h2>${esc(String(tableName))} (${guestList.length})</h2>
<table><thead><tr><th>#</th><th>${esc(t("label_first_name"))}</th><th>${esc(t("label_last_name"))}</th><th>${esc(t("label_phone"))}</th><th>${esc(t("label_meal"))}</th><th>${esc(t("label_status"))}</th></tr></thead><tbody>`;
    const sorted = [...guestList].sort((a, b) =>
      (a.lastName ?? "").localeCompare(b.lastName ?? "", "he"),
    );
    sorted.forEach((g, i) => {
      html += `<tr${!tableId ? ' class="un"' : ""}><td>${i + 1}</td><td>${esc(g.firstName ?? "")}</td><td>${esc(g.lastName ?? "")}</td><td>${esc(g.phone ?? "")}</td><td>${esc(g.meal ?? "")}</td><td>${esc(g.status ?? "")}</td></tr>`;
    });
    html += `</tbody></table>`;
  }

  html += `</body></html>`;
  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); }
}

/**
 * Download a blank CSV template for bulk import.
 */
export function downloadCSVTemplate() {
  const header =
    "FirstName,LastName,Phone,Email,Count,Children,Status,Side,Group,Meal,Notes";
  const example =
    "ישראל,ישראלי,0501234567,example@email.com,2,0,pending,groom,family,regular,";
  const csv = [header, example].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "guests-template.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Parse a CSV file chosen by the user and bulk-import guests.
 * Columns (row 0): FirstName, LastName, Phone, Email, Count, Children,
 *                  Status, Side, Group, Meal, Notes
 * Existing guests with a matching phone are UPDATED (last-write-wins).
 * @param {HTMLInputElement|null} [fileInput]  Optional pre-created input element
 */
export function importGuestsCSV(fileInput) {
  const input =
    fileInput ??
    /** @type {HTMLInputElement} */ (
      Object.assign(document.createElement("input"), {
        type: "file",
        accept: ".csv,text/csv",
      })
    );
  input.addEventListener(
    "change",
    () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = /** @type {string} */ (e.target?.result ?? "");
        const [header, ...rows] = text
          .replace(/^\uFEFF/, "") // strip BOM
          .split(/\r?\n/)
          .filter((l) => l.trim());
        if (!header) return;

        const cols = header.split(",").map((c) => c.trim().toLowerCase());
        const colIdx = (name) => cols.indexOf(name);

        const existing = /** @type {any[]} */ (storeGet("guests") ?? []);
        let added = 0;
        let updated = 0;

        rows.forEach((line) => {
          const parts = line.split(",");
          const get = (name) => parts[colIdx(name)]?.trim() ?? "";
          const phone = cleanPhone(get("phone") || get("טלפון") || "");
          if (!phone) return; // phone is required

          const existingIdx = existing.findIndex(
            (g) => cleanPhone(g.phone || "") === phone,
          );
          const entry = {
            id: existingIdx >= 0 ? existing[existingIdx].id : uid(),
            firstName: get("firstname") || get("שם פרטי") || "",
            lastName: get("lastname") || get("שם משפחה") || "",
            phone,
            email: get("email") || get("אימייל") || "",
            count: Number(get("count") || get("מוזמנים") || 1) || 1,
            children: Number(get("children") || get("ילדים") || 0) || 0,
            status: /** @type {any} */ (
              ["pending", "confirmed", "declined", "maybe"].includes(
                get("status"),
              )
                ? get("status")
                : "pending"
            ),
            side: /** @type {any} */ (
              ["groom", "bride", "mutual"].includes(get("side"))
                ? get("side")
                : "mutual"
            ),
            group: /** @type {any} */ (
              ["family", "friends", "work", "other"].includes(get("group"))
                ? get("group")
                : "other"
            ),
            meal: get("meal") || "regular",
            notes: get("notes") || get("הערות") || "",
            updatedAt: Date.now(),
            createdAt:
              existingIdx >= 0 ? existing[existingIdx].createdAt : Date.now(),
          };
          if (existingIdx >= 0) {
            existing[existingIdx] = entry;
            updated++;
          } else {
            existing.push(entry);
            added++;
          }
        });

        storeSet("guests", existing);
        enqueueWrite("guests", () => syncStoreKeyToSheets("guests"));
        // Show result toast via DOM — main.js will use showToast
        const evt = new CustomEvent("csvImportDone", {
          detail: { added, updated },
          bubbles: true,
        });
        document.dispatchEvent(evt);
      };
      reader.readAsText(file, "UTF-8");
    },
    { once: true },
  );
  input.click();
}

/**
 * Pre-fill the guest modal with an existing guest's data and open it.
 * @param {string} id
 */
export function openGuestForEdit(id) {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const g = guests.find((guest) => guest.id === id);
  if (!g) return;

  const setVal = (elId, val) => {
    const input =
      /** @type {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement|null} */ (
        document.getElementById(elId)
      );
    if (!input) return;
    if (input.type === "checkbox") {
      /** @type {HTMLInputElement} */ (input).checked = Boolean(val);
    } else {
      input.value = String(val ?? "");
    }
  };

  setVal("guestModalId", g.id);
  setVal("guestFirstName", g.firstName ?? "");
  setVal("guestLastName", g.lastName ?? "");
  setVal("guestPhone", g.phone ?? "");
  setVal("guestEmail", g.email ?? "");
  setVal("guestCount2", g.count ?? 1);
  setVal("guestChildren", g.children ?? 0);
  setVal("guestStatus", g.status ?? "pending");
  setVal("guestSide", g.side ?? "mutual");
  setVal("guestGroup", g.group ?? "friends");
  setVal("guestMeal", g.meal ?? "regular");
  setVal("guestAccessibility", g.accessibility ?? false);
  setVal("guestTransport", g.transport ?? "");
  setVal("guestMealNotes", g.mealNotes ?? "");
  setVal("guestTableSelect", g.tableId ?? "");
  setVal("guestGift", g.gift ?? "");
  setVal("guestNotes", g.notes ?? "");

  const title = document.getElementById("guestModalTitle");
  if (title) title.setAttribute("data-i18n", "modal_edit_guest");
}

// ── Stats ─────────────────────────────────────────────────────────────────

/**
 * Compute comprehensive guest statistics from the current store.
 * @returns {{
 *   total: number, confirmed: number, pending: number,
 *   declined: number, maybe: number,
 *   totalSeats: number, confirmedSeats: number,
 *   groom: number, bride: number, mutual: number,
 *   seated: number, unseated: number,
 *   vegetarian: number, vegan: number, glutenFree: number, kosher: number,
 * }}
 */
export function getGuestStats() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  return {
    total: guests.length,
    confirmed: guests.filter((g) => g.status === "confirmed").length,
    pending: guests.filter((g) => g.status === "pending").length,
    declined: guests.filter((g) => g.status === "declined").length,
    maybe: guests.filter((g) => g.status === "maybe").length,
    totalSeats: guests.reduce((s, g) => s + (g.count || 1), 0),
    confirmedSeats: guests
      .filter((g) => g.status === "confirmed")
      .reduce((s, g) => s + (g.count || 1), 0),
    groom: guests.filter((g) => g.side === "groom").length,
    bride: guests.filter((g) => g.side === "bride").length,
    mutual: guests.filter((g) => g.side === "mutual").length,
    seated: guests.filter((g) => g.tableId).length,
    unseated: guests.filter((g) => !g.tableId).length,
    vegetarian: guests.filter((g) => g.meal === "vegetarian").length,
    vegan: guests.filter((g) => g.meal === "vegan").length,
    glutenFree: guests.filter((g) => g.meal === "gluten_free").length,
    kosher: guests.filter((g) => g.meal === "kosher").length,
  };
}

/**
 * Return all guests matching a given status (or all if status is omitted / "all").
 * @param {string} [status]  e.g. "confirmed" | "pending" | "declined" | "maybe" | "all"
 * @returns {any[]}
 */
export function filterGuestsByStatus(status) {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  if (!status || status === "all") return guests;
  return guests.filter((g) => g.status === status);
}

// ── S11.4 Batch Operations ────────────────────────────────────────────────

/** @returns {string[]} selected guest IDs */
function _getSelectedIds() {
  return Array.from(document.querySelectorAll(".guest-select-cb:checked")).map(
    (cb) => /** @type {HTMLInputElement} */ (cb).dataset.guestId || "",
  );
}

/** Show/hide batch toolbar based on selection count */
function _updateBatchToolbar() {
  const ids = _getSelectedIds();
  const toolbar = document.getElementById("batchToolbar");
  const countEl = document.getElementById("batchCount");
  if (toolbar) toolbar.classList.toggle("u-hidden", ids.length === 0);
  if (countEl)
    countEl.textContent = t("batch_selected_count").replace(
      "{n}",
      String(ids.length),
    );
}

/** Toggle all checkboxes */
export function toggleSelectAll() {
  const selectAll = /** @type {HTMLInputElement|null} */ (
    document.getElementById("selectAllGuests")
  );
  if (!selectAll) return;
  const checked = selectAll.checked;
  document.querySelectorAll(".guest-select-cb").forEach((cb) => {
    /** @type {HTMLInputElement} */ (cb).checked = checked;
  });
  _updateBatchToolbar();
}

/**
 * Set status for all selected guests.
 * @param {string} status
 */
export function batchSetStatus(status) {
  if (!status) return;
  const ids = new Set(_getSelectedIds());
  if (ids.size === 0) return;
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []).map((g) =>
    ids.has(g.id) ? { ...g, status, updatedAt: new Date().toISOString() } : g,
  );
  storeSet("guests", guests);
  enqueueWrite("guests", () => syncStoreKeyToSheets("guests"));
}

/**
 * Delete all selected guests.
 */
export function batchDeleteGuests() {
  const ids = new Set(_getSelectedIds());
  if (ids.size === 0) return;
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []).filter(
    (g) => !ids.has(g.id),
  );
  storeSet("guests", guests);
  enqueueWrite("guests", () => syncStoreKeyToSheets("guests"));
}

// ── S17.2 Bulk Meal Assignment ────────────────────────────────────────────

/**
 * Set meal type for all selected guests.
 * @param {string} meal
 */
export function batchSetMeal(meal) {
  if (!meal) return;
  const ids = new Set(_getSelectedIds());
  if (ids.size === 0) return;
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []).map((g) =>
    ids.has(g.id) ? { ...g, meal, updatedAt: new Date().toISOString() } : g,
  );
  storeSet("guests", guests);
  enqueueWrite("guests", () => syncStoreKeyToSheets("guests"));
}

// ── S19.2 Guest VIP Flag ──────────────────────────────────────────────────

/**
 * Toggle the VIP flag on a single guest.
 * @param {string} guestId
 */
export function toggleGuestVip(guestId) {
  const guests = [.../** @type {any[]} */ (storeGet("guests") ?? [])];
  const idx = guests.findIndex((g) => g.id === guestId);
  if (idx === -1) return;
  guests[idx] = {
    ...guests[idx],
    vip: !guests[idx].vip,
    updatedAt: new Date().toISOString(),
  };
  storeSet("guests", guests);
  enqueueWrite("guests", () => syncStoreKeyToSheets("guests"));
}

/**
 * Toggle the VIP-only filter and re-render.
 */
export function toggleVipFilter() {
  _vipOnly = !_vipOnly;
  const btn = document.getElementById("vipFilterBtn");
  if (btn) btn.classList.toggle("btn-primary", _vipOnly);
  renderGuests();
}

// ── S19.5 Bulk Mark as Unsent ─────────────────────────────────────────────

/**
 * Reset the `sent` flag for all selected guests (mark as not yet sent).
 */
export function batchMarkUnsent() {
  const ids = new Set(_getSelectedIds());
  if (ids.size === 0) return;
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []).map((g) =>
    ids.has(g.id) ? { ...g, sent: false, updatedAt: new Date().toISOString() } : g,
  );
  storeSet("guests", guests);
  enqueueWrite("guests", () => syncStoreKeyToSheets("guests"));
}

// ── S20.1 Guest Name Badges Print ────────────────────────────────────────

/**
 * Open a print window with a 2-column badge grid for all filtered/confirmed guests.
 */
export function printGuestBadges() {
  const allGuests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const guests = allGuests.filter((g) => g.status === "confirmed");

  const badgeHTML = guests.map((g) => {
    const tbl = tables.find((tb) => tb.id === g.tableId);
    const tableName = tbl ? tbl.name : "—";
    const name = `${g.firstName} ${g.lastName || ""}`.trim();
    return `<div class="badge-card">
      <div class="badge-name">${_escHtml(name)}</div>
      <div class="badge-table">${_escHtml(t("col_table") || "שולחן")} ${_escHtml(tableName)}</div>
      ${g.meal && g.meal !== "regular" ? `<div class="badge-meal">${_escHtml(t(`meal_${g.meal}`) || g.meal)}</div>` : ""}
    </div>`;
  }).join("");

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html dir="rtl"><head>
    <meta charset="utf-8"><title>Guest Badges</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; }
      .badge-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5cm; padding: 1cm; }
      .badge-card { border: 1px solid #999; border-radius: 8px; padding: 0.8cm; text-align: center; page-break-inside: avoid; min-height: 4cm; display: flex; flex-direction: column; justify-content: center; }
      .badge-name { font-size: 18pt; font-weight: bold; margin-bottom: 0.3cm; }
      .badge-table { font-size: 13pt; color: #555; }
      .badge-meal { font-size: 10pt; color: #888; margin-top: 0.2cm; }
      @media print { body { margin: 0; } }
    </style>
  </head><body><div class="badge-grid">${badgeHTML}</div></body></html>`);
  win.document.close();
  win.print();
}

/** @param {string} s */
function _escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── S12.2 Duplicate Detection ─────────────────────────────────────────────

/**
 * Scan for duplicate guests by phone or name similarity.
 * @returns {{ groupA: any, groupB: any, reason: string }[]}
 */
export function findDuplicates() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  /** @type {{ groupA: any, groupB: any, reason: string }[]} */
  const dupes = [];
  const seen = new Set();

  for (let i = 0; i < guests.length; i++) {
    for (let j = i + 1; j < guests.length; j++) {
      const a = guests[i];
      const b = guests[j];
      const key = [a.id, b.id].sort().join("-");
      if (seen.has(key)) continue;

      // Exact phone match
      if (a.phone && b.phone && a.phone === b.phone) {
        seen.add(key);
        dupes.push({ groupA: a, groupB: b, reason: "phone" });
        continue;
      }
      // Name similarity (exact match on full name)
      const nameA = `${a.firstName} ${a.lastName || ""}`.trim().toLowerCase();
      const nameB = `${b.firstName} ${b.lastName || ""}`.trim().toLowerCase();
      if (nameA && nameA === nameB) {
        seen.add(key);
        dupes.push({ groupA: a, groupB: b, reason: "name" });
      }
    }
  }
  return dupes;
}

/**
 * Merge two guests — keep target, transfer data from source, delete source.
 * @param {string} keepId  Guest to keep
 * @param {string} mergeId Guest to merge into keepId and then delete
 */
export function mergeGuests(keepId, mergeId) {
  const guests = [.../** @type {any[]} */ (storeGet("guests") ?? [])];
  const keepIdx = guests.findIndex((g) => g.id === keepId);
  const mergeIdx = guests.findIndex((g) => g.id === mergeId);
  if (keepIdx === -1 || mergeIdx === -1) return;

  const kept = guests[keepIdx];
  const merged = guests[mergeIdx];

  // Transfer non-empty fields from merged if kept has empty
  for (const key of Object.keys(merged)) {
    if (key === "id" || key === "createdAt") continue;
    if (!kept[key] && merged[key]) {
      kept[key] = merged[key];
    }
  }
  kept.updatedAt = new Date().toISOString();
  kept.notes = [kept.notes, merged.notes].filter(Boolean).join("; ");

  guests[keepIdx] = kept;
  guests.splice(mergeIdx, 1);
  storeSet("guests", guests);
  enqueueWrite("guests", () => syncStoreKeyToSheets("guests"));
}

/**
 * Render duplicate detection results in the DOM.
 */
export function renderDuplicates() {
  const container = document.getElementById("duplicateResults");
  if (!container) return;
  container.textContent = "";

  const dupes = findDuplicates();
  if (dupes.length === 0) {
    const p = document.createElement("p");
    p.className = "u-text-muted";
    p.textContent = t("no_duplicates") || "No duplicates found";
    container.appendChild(p);
    return;
  }

  dupes.forEach(({ groupA, groupB, reason }) => {
    const card = document.createElement("div");
    card.className = "duplicate-card u-p-sm u-mb-sm";
    card.style.border = "1px solid var(--warning)";
    card.style.borderRadius = "var(--radius)";

    const label = document.createElement("p");
    label.textContent =
      `⚠️ ${reason === "phone" ? t("duplicate_phone") : t("duplicate_name")}: ` +
      `${groupA.firstName} ${groupA.lastName || ""} ↔ ${groupB.firstName} ${groupB.lastName || ""}`;
    card.appendChild(label);

    const mergeBtn = document.createElement("button");
    mergeBtn.className = "btn btn-small btn-primary u-mr-xs";
    mergeBtn.textContent = t("merge_keep_first") || "Keep first";
    mergeBtn.dataset.action = "mergeGuests";
    mergeBtn.dataset.keepId = groupA.id;
    mergeBtn.dataset.mergeId = groupB.id;
    card.appendChild(mergeBtn);

    const mergeBtn2 = document.createElement("button");
    mergeBtn2.className = "btn btn-small btn-secondary";
    mergeBtn2.textContent = t("merge_keep_second") || "Keep second";
    mergeBtn2.dataset.action = "mergeGuests";
    mergeBtn2.dataset.keepId = groupB.id;
    mergeBtn2.dataset.mergeId = groupA.id;
    card.appendChild(mergeBtn2);

    container.appendChild(card);
  });
}

// ── S13.5 Guest Notes Timeline ────────────────────────────────────────────

/**
 * Add a timestamped note to a guest's history log.
 * @param {string} guestId
 * @param {string} noteText
 * @returns {{ ok: boolean }}
 */
export function addGuestNote(guestId, noteText) {
  if (!noteText.trim()) return { ok: false };
  const guests = [.../** @type {any[]} */ (storeGet("guests") ?? [])];
  const idx = guests.findIndex((g) => g.id === guestId);
  if (idx === -1) return { ok: false };
  const history = Array.isArray(guests[idx].history) ? [...guests[idx].history] : [];
  history.push({
    text: noteText.trim().slice(0, 500),
    timestamp: new Date().toISOString(),
  });
  guests[idx] = { ...guests[idx], history, updatedAt: new Date().toISOString() };
  storeSet("guests", guests);
  enqueueWrite("guests", () => syncStoreKeyToSheets("guests"));
  return { ok: true };
}

/**
 * Render guest notes history in the modal.
 * @param {string} guestId
 */
export function renderGuestHistory(guestId) {
  const container = document.getElementById("guestHistoryLog");
  if (!container) return;
  container.textContent = "";
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const guest = guests.find((g) => g.id === guestId);
  if (!guest) return;
  const history = Array.isArray(guest.history) ? guest.history : [];
  if (history.length === 0) {
    const p = document.createElement("p");
    p.className = "u-text-muted";
    p.textContent = t("guest_no_notes");
    container.appendChild(p);
    return;
  }
  history.slice().reverse().forEach((entry) => {
    const div = document.createElement("div");
    div.className = "guest-note-entry";
    const time = document.createElement("span");
    time.className = "guest-note-time";
    time.textContent = new Date(entry.timestamp).toLocaleString("he-IL");
    div.appendChild(time);
    const text = document.createElement("span");
    text.className = "guest-note-text";
    text.textContent = entry.text;
    div.appendChild(text);
    container.appendChild(div);
  });
}

// ── S14.1 Multi-Criteria Guest Filter ─────────────────────────────────────

/** @type {{ status: string, side: string, group: string, meal: string, table: string }} */
const _multiFilter = { status: "all", side: "all", group: "all", meal: "all", table: "all" };

/**
 * Set a multi-criteria filter and re-render.
 * @param {string} field — filter dimension (status|side|group|meal|table)
 * @param {string} value — filter value or "all"
 */
export function setMultiFilter(field, value) {
  if (field in _multiFilter) {
    _multiFilter[field] = value;
  }
  renderGuests();
}

/**
 * Get current multi-filter state (for UI highlighting).
 * @returns {typeof _multiFilter}
 */
export function getMultiFilter() {
  return { ..._multiFilter };
}

// ── S14.5 Guest Tags ──────────────────────────────────────────────────────

/**
 * Add a tag to a guest.
 * @param {string} guestId
 * @param {string} tag
 */
export function addGuestTag(guestId, tag) {
  if (!tag.trim()) return;
  const guests = [.../** @type {any[]} */ (storeGet("guests") ?? [])];
  const idx = guests.findIndex((g) => g.id === guestId);
  if (idx === -1) return;
  const tags = Array.isArray(guests[idx].tags) ? [...guests[idx].tags] : [];
  const normalized = tag.trim().toLowerCase().slice(0, 30);
  if (!tags.includes(normalized)) {
    tags.push(normalized);
    guests[idx] = { ...guests[idx], tags, updatedAt: new Date().toISOString() };
    storeSet("guests", guests);
    enqueueWrite("guests", () => syncStoreKeyToSheets("guests"));
  }
}

/**
 * Remove a tag from a guest.
 * @param {string} guestId
 * @param {string} tag
 */
export function removeGuestTag(guestId, tag) {
  const guests = [.../** @type {any[]} */ (storeGet("guests") ?? [])];
  const idx = guests.findIndex((g) => g.id === guestId);
  if (idx === -1) return;
  const tags = Array.isArray(guests[idx].tags) ? guests[idx].tags.filter((t) => t !== tag) : [];
  guests[idx] = { ...guests[idx], tags, updatedAt: new Date().toISOString() };
  storeSet("guests", guests);
  enqueueWrite("guests", () => syncStoreKeyToSheets("guests"));
}

// ── S15.5 Search Highlight Helper ────────────────────────────────────────

/**
 * Render text into an element with the search query highlighted.
 * @param {HTMLElement} container
 * @param {string} text
 * @param {string} query  Lowercase query string
 */
function _highlightText(container, text, query) {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query);
  if (idx === -1) {
    container.textContent = text;
    return;
  }
  container.appendChild(document.createTextNode(text.slice(0, idx)));
  const mark = document.createElement("mark");
  mark.className = "search-highlight";
  mark.textContent = text.slice(idx, idx + query.length);
  container.appendChild(mark);
  container.appendChild(document.createTextNode(text.slice(idx + query.length)));
}
