/**
 * src/sections/analytics.js — Analytics section ESM module (S0.8)
 *
 * Renders SVG donut + bar charts for RSVP, meal, and side breakdowns.
 * No canvas, no third-party charts — pure SVG.
 */

import { storeGet, storeSubscribe } from "../core/store.js";
import { t } from "../core/i18n.js";

/** @type {(() => void)[]} */
const _unsubs = [];

export function mount(_container) {
  _unsubs.push(storeSubscribe("guests", renderAnalytics));
  _unsubs.push(storeSubscribe("guests", renderSeatingMap));
  _unsubs.push(storeSubscribe("expenses", renderBudgetChart));
  _unsubs.push(storeSubscribe("vendors", _renderVendorTimeline));
  _unsubs.push(storeSubscribe("vendors", renderBudgetChart));
  _unsubs.push(storeSubscribe("tables", _renderTableFill));
  _unsubs.push(storeSubscribe("tables", renderSeatingMap));
  renderAnalytics();
  renderBudgetChart();
  _renderVendorTimeline();
  _renderTableFill();
  _renderActivityFeed();
  renderSeatingMap();
}

export function unmount() {
  _unsubs.forEach((fn) => fn());
  _unsubs.length = 0;
}

// ── Chart rendering ───────────────────────────────────────────────────────

/**
 * Render all analytics charts into their DOM containers.
 */
export function renderAnalytics() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);

  // RSVP status donut
  _renderDonut("analyticsRsvpDonut", [
    {
      label: t("status_confirmed"),
      value: guests.filter((g) => g.status === "confirmed").length,
      color: "var(--success)",
    },
    {
      label: t("status_pending"),
      value: guests.filter((g) => g.status === "pending").length,
      color: "var(--warning)",
    },
    {
      label: t("status_declined"),
      value: guests.filter((g) => g.status === "declined").length,
      color: "var(--danger)",
    },
    {
      label: t("status_maybe"),
      value: guests.filter((g) => g.status === "maybe").length,
      color: "var(--info)",
    },
  ]);

  // Side donut
  _renderDonut("analyticsSideDonut", [
    {
      label: t("side_groom"),
      value: guests.filter((g) => g.side === "groom").length,
      color: "var(--primary)",
    },
    {
      label: t("side_bride"),
      value: guests.filter((g) => g.side === "bride").length,
      color: "var(--accent)",
    },
    {
      label: t("side_mutual"),
      value: guests.filter((g) => g.side === "mutual").length,
      color: "var(--text-muted)",
    },
  ]);

  // Meal bar chart
  const meals = ["regular", "vegetarian", "vegan", "gluten_free", "kosher"];
  _renderBar(
    "analyticsMealBar",
    meals.map((m) => ({
      label: t(`meal_${m}`),
      value: guests.filter((g) => (g.meal || "regular") === m).length,
      color: "var(--primary)",
    })),
  );

  // Headcount stats
  const confirmedGuests = guests.filter((g) => g.status === "confirmed");
  const totalAdults = guests.reduce((s, g) => s + (g.count || 1), 0);
  const totalChildren = guests.reduce((s, g) => s + (g.children || 0), 0);
  const confirmedAdults = confirmedGuests.reduce(
    (s, g) => s + (g.count || 1) + (g.children || 0),
    0,
  );
  const accessCount = guests.filter((g) => g.accessibility).length;
  _setStatText("analyticsHeadAdults", totalAdults);
  _setStatText("analyticsHeadChildren", totalChildren);
  _setStatText("analyticsHeadTotal", totalAdults + totalChildren);
  _setStatText("analyticsHeadConfirmed", confirmedAdults);
  _setStatText("analyticsHeadAccess", accessCount);

  // Invitation sent vs unsent donut
  _renderDonut("analyticsSentChart", [
    {
      label: t("stat_sent"),
      value: guests.filter((g) => g.sent).length,
      color: "var(--success)",
    },
    {
      label: t("stat_unsent"),
      value: guests.filter((g) => !g.sent).length,
      color: "var(--text-muted)",
    },
  ]);

  // Meal summary for caterer
  _renderMealSummary(guests);

  // S11.3 Meal per table for caterer
  _renderMealPerTable();

  // S8 charts
  _renderHeatmap();
  _renderFunnel();
  _renderDeliveryRate();
  _renderGroupChart();
  _renderActivityFeed();
}

