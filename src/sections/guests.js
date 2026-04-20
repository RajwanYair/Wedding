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
import { guestMatchesQuery } from "../utils/guest-search.js";
import {
  GUEST_STATUSES,
  GUEST_SIDES,
  GUEST_GROUPS,
  MEAL_TYPES,
} from "../core/constants.js";

/** @type {(() => void)[]} */
const _unsubs = [];

/** @type {Set<string>} IDs of guests awaiting sync confirmation (S3.3 optimistic UI) */
const _pendingSync = new Set();

/** @type {string} current filter: "all" | status | side | group */
let _filter = "all";

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
      values: [...GUEST_STATUSES],
      default: "pending",
    },
    side: {
      type: "enum",
      values: [...GUEST_SIDES],
      default: "mutual",
    },
    group: {
      type: "enum",
      values: [...GUEST_GROUPS],
      default: "friends",
    },
    meal: {
      type: "enum",
      values: [...MEAL_TYPES],
      default: "regular",
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
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []).filter(
    (g) => g.id !== id,
  );
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
  _searchQuery = query;
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

  // Filter
  if (_filter !== "all") {
    guests = guests.filter(
      (g) => g.status === _filter || g.side === _filter || g.group === _filter,
    );
  }

  // Search
  if (_searchQuery) {
    guests = guests.filter((g) => guestMatchesQuery(g, _searchQuery));
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
    cells.forEach((txt) => {
      const td = document.createElement("td");
      td.textContent = txt;
      tr.appendChild(td);
    });

    // Actions cell
    const actionsTd = document.createElement("td");
    actionsTd.className = "u-text-nowrap";
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
              GUEST_STATUSES.includes(/** @type {any} */ (get("status")))
                ? get("status")
                : "pending"
            ),
            side: /** @type {any} */ (
              GUEST_SIDES.includes(/** @type {any} */ (get("side")))
                ? get("side")
                : "mutual"
            ),
            group: /** @type {any} */ (
              GUEST_GROUPS.includes(/** @type {any} */ (get("group")))
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

/**
 * Group guests by their group field.
 * @returns {Record<string, any[]>}
 */
export function getGuestsByGroup() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  /** @type {Record<string, any[]>} */
  const groups = { family: [], friends: [], work: [], neighbors: [], other: [] };
  for (const guest of guests) {
    const key = groups[guest.group] ? guest.group : "other";
    groups[key].push(guest);
  }
  return groups;
}

/**
 * Find pending guests whose RSVP deadline has passed.
 * @returns {any[]}
 */
export function getGuestsNeedingFollowup() {
  const info = /** @type {Record<string, string>} */ (storeGet("weddingInfo") ?? {});
  const deadline = info.rsvpDeadline;
  if (!deadline) return [];
  const deadlineDate = new Date(deadline);
  if (Number.isNaN(deadlineDate.getTime()) || new Date() < deadlineDate) return [];
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  return guests.filter((guest) => guest.status === "pending" && guest.phone);
}

/**
 * Find tables with remaining capacity.
 * @returns {Array<{ table: any, assigned: number, remaining: number }>}
 */
export function getSeatingGaps() {
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  return tables
    .map((table) => {
      const assigned = guests
        .filter((guest) => guest.tableId === table.id)
        .reduce((sum, guest) => sum + (guest.count || 1), 0);
      return { table, assigned, remaining: (table.capacity || 0) - assigned };
    })
    .filter((row) => row.remaining > 0);
}

/**
 * Build a daily RSVP response timeline.
 * @returns {Array<{ date: string, count: number }>}
 */
export function getGuestResponseTimeline() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  /** @type {Record<string, number>} */
  const byDay = {};
  for (const guest of guests) {
    if (!guest.rsvpDate) continue;
    const day = String(guest.rsvpDate).slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  }
  return Object.entries(byDay)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Find potential duplicate guests by phone or full name.
 * @returns {Array<{ guests: any[], reason: string }>}
 */
