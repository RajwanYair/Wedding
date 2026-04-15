/**
 * src/sections/checkin.js — Day-of check-in section ESM module (S0.8)
 *
 * Search guests and mark them as checked-in (arrived).
 */

import { storeGet, storeSet, storeSubscribe } from "../core/store.js";
import { el } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { enqueueWrite, syncStoreKeyToSheets } from "../services/sheets.js";

/** @type {(() => void)[]} */
const _unsubs = [];

/** @type {string} */
let _searchQuery = "";

export function mount(_container) {
  _unsubs.push(storeSubscribe("guests", renderCheckin));
  renderCheckin();
}

export function unmount() {
  _unsubs.forEach((fn) => fn());
  _unsubs.length = 0;
}

/**
 * @param {string} query
 */
export function setCheckinSearch(query) {
  _searchQuery = query.toLowerCase();
  renderCheckin();
}

/**
 * Mark a guest as checked-in (present).
 * @param {string} guestId
 */
export function checkInGuest(guestId) {
  const guests = [.../** @type {any[]} */ (storeGet("guests") ?? [])];
  const idx = guests.findIndex((g) => g.id === guestId);
  if (idx !== -1) {
    guests[idx] = {
      ...guests[idx],
      checkedIn: true,
      checkedInAt: new Date().toISOString(),
    };
    storeSet("guests", guests);
    enqueueWrite("guests", () => syncStoreKeyToSheets("guests"));
  }
}

export function renderCheckin() {
  const list = el.checkinList;
  if (!list) return;

  const allGuests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  let guests = allGuests.filter((g) => g.status === "confirmed");

  if (_searchQuery) {
    guests = guests.filter(
      (g) =>
        `${g.firstName} ${g.lastName || ""}`
          .toLowerCase()
          .includes(_searchQuery) || (g.phone || "").includes(_searchQuery),
    );
  }

  list.textContent = "";
  guests.forEach((g) => {
    const tr = document.createElement("tr");
    tr.className = `checkin-row${g.checkedIn ? " checkin-row--done" : ""}`;
    tr.dataset.id = g.id;

    const nameTd = document.createElement("td");
    nameTd.textContent = `${g.firstName} ${g.lastName || ""}`;
    tr.appendChild(nameTd);

    const phoneTd = document.createElement("td");
    phoneTd.textContent = g.phone || "";
    tr.appendChild(phoneTd);

    const countTd = document.createElement("td");
    countTd.textContent = String((g.count || 1) + (g.children || 0));
    tr.appendChild(countTd);

    const tableTd = document.createElement("td");
    const guestTable = tables.find((tb) => tb.id === g.tableId);
    tableTd.textContent = guestTable
      ? guestTable.name
      : g.tableId
        ? g.tableId
        : "—";
    tr.appendChild(tableTd);

    const actionTd = document.createElement("td");
    if (!g.checkedIn) {
      const btn = document.createElement("button");
      btn.className = "btn btn-small btn-success";
      btn.textContent = t("checkin_arrive_btn");
      btn.dataset.action = "checkInGuest";
      btn.dataset.actionArg = g.id;
      actionTd.appendChild(btn);
    } else {
      const badge = document.createElement("span");
      badge.className = "badge badge--success";
      badge.textContent = t("checkin_marked_arrived");
      actionTd.appendChild(badge);
    }
    tr.appendChild(actionTd);

    list.appendChild(tr);
  });

  // Update all stats
  const confirmed = allGuests.filter((g) => g.status === "confirmed").length;
  const arrived = allGuests.filter((g) => g.checkedIn).length;
  const pct = confirmed > 0 ? Math.round((arrived / confirmed) * 100) : 0;

  const totalEl = document.getElementById("checkinTotal");
  if (totalEl) totalEl.textContent = String(allGuests.length);

  const arrivedEl = document.getElementById("checkinArrived");
  if (arrivedEl) arrivedEl.textContent = String(arrived);

  const confirmedEl = document.getElementById("checkinConfirmed");
  if (confirmedEl) confirmedEl.textContent = String(confirmed);

  const pctEl = document.getElementById("checkinPct");
  if (pctEl) pctEl.textContent = `${pct}%`;

  const progressBar = /** @type {HTMLElement|null} */ (
    document.getElementById("checkinProgressBar")
  );
  if (progressBar) progressBar.style.width = `${pct}%`;
}

/**
 * Export check-in report as CSV (name, status, time).
 */
export function exportCheckinReport() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []).filter(
    (g) => g.status === "confirmed",
  );
  const header = "Name,Phone,Count,CheckedIn,CheckedInAt";
  const rows = guests.map((g) =>
    [
      `"${g.firstName} ${g.lastName || ""}"`,
      `"${g.phone || ""}"`,
      (g.count || 1) + (g.children || 0),
      g.checkedIn ? "yes" : "no",
      `"${g.checkedInAt || ""}"`,
    ].join(","),
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "checkin-report.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Reset all check-in flags (un-arrive everyone).
 */
export function resetAllCheckins() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []).map((g) => ({
    ...g,
    checkedIn: false,
    checkedInAt: undefined,
  }));
  storeSet("guests", guests);
  enqueueWrite("guests", () => syncStoreKeyToSheets("guests"));
}

/**
 * Aggregate check-in statistics.
 * @returns {{ total: number, checkedIn: number, checkinRate: number, remaining: number }}
 */
export function getCheckinStats() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const confirmed = guests.filter((g) => g.status === "confirmed");
  const total = confirmed.reduce((s, g) => s + (g.count || 1), 0);
  const checkedIn = confirmed
    .filter((g) => g.checkedIn)
    .reduce((s, g) => s + (g.count || 1), 0);
  return {
    total,
    checkedIn,
    checkinRate: total > 0 ? Math.round((checkedIn / total) * 100) : 0,
    remaining: total - checkedIn,
  };
}