// ── Private SVG helpers ───────────────────────────────────────────────────

/**
 * Render a budget breakdown bar chart (expenses by category + vendor totals).
 */
export function renderBudgetChart() {
  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []);
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);

  /** @type {Map<string, number>} */
  const catMap = new Map();
  expenses.forEach((e) => {
    const cat = e.category || t("other");
    catMap.set(cat, (catMap.get(cat) ?? 0) + (e.amount || 0));
  });

  const vendorTotal = vendors.reduce((s, v) => s + (v.price || 0), 0);
  if (vendorTotal > 0) catMap.set(t("vendors"), vendorTotal);

  const colors = [
    "var(--primary)",
    "var(--accent)",
    "var(--success)",
    "var(--warning)",
    "var(--danger)",
    "var(--info)",
  ];
  const bars = Array.from(catMap.entries()).map(([label, value], i) => ({
    label,
    value,
    color: colors[i % colors.length],
  }));

  _renderBar("analyticsBudgetBar", bars);
}

/**
 * Render a simple SVG donut chart.
 * @param {string} containerId
 * @param {{ label: string, value: number, color: string }[]} slices
 */
function _renderDonut(containerId, slices) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) {
    container.textContent = "";
    return;
  }

  const cx = 60;
  const cy = 60;
  const r = 45;
  const strokeW = 18;
  const circ = 2 * Math.PI * r;

  let svg = `<svg viewBox="0 0 120 120" role="img" aria-label="${t("chart")}"><title>${t("chart")}</title>`;
  let offset = -Math.PI / 2;

  slices.forEach((sl) => {
    if (sl.value === 0) return;
    const angle = (sl.value / total) * 2 * Math.PI;
    const dashLen = (sl.value / total) * circ;
    const dashOff = circ - dashLen;
    const rotate = (offset * 180) / Math.PI;
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${sl.color}"
      stroke-width="${strokeW}" stroke-dasharray="${dashLen} ${dashOff}"
      transform="rotate(${rotate} ${cx} ${cy})" />`;
    offset += angle;
  });

  // Centre text
  svg += `<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="14" fill="var(--text)">${total}</text>`;
  svg += `</svg>`;

  container.innerHTML = svg; // safe: all values are numbers/CSS vars/i18n strings
}

/**
 * Render a simple horizontal SVG bar chart.
 * @param {string} containerId
 * @param {{ label: string, value: number, color: string }[]} bars
 */
function _renderBar(containerId, bars) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const maxVal = Math.max(...bars.map((b) => b.value), 1);
  const rowH = 22;
  const w = 220;
  const labelW = 80;
  const barMaxW = 120;
  const h = bars.length * rowH + 4;

  let svg = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${t("chart")}"><title>${t("chart")}</title>`;

  bars.forEach((b, i) => {
    const y = i * rowH;
    const barW = (b.value / maxVal) * barMaxW;
    svg += `<text x="0" y="${y + 14}" font-size="10" fill="var(--text)">${b.label}</text>`;
    svg += `<rect x="${labelW}" y="${y + 4}" width="${barW}" height="${rowH - 6}" fill="${b.color}" rx="3"/>`;
    svg += `<text x="${labelW + barW + 4}" y="${y + 14}" font-size="10" fill="var(--text)">${b.value}</text>`;
  });

  svg += `</svg>`;
  container.innerHTML = svg; // safe: all values are numbers/CSS vars/i18n strings
}

/**
 * Set text content of a stat element by id.
 * @param {string} id
 * @param {number} value
 */
function _setStatText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

/**
 * Render a plain-text meal summary into #analyticsMealSummary.
 * @param {any[]} guests
 */
function _renderMealSummary(guests) {
  const container = document.getElementById("analyticsMealSummary");
  if (!container) return;

  const confirmed = guests.filter((g) => g.status === "confirmed");
  const meals = ["regular", "vegetarian", "vegan", "gluten_free", "kosher", "other"];
  const rows = meals
    .map((m) => ({
      label: t(`meal_${m}`),
      count: confirmed.filter((g) => (g.meal || "regular") === m).length,
    }))
    .filter((r) => r.count > 0);

  if (rows.length === 0) {
    container.textContent = "";
    return;
  }

  let html = `<div class="card-header"><span class="icon">🍽️</span> <span data-i18n="analytics_meal_summary_title">${t("analytics_meal_summary_title")}</span></div>`;
  html += `<ul class="analytics-meal-list">`;
  rows.forEach((r) => {
    html += `<li><span class="meal-label">${r.label}</span><span class="meal-count">${r.count}</span></li>`;
  });
  html += `</ul>`;
  container.innerHTML = html; // safe: all values are i18n strings and integers
}

// ── S11.3 Meal Per Table Report ───────────────────────────────────────────

/**
 * Render a table × meal-type matrix for the caterer.
 */
function _renderMealPerTable() {
  const container = document.getElementById("mealPerTableContent");
  if (!container) return;
  container.textContent = "";

  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const confirmed = guests.filter((g) => g.status === "confirmed");
  const meals = ["regular", "vegetarian", "vegan", "gluten_free", "kosher"];

  if (tables.length === 0 || confirmed.length === 0) {
    const p = document.createElement("p");
    p.className = "u-text-muted";
    p.textContent = t("analytics_no_data") || "No data";
    container.appendChild(p);
    return;
  }

  const tbl = document.createElement("table");
  tbl.className = "guest-table u-w-full";

  // Header
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const thTable = document.createElement("th");
  thTable.textContent = t("table") || "Table";
  headRow.appendChild(thTable);
  meals.forEach((m) => {
    const th = document.createElement("th");
    th.textContent = t(`meal_${m}`);
    headRow.appendChild(th);
  });
  const thTotal = document.createElement("th");
  thTotal.textContent = t("total") || "Total";
  headRow.appendChild(thTotal);
  thead.appendChild(headRow);
  tbl.appendChild(thead);

  // Body
  const tbody = document.createElement("tbody");
  const grandTotals = new Array(meals.length).fill(0);
  let grandTotal = 0;

  tables.forEach((table) => {
    const seated = confirmed.filter((g) => g.tableId === table.id);
    const tr = document.createElement("tr");
    const tdName = document.createElement("td");
    tdName.textContent = table.name;
    tdName.style.fontWeight = "600";
    tr.appendChild(tdName);

    let rowTotal = 0;
    meals.forEach((m, i) => {
      const count = seated.filter((g) => (g.meal || "regular") === m).reduce(
        (s, g) => s + (g.count || 1),
        0,
      );
      grandTotals[i] += count;
      rowTotal += count;
      const td = document.createElement("td");
      td.textContent = count > 0 ? String(count) : "—";
      tr.appendChild(td);
    });
    grandTotal += rowTotal;
    const tdTotal = document.createElement("td");
    tdTotal.textContent = String(rowTotal);
    tdTotal.style.fontWeight = "600";
    tr.appendChild(tdTotal);
    tbody.appendChild(tr);
  });

  // Footer totals
  const tfoot = document.createElement("tfoot");
  const footRow = document.createElement("tr");
  const ftLabel = document.createElement("td");
  ftLabel.textContent = t("total") || "Total";
  ftLabel.style.fontWeight = "700";
  footRow.appendChild(ftLabel);
  grandTotals.forEach((gt) => {
    const td = document.createElement("td");
    td.textContent = String(gt);
    td.style.fontWeight = "600";
    footRow.appendChild(td);
  });
  const ftGrand = document.createElement("td");
  ftGrand.textContent = String(grandTotal);
  ftGrand.style.fontWeight = "700";
  footRow.appendChild(ftGrand);
  tfoot.appendChild(footRow);

  tbl.appendChild(tbody);
  tbl.appendChild(tfoot);
  container.appendChild(tbl);
}

/**
 * Export meal-per-table matrix as CSV.
 */
export function exportMealPerTableCSV() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const confirmed = guests.filter((g) => g.status === "confirmed");
  const meals = ["regular", "vegetarian", "vegan", "gluten_free", "kosher"];
  const header = ["Table", ...meals.map((m) => t(`meal_${m}`)), "Total"].join(",");

  const rows = tables.map((table) => {
    const seated = confirmed.filter((g) => g.tableId === table.id);
    const counts = meals.map(
      (m) => seated.filter((g) => (g.meal || "regular") === m).reduce((s, g) => s + (g.count || 1), 0),
    );
    const total = counts.reduce((s, c) => s + c, 0);
    return [`"${table.name}"`, ...counts, total].join(",");
  });

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "meal-per-table.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Print meal-per-table report.
 */
export function printMealPerTable() {
  window.print();
}

// ── S8.1 Guest Side-by-Table Heatmap ──────────────────────────────────────

/**
 * Render a stacked horizontal bar per table showing groom/bride/mutual split.
 */
function _renderHeatmap() {
  const container = document.getElementById("analyticsHeatmap");
  if (!container) return;

  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  if (tables.length === 0) {
    container.textContent = "";
    return;
  }

  const rowH = 28;
  const labelW = 100;
  const barMaxW = 200;
  const w = labelW + barMaxW + 40;
  const h = tables.length * rowH + 10;
  const maxPerTable = Math.max(
    ...tables.map(
      (tbl) => guests.filter((g) => g.tableId === tbl.id).length,
    ),
    1,
  );

  let svg = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${t("analytics_heatmap_title")}"><title>${t("analytics_heatmap_title")}</title>`;

  tables.forEach((tbl, i) => {
    const y = i * rowH;
    const assigned = guests.filter((g) => g.tableId === tbl.id);
    const groom = assigned.filter((g) => g.side === "groom").length;
    const bride = assigned.filter((g) => g.side === "bride").length;
    const mutual = assigned.filter(
      (g) => g.side !== "groom" && g.side !== "bride",
    ).length;
    const total = groom + bride + mutual;
    const scale = total > 0 ? barMaxW / maxPerTable : 0;

    svg += `<text x="0" y="${y + 18}" font-size="10" fill="var(--text)">${_escSvg(tbl.name || tbl.id)}</text>`;
    let x = labelW;
    if (groom > 0) {
      const w2 = groom * scale;
      svg += `<rect x="${x}" y="${y + 4}" width="${w2}" height="${rowH - 8}" fill="var(--primary)" rx="2"><title>${t("side_groom")}: ${groom}</title></rect>`;
      x += w2;
    }
    if (bride > 0) {
      const w2 = bride * scale;
      svg += `<rect x="${x}" y="${y + 4}" width="${w2}" height="${rowH - 8}" fill="var(--accent)" rx="2"><title>${t("side_bride")}: ${bride}</title></rect>`;
      x += w2;
    }
    if (mutual > 0) {
      const w2 = mutual * scale;
      svg += `<rect x="${x}" y="${y + 4}" width="${w2}" height="${rowH - 8}" fill="var(--text-muted)" rx="2"><title>${t("side_mutual")}: ${mutual}</title></rect>`;
      x += w2;
    }
    svg += `<text x="${x + 4}" y="${y + 18}" font-size="9" fill="var(--text-muted)">${total}</text>`;
  });

  svg += `</svg>`;
  container.innerHTML = svg; // safe: all values are store data/numbers/CSS vars
}

// ── S8.2 RSVP Funnel Report ──────────────────────────────────────────────

/**
 * Render a horizontal funnel: invited → sent → confirmed → checked-in.
 */
function _renderFunnel() {
  const container = document.getElementById("analyticsFunnel");
  if (!container) return;

  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const total = guests.length;
  const sent = guests.filter((g) => g.sent).length;
  const confirmed = guests.filter((g) => g.status === "confirmed").length;
  const checkedIn = guests.filter((g) => g.checkedIn).length;

  const stages = [
    { label: t("funnel_invited"), value: total, color: "var(--primary)" },
    { label: t("funnel_sent"), value: sent, color: "var(--info)" },
    { label: t("funnel_confirmed"), value: confirmed, color: "var(--success)" },
    { label: t("funnel_checkedin"), value: checkedIn, color: "var(--accent)" },
  ];

  const maxVal = Math.max(total, 1);
  const barH = 32;
  const gap = 8;
  const w = 320;
  const h = stages.length * (barH + gap);

  let svg = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${t("analytics_funnel_title")}"><title>${t("analytics_funnel_title")}</title>`;

  stages.forEach((s, i) => {
    const y = i * (barH + gap);
    const barW = Math.max((s.value / maxVal) * (w - 90), 2);
    svg += `<text x="0" y="${y + 20}" font-size="11" fill="var(--text)">${s.label}</text>`;
    svg += `<rect x="85" y="${y + 2}" width="${barW}" height="${barH - 4}" fill="${s.color}" rx="4" opacity="0.85"/>`;
    const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
    svg += `<text x="${85 + barW + 6}" y="${y + 20}" font-size="11" fill="var(--text)">${s.value} (${pct}%)</text>`;
  });

  svg += `</svg>`;
  container.innerHTML = svg; // safe: numbers/CSS vars/i18n strings
}

// ── S8.3 Vendor Payment Timeline ─────────────────────────────────────────

/**
 * Render vendor payment progress bars (paid vs total per vendor).
 */
function _renderVendorTimeline() {
  const container = document.getElementById("analyticsVendorTimeline");
  if (!container) return;

  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  if (vendors.length === 0) {
    container.textContent = "";
    return;
  }

  const rowH = 30;
  const labelW = 90;
  const barMaxW = 160;
  const w = labelW + barMaxW + 80;
  const h = vendors.length * rowH + 10;

  let svg = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${t("analytics_vendor_timeline_title")}"><title>${t("analytics_vendor_timeline_title")}</title>`;

  vendors.forEach((v, i) => {
    const y = i * rowH;
    const price = v.price || 0;
    const paid = v.paid || 0;
    const pct = price > 0 ? Math.min(paid / price, 1) : 0;
    const barFull = barMaxW;
    const barPaid = barFull * pct;

    svg += `<text x="0" y="${y + 20}" font-size="10" fill="var(--text)">${_escSvg(v.name || v.category || "?")}</text>`;
    svg += `<rect x="${labelW}" y="${y + 6}" width="${barFull}" height="${rowH - 12}" fill="var(--bg-card)" rx="4" stroke="var(--border)" stroke-width="0.5"/>`;
    svg += `<rect x="${labelW}" y="${y + 6}" width="${barPaid}" height="${rowH - 12}" fill="${pct >= 1 ? "var(--success)" : "var(--warning)"}" rx="4"/>`;
    svg += `<text x="${labelW + barFull + 4}" y="${y + 20}" font-size="9" fill="var(--text-muted)">₪${paid}/${price}</text>`;
  });

  svg += `</svg>`;
  container.innerHTML = svg; // safe: numbers/store data/CSS vars
}

// ── S8.5 WhatsApp Delivery Rate ──────────────────────────────────────────

/**
 * Render a donut showing sent vs unsent WhatsApp invitations with delivery %.
 */
function _renderDeliveryRate() {
  const container = document.getElementById("analyticsDeliveryRate");
  if (!container) return;

  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const withPhone = guests.filter((g) => g.phone);
  const sent = withPhone.filter((g) => g.sent).length;
  const unsent = withPhone.length - sent;
  const pct = withPhone.length > 0 ? Math.round((sent / withPhone.length) * 100) : 0;

  _renderDonut("analyticsDeliveryRate", [
    { label: t("stat_sent"), value: sent, color: "var(--success)" },
    { label: t("stat_unsent"), value: unsent, color: "var(--text-muted)" },
  ]);

  // Append rate text below SVG
  const rateEl = document.createElement("div");
  rateEl.className = "analytics-rate-label";
  rateEl.textContent = `${t("analytics_delivery_rate")}: ${pct}%`;
  container.appendChild(rateEl);
}

// ── Group Distribution ───────────────────────────────────────────────────

/**
 * Render bar chart of guests by group (family/friends/work/other).
 */
function _renderGroupChart() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const groups = ["family", "friends", "work", "other"];
  _renderBar(
    "analyticsGroupBar",
    groups.map((g) => ({
      label: t(`group_${g}`),
      value: guests.filter((guest) => (guest.group || "friends") === g).length,
      color: "var(--primary)",
    })),
  );
}

