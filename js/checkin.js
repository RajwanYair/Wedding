// @ts-check
"use strict";

/* ── Check-in Mode + Live Headcount + Table Finder (v1.16.0) ─────────────────
   5.1 Check-in mode: Admin marks guests as arrived; running counter.
   5.2 Table finder: Guest enters name/phone → sees their table assignment.
   5.3 Live headcount: Dashboard widget + check-in stats.
   New guest field: arrived (bool), arrivedAt (ISO string|null)
   ─────────────────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────────────────
   CHECK-IN SECTION (admin)
   ──────────────────────────────────────────────────────────────────────────── */

/** Render the check-in section with stats and searchable guest list */
function renderCheckin() {
  _renderCheckinStats();
  _renderCheckinList("");
}

/** Update arriving count and percentage */
function _renderCheckinStats() {
  const confirmed = window._guests.filter(function (g) {
    return g.status === "confirmed";
  });
  const arrived = window._guests.filter(function (g) {
    return g.arrived;
  });

  const setEl = function (id, val) {
    const el = document.getElementById(id);
    if (el) window.el.textContent = val;
  };

  setEl("checkinArrived", arrived.length);
  setEl("checkinConfirmed", confirmed.length);
  setEl("checkinTotal", window._guests.length);

  const pct = confirmed.length
    ? Math.round((arrived.length / confirmed.length) * 100)
    : 0;
  setEl("checkinPct", `${pct  }%`);

  const bar = document.getElementById("checkinProgressBar");
  if (bar) bar.style.width = `${pct  }%`;
}

/** Render (filtered) guest list for check-in */
function _renderCheckinList(query) {
  const tbody = document.getElementById("checkinList");
  if (!tbody) return;

  const q = (query || "").trim().toLowerCase();
  const candidates = window._guests.filter(function (g) {
    if (g.status === "declined") return false;
    if (!q) return true;
    const fullName = (window.guestFullName(g) || "").toLowerCase();
    const phone = (g.phone || "").toLowerCase();
    return fullName.includes(q) || phone.includes(q);
  });

  tbody.replaceChildren();

  if (!candidates.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.className = "empty-row";
    td.textContent = q
      ? window.t("checkin_no_results")
      : window.t("checkin_empty");
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  candidates
    .slice()
    .sort(function (a, b) {
      // Arrived guests sorted last so pending are at top
      if (a.arrived && !b.arrived) return 1;
      if (!a.arrived && b.arrived) return -1;
      return window.guestFullName(a).localeCompare(window.guestFullName(b));
    })
    .forEach(function (g) {
      const tr = document.createElement("tr");
      if (g.arrived) tr.className = "row-arrived";

      const tdName = document.createElement("td");
      tdName.textContent = window.guestFullName(g);

      const tdPhone = document.createElement("td");
      tdPhone.textContent = g.phone || "—";
      tdPhone.style.direction = "ltr";

      const tdCount = document.createElement("td");
      tdCount.textContent =
        (g.count || 1) + (g.children ? ` +${  g.children}` : "");

      const tdTable = document.createElement("td");
      tdTable.textContent = g.tableId ? window.getTableName(g.tableId) : "—";

      const tdAction = document.createElement("td");
      const btn = document.createElement("button");
      btn.className = g.arrived
        ? "btn btn-secondary btn-small"
        : "btn btn-primary btn-small";
      btn.textContent = g.arrived
        ? window.t("checkin_undo")
        : window.t("checkin_arrive_btn");
      btn.setAttribute("onclick", `toggleCheckin("${  g.id  }")`);
      tdAction.appendChild(btn);

      tr.appendChild(tdName);
      tr.appendChild(tdPhone);
      tr.appendChild(tdCount);
      tr.appendChild(tdTable);
      tr.appendChild(tdAction);
      tbody.appendChild(tr);
    });
}

/** Toggle arrived status for a guest */
function toggleCheckin(id) {
  const g = window._guests.find(function (x) {
    return x.id === id;
  });
  if (!g) return;
  g.arrived = !g.arrived;
  g.arrivedAt = g.arrived ? new Date().toISOString() : null;
  window.saveAll();
  renderCheckin();
  window.showToast(
    g.arrived
      ? window.t("checkin_marked_arrived")
      : window.t("checkin_marked_undone"),
    g.arrived ? "success" : "info",
  );
}

/** Input handler for check-in search box */
function searchCheckin() {
  const q = (document.getElementById("checkinSearch") || {}).value || "";
  _renderCheckinList(q);
}

/* ─────────────────────────────────────────────────────────────────────────────
   TABLE FINDER (guest-facing)
   ──────────────────────────────────────────────────────────────────────────── */

/** Look up a guest's table assignment from the table-finder section */
function findTable() {
  const inputEl = document.getElementById("tablefinderInput");
  const resultEl = document.getElementById("tablefinderResult");
  if (!inputEl || !resultEl) return;

  const q = inputEl.value.trim().toLowerCase();
  if (!q) {
    resultEl.textContent = window.t("tablefinder_enter_name");
    return;
  }

  const match = window._guests.find(function (g) {
    const fn = (window.guestFullName(g) || "").toLowerCase();
    const ph = window.cleanPhone(g.phone || "");
    const phRaw = (g.phone || "").toLowerCase();
    return fn.includes(q) || ph.includes(q) || phRaw.includes(q);
  });

  if (!match) {
    resultEl.className = "tablefinder-result tablefinder-notfound";
    resultEl.textContent = window.t("tablefinder_not_found");
    return;
  }

  if (!match.tableId) {
    resultEl.className = "tablefinder-result tablefinder-notable";
    resultEl.textContent =
      `${window.guestFullName(match)  } — ${  window.t("tablefinder_no_table")}`;
    return;
  }

  const tableName = window.getTableName(match.tableId);
  resultEl.className = "tablefinder-result tablefinder-found";
  resultEl.textContent =
    `${window.guestFullName(match) 
    } — ${ 
    window.t("tablefinder_table_label") 
    } ${ 
    tableName}`;
}