export function getDuplicateGuests() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  /** @type {Array<{ guests: any[], reason: string }>} */
  const duplicates = [];

  /** @type {Map<string, any[]>} */
  const byPhone = new Map();
  for (const guest of guests) {
    if (!guest.phone) continue;
    const key = String(guest.phone).replace(/\D/g, "");
    if (!key) continue;
    if (!byPhone.has(key)) byPhone.set(key, []);
    byPhone.get(key)?.push(guest);
  }
  for (const group of byPhone.values()) {
    if (group.length > 1) duplicates.push({ guests: group, reason: "phone" });
  }

  /** @type {Map<string, any[]>} */
  const byName = new Map();
  for (const guest of guests) {
    const fullName = `${guest.firstName || ""} ${guest.lastName || ""}`.trim().toLowerCase();
    if (!fullName) continue;
    if (!byName.has(fullName)) byName.set(fullName, []);
    byName.get(fullName)?.push(guest);
  }
  for (const group of byName.values()) {
    if (group.length > 1) duplicates.push({ guests: group, reason: "name" });
  }

  return duplicates;
}

/**
 * Compute plus-one stats for confirmed guests.
 * @returns {{ totalGuests: number, totalHeads: number, avgPartySize: number, largestParty: number }}
 */
export function getPlusOneStats() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const confirmed = guests.filter((guest) => guest.status === "confirmed");
  const totalHeads = confirmed.reduce((sum, guest) => sum + (guest.count || 1), 0);
  const largestParty = confirmed.reduce((max, guest) => Math.max(max, guest.count || 1), 0);
  return {
    totalGuests: confirmed.length,
    totalHeads,
    avgPartySize: confirmed.length > 0 ? Math.round((totalHeads / confirmed.length) * 10) / 10 : 0,
    largestParty,
  };
}

/**
 * Get confirmed guests that are missing a meaningful meal selection.
 * @returns {Array<{ id: string, firstName: string, lastName: string }>}
 */
export function getGuestsMissingMeal() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  return guests
    .filter((guest) => guest.status === "confirmed" && (!guest.meal || guest.meal === "regular"))
    .map((guest) => ({
      id: guest.id,
      firstName: guest.firstName || "",
      lastName: guest.lastName || "",
    }));
}

/**
 * Summarize recorded gifts.
 * @returns {{ totalGifts: number, giftCount: number, avgGift: number, maxGift: number }}
 */
export function getGiftSummary() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const gifted = guests.filter((guest) => Number(guest.gift) > 0);
  const totalGifts = gifted.reduce((sum, guest) => sum + Number(guest.gift), 0);
  const maxGift = gifted.reduce((max, guest) => Math.max(max, Number(guest.gift)), 0);
  return {
    totalGifts,
    giftCount: gifted.length,
    avgGift: gifted.length > 0 ? Math.round(totalGifts / gifted.length) : 0,
    maxGift,
  };
}

/**
 * Get guest age since creation.
 * @returns {Array<{ id: string, name: string, daysOld: number, status: string }>}
 */
export function getGuestAge() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const now = Date.now();
  return guests
    .filter((guest) => guest.createdAt)
    .map((guest) => ({
      id: guest.id,
      name: `${guest.firstName || ""} ${guest.lastName || ""}`.trim(),
      daysOld: Math.floor((now - new Date(guest.createdAt).getTime()) / 86400000),
      status: guest.status || "pending",
    }))
    .sort((a, b) => b.daysOld - a.daysOld);
}

/**
 * Count confirmed guests with children.
 * @returns {{ totalChildren: number, guestsWithChildren: number }}
 */
export function getChildrenCount() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const confirmed = guests.filter((guest) => guest.status === "confirmed");
  const withChildren = confirmed.filter((guest) => Number(guest.children) > 0);
  return {
    totalChildren: withChildren.reduce((sum, guest) => sum + Number(guest.children), 0),
    guestsWithChildren: withChildren.length,
  };
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