// ── Table Fill Rate ──────────────────────────────────────────────────────

/**
 * Render horizontal progress bars showing seat fill per table.
 */
function _renderTableFill() {
  const container = document.getElementById("analyticsTableFill");
  if (!container) return;

  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  if (tables.length === 0) {
    container.textContent = "";
    return;
  }

  const rowH = 26;
  const labelW = 90;
  const barMaxW = 160;
  const w = labelW + barMaxW + 50;
  const h = tables.length * rowH + 10;

  let svg = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${t("analytics_table_fill_title")}"><title>${t("analytics_table_fill_title")}</title>`;

  tables.forEach((tbl, i) => {
    const y = i * rowH;
    const seated = guests.filter((g) => g.tableId === tbl.id).length;
    const cap = tbl.capacity || 10;
    const pct = Math.min(seated / cap, 1);
    const color = pct >= 1 ? "var(--danger)" : pct >= 0.75 ? "var(--warning)" : "var(--success)";

    svg += `<text x="0" y="${y + 17}" font-size="10" fill="var(--text)">${_escSvg(tbl.name || tbl.id)}</text>`;
    svg += `<rect x="${labelW}" y="${y + 4}" width="${barMaxW}" height="${rowH - 8}" fill="var(--bg-card)" rx="4" stroke="var(--border)" stroke-width="0.5"/>`;
    svg += `<rect x="${labelW}" y="${y + 4}" width="${barMaxW * pct}" height="${rowH - 8}" fill="${color}" rx="4"/>`;
    svg += `<text x="${labelW + barMaxW + 4}" y="${y + 17}" font-size="9" fill="var(--text-muted)">${seated}/${cap}</text>`;
  });

  svg += `</svg>`;
  container.innerHTML = svg; // safe: numbers/store data/CSS vars
}

// ── Recent Activity Feed ─────────────────────────────────────────────────

/**
 * Show the 10 most recent guest/RSVP changes sorted by updatedAt.
 */
function _renderActivityFeed() {
  const container = document.getElementById("analyticsActivityFeed");
  if (!container) return;

  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const recent = guests
    .filter((g) => g.updatedAt || g.createdAt)
    .sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""))
    .slice(0, 10);

  if (recent.length === 0) {
    container.textContent = t("analytics_no_activity");
    return;
  }

  const ul = document.createElement("ul");
  ul.className = "analytics-activity-list";
  recent.forEach((g) => {
    const li = document.createElement("li");
    const name = `${g.firstName || ""} ${g.lastName || ""}`.trim() || "?";
    const status = t(`status_${g.status || "pending"}`);
    const date = (g.updatedAt || g.createdAt || "").slice(0, 10);
    li.textContent = `${name} — ${status} (${date})`;
    ul.appendChild(li);
  });
  container.textContent = "";
  container.appendChild(ul);
}

// ── S8.4 Export Functions ─────────────────────────────────────────────────

/**
 * Trigger print dialog with analytics section visible (PDF export).
 */
export function exportAnalyticsPDF() {
  window.print();
}

/**
 * Export analytics summary as CSV.
 */
export function exportAnalyticsCSV() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const total = guests.length;
  const confirmed = guests.filter((g) => g.status === "confirmed").length;
  const pending = guests.filter((g) => g.status === "pending").length;
  const declined = guests.filter((g) => g.status === "declined").length;
  const sent = guests.filter((g) => g.sent).length;
  const checkedIn = guests.filter((g) => g.checkedIn).length;
  const adults = guests.reduce((s, g) => s + (g.count || 1), 0);
  const children = guests.reduce((s, g) => s + (g.children || 0), 0);

  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  const vendorCost = vendors.reduce((s, v) => s + (v.price || 0), 0);
  const vendorPaid = vendors.reduce((s, v) => s + (v.paid || 0), 0);

  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []);
  const expenseTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  const rows = [
    ["Metric", "Value"],
    [t("stat_total"), total],
    [t("status_confirmed"), confirmed],
    [t("status_pending"), pending],
    [t("status_declined"), declined],
    [t("stat_sent"), sent],
    [t("funnel_checkedin"), checkedIn],
    [t("analytics_adults"), adults],
    [t("analytics_children"), children],
    [t("analytics_total_heads"), adults + children],
    [t("nav_vendors"), `₪${vendorCost}`],
    [t("vendor_paid"), `₪${vendorPaid}`],
    [t("expense_total"), `₪${expenseTotal}`],
  ];

  const bom = "\uFEFF";
  const csv = bom + rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "wedding-analytics.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── SVG escape helper ────────────────────────────────────────────────────

/** @param {string} s */
function _escSvg(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── S13.4 Seating Chart SVG Map ───────────────────────────────────────────

/**
 * Render an SVG visual floor plan of all tables with guest names.
 */
export function renderSeatingMap() {
  const container = document.getElementById("analyticsSeatingMap");
  if (!container) return;

  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);

  if (tables.length === 0) {
    container.textContent = t("analytics_no_data") || "";
    return;
  }

  const cols = Math.min(tables.length, 4);
  const rows = Math.ceil(tables.length / cols);
  const cellW = 180;
  const cellH = 140;
  const pad = 20;
  const w = cols * cellW + pad * 2;
  const h = rows * cellH + pad * 2;

  let svg = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${t("seating_map_title")}">`;

  tables.forEach((tbl, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx = pad + col * cellW + cellW / 2;
    const cy = pad + row * cellH + 40;
    const seated = guests.filter((g) => g.tableId === tbl.id);
    const cap = tbl.capacity || 10;
    const fill = seated.length >= cap ? "var(--danger)" : seated.length > 0 ? "var(--success)" : "var(--bg-card)";

    // Table shape
    if (tbl.shape === "rect") {
      svg += `<rect x="${cx - 50}" y="${cy - 25}" width="100" height="50" rx="6" fill="${fill}" stroke="var(--border)" stroke-width="1.5" opacity="0.7"/>`;
    } else {
      svg += `<circle cx="${cx}" cy="${cy}" r="30" fill="${fill}" stroke="var(--border)" stroke-width="1.5" opacity="0.7"/>`;
    }

    // Table name + count
    svg += `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text)">${_escSvg(tbl.name)}</text>`;
    svg += `<text x="${cx}" y="${cy + 18}" text-anchor="middle" font-size="9" fill="var(--text-muted)">${seated.length}/${cap}</text>`;

    // Guest names (up to 4)
    const names = seated.slice(0, 4).map((g) => `${g.firstName || ""}`.trim());
    names.forEach((name, ni) => {
      svg += `<text x="${cx}" y="${cy + 42 + ni * 12}" text-anchor="middle" font-size="8" fill="var(--text-secondary)">${_escSvg(name)}</text>`;
    });
    if (seated.length > 4) {
      svg += `<text x="${cx}" y="${cy + 42 + 4 * 12}" text-anchor="middle" font-size="8" fill="var(--text-muted)">+${seated.length - 4}</text>`;
    }
  });

  svg += `</svg>`;
  container.innerHTML = svg; // safe: numbers/store data/CSS vars
}

// ── S14.4 Export Event Summary PDF ────────────────────────────────────────

/**
 * Export a comprehensive event summary as a printable page.
 */
export function exportEventSummary() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []);
  const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo") ?? {});

  const confirmed = guests.filter((g) => g.status === "confirmed");
  const totalHeads = confirmed.reduce((s, g) => s + (g.count || 1) + (g.children || 0), 0);
  const vendorCost = vendors.reduce((s, v) => s + (v.price || 0), 0);
  const vendorPaid = vendors.reduce((s, v) => s + (v.paid || 0), 0);
  const expenseTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  const bom = "\uFEFF";
  const lines = [
    `${t("event_summary_title")}`,
    "",
    `${t("label_groom")}: ${info.groom || ""}`,
    `${t("label_bride")}: ${info.bride || ""}`,
    `${t("label_wedding_date")}: ${info.date || ""}`,
    `${t("label_venue")}: ${info.venue || ""}`,
    "",
    `=== ${t("stat_total")} ===`,
    `${t("stat_guests")}: ${guests.length}`,
    `${t("status_confirmed")}: ${confirmed.length}`,
    `${t("analytics_total_heads")}: ${totalHeads}`,
    `${t("stat_tables")}: ${tables.length}`,
    "",
    `=== ${t("budget_title")} ===`,
    `${t("vendor_total")}: ₪${vendorCost}`,
    `${t("vendor_paid")}: ₪${vendorPaid}`,
    `${t("expense_total")}: ₪${expenseTotal}`,
    `${t("budget_total_spent")}: ₪${vendorPaid + expenseTotal}`,
    "",
    `=== ${t("nav_vendors")} ===`,
    ...vendors.map((v) => `${v.name}: ₪${v.paid || 0}/₪${v.price || 0}`),
    "",
    `=== ${t("nav_guests")} (${t("status_confirmed")}) ===`,
    ...confirmed.map((g) => `${g.firstName} ${g.lastName || ""} — ${g.count || 1} guests — ${t(`meal_${g.meal || "regular"}`)}`),
  ];

  const csv = bom + lines.join("\n");
  const blob = new Blob([csv], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "event-summary.txt";
  a.click();
  URL.revokeObjectURL(url);
}
