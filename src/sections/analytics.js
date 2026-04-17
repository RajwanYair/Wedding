/**
 * src/sections/analytics.js — Analytics section ESM module (S0.8)
 *
 * Renders SVG donut + bar charts for RSVP, meal, and side breakdowns.
 * No canvas, no third-party charts — pure SVG.
 */

import { storeGet, storeSubscribeScoped, cleanupScope } from "../core/store.js";
import { t, currentLang } from "../core/i18n.js";

const _SCOPE = "analytics";

export function mount(/** @type {HTMLElement} */ _container) {
  storeSubscribeScoped("guests", renderAnalytics, _SCOPE);
  storeSubscribeScoped("guests", renderSeatingMap, _SCOPE);
  storeSubscribeScoped("expenses", renderBudgetChart, _SCOPE);
  storeSubscribeScoped("vendors", _renderVendorTimeline, _SCOPE);
  storeSubscribeScoped("vendors", renderBudgetChart, _SCOPE);
  storeSubscribeScoped("tables", _renderTableFill, _SCOPE);
  storeSubscribeScoped("tables", renderSeatingMap, _SCOPE);
  storeSubscribeScoped("vendors", renderPaymentSchedule, _SCOPE);
  storeSubscribeScoped("guests", renderRsvpTimeline, _SCOPE);
  storeSubscribeScoped("expenses", renderExpenseDonut, _SCOPE);
  storeSubscribeScoped(
    "vendors",
    () => {
      checkBudgetOvershoot();
      renderArrivalForecast();
    },
    _SCOPE,
  );
  storeSubscribeScoped("guests", renderArrivalForecast, _SCOPE);
  storeSubscribeScoped("tables", renderArrivalForecast, _SCOPE);
  // S22.2 expense trend chart
  storeSubscribeScoped("expenses", renderExpenseTrend, _SCOPE);
  // S24.4 tag breakdown
  storeSubscribeScoped("guests", renderTagBreakdown, _SCOPE);
  // F4.1.2 no-show prediction
  storeSubscribeScoped("guests", renderNoShowPrediction, _SCOPE);
  // F4.3.2 response histogram
  storeSubscribeScoped("guests", renderResponseHistogram, _SCOPE);
  // F4.3.3 budget burn-down
  storeSubscribeScoped("expenses", renderBudgetBurndown, _SCOPE);
  // F4.3.4 seating score
  storeSubscribeScoped("guests", renderSeatingScore, _SCOPE);
  storeSubscribeScoped("tables", renderSeatingScore, _SCOPE);
  // Phase 10.3 error analytics
  storeSubscribeScoped("errorLog", renderErrorAnalytics, _SCOPE);
  renderAnalytics();
  renderBudgetChart();
  _renderVendorTimeline();
  _renderTableFill();
  _renderActivityFeed();
  renderSeatingMap();
  renderPaymentSchedule();
  renderRsvpTimeline();
  renderExpenseDonut();
  renderArrivalForecast();
  renderExpenseTrend(); // S22.2
  renderTagBreakdown(); // S24.4
  renderNoShowPrediction(); // F4.1.2
  renderResponseHistogram(); // F4.3.2
  renderBudgetBurndown(); // F4.3.3
  renderSeatingScore(); // F4.3.4
  renderErrorAnalytics(); // Phase 10.3
}

export function unmount() {
  cleanupScope(_SCOPE);
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
  const linkClicked = guests.filter((g) => g.rsvpLinkClicked).length;
  const formStarted = guests.filter((g) => g.rsvpFormStarted).length;
  const confirmed = guests.filter((g) => g.status === "confirmed").length;
  const checkedIn = guests.filter((g) => g.checkedIn).length;

  const stages = [
    { label: t("funnel_invited"), value: total, color: "var(--primary)" },
    { label: t("funnel_sent"), value: sent, color: "var(--info)" },
    { label: t("funnel_clicked"), value: linkClicked, color: "var(--warning, #f0ad4e)" },
    { label: t("funnel_started"), value: formStarted, color: "var(--accent-secondary, #9b59b6)" },
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
 * F4.3.5 — Generate and print a one-page executive summary PDF.
 * Opens a new window with a formatted summary of all key stats + charts.
 */
export function exportAnalyticsPDF() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []);
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const info = /** @type {Record<string, string>} */ (storeGet("weddingInfo") ?? {});

  const total = guests.length;
  const confirmed = guests.filter((g) => g.status === "confirmed").length;
  const pending = guests.filter((g) => g.status === "pending").length;
  const declined = guests.filter((g) => g.status === "declined").length;
  const checkedIn = guests.filter((g) => g.checkedIn).length;
  const adults = guests.reduce((s, g) => s + (g.count || 1), 0);
  const children = guests.reduce((s, g) => s + (g.children || 0), 0);
  const seated = guests.filter((g) => g.tableId).length;
  const vendorCost = vendors.reduce((s, v) => s + (v.price || 0), 0);
  const vendorPaid = vendors.reduce((s, v) => s + (v.paid || 0), 0);
  const expenseTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const groomSide = guests.filter((g) => g.side === "groom").length;
  const brideSide = guests.filter((g) => g.side === "bride").length;

  // Meal breakdown
  const meals = /** @type {Record<string, number>} */ ({});
  guests.forEach((g) => {
    const m = g.meal || "regular";
    meals[m] = (meals[m] || 0) + 1;
  });
  const mealRows = Object.entries(meals)
    .map(([k, v]) => `<tr><td>${_escHtml(t(`meal_${k}`) || k)}</td><td>${v}</td></tr>`)
    .join("");

  const title = `${info.groom || ""} & ${info.bride || ""} — ${t("event_summary_title")}`;
  const dateStr = info.date || "";
  const lang = currentLang();

  const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${lang === "he" || lang === "ar" ? "rtl" : "ltr"}">
<head><meta charset="utf-8"><title>${_escHtml(title)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,sans-serif;padding:24px;max-width:800px;margin:auto;color:#222}
h1{font-size:1.6rem;margin-bottom:4px}
h2{font-size:1.1rem;margin:16px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
.subtitle{font-size:.9rem;color:#666;margin-bottom:16px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px}
.stat{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f0f0f0}
.stat-label{font-weight:500}
table{width:100%;border-collapse:collapse;margin-top:6px}
td,th{text-align:start;padding:4px 8px;border-bottom:1px solid #eee}
th{font-weight:600;background:#f9f9f9}
.footer{margin-top:24px;font-size:.75rem;color:#999;text-align:center}
@media print{body{padding:12px}}
</style></head><body>
<h1>${_escHtml(title)}</h1>
<div class="subtitle">${_escHtml(dateStr)} · ${_escHtml(info.venue || "")} · ${t("app_title")}</div>

<h2>📊 ${t("stat_total")}</h2>
<div class="grid">
<div class="stat"><span class="stat-label">${t("stat_total")}</span><span>${total}</span></div>
<div class="stat"><span class="stat-label">${t("status_confirmed")}</span><span>${confirmed}</span></div>
<div class="stat"><span class="stat-label">${t("status_pending")}</span><span>${pending}</span></div>
<div class="stat"><span class="stat-label">${t("status_declined")}</span><span>${declined}</span></div>
<div class="stat"><span class="stat-label">${t("funnel_checkedin")}</span><span>${checkedIn}</span></div>
<div class="stat"><span class="stat-label">${t("analytics_adults")}</span><span>${adults}</span></div>
<div class="stat"><span class="stat-label">${t("analytics_children")}</span><span>${children}</span></div>
<div class="stat"><span class="stat-label">${t("analytics_total_heads")}</span><span>${adults + children}</span></div>
</div>

<h2>💺 ${t("tables_title")}</h2>
<div class="grid">
<div class="stat"><span class="stat-label">${t("stat_tables")}</span><span>${tables.length}</span></div>
<div class="stat"><span class="stat-label">${t("stat_seated")}</span><span>${seated}/${total}</span></div>
<div class="stat"><span class="stat-label">${t("stat_groom_side")}</span><span>${groomSide}</span></div>
<div class="stat"><span class="stat-label">${t("stat_bride_side")}</span><span>${brideSide}</span></div>
</div>

<h2>🍽️ ${t("meal_summary_title")}</h2>
<table><tr><th>${t("meal_type_label")}</th><th>${t("col_count")}</th></tr>${mealRows}</table>

<h2>💰 ${t("budget_title")}</h2>
<div class="grid">
<div class="stat"><span class="stat-label">${t("vendor_total_cost")}</span><span>₪${vendorCost.toLocaleString()}</span></div>
<div class="stat"><span class="stat-label">${t("vendor_paid")}</span><span>₪${vendorPaid.toLocaleString()}</span></div>
<div class="stat"><span class="stat-label">${t("vendor_outstanding")}</span><span>₪${(vendorCost - vendorPaid).toLocaleString()}</span></div>
<div class="stat"><span class="stat-label">${t("expense_total")}</span><span>₪${expenseTotal.toLocaleString()}</span></div>
</div>

<div class="footer">${t("app_title")} · ${new Date().toLocaleDateString()}</div>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
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
/** Escape SVG special characters.
 * @param {string} s
 */
function _escSvg(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Escape HTML special characters for safe insertion into generated HTML.
 * @param {string} s
 */
function _escHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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

// ── S16.3 Vendor Payment Schedule ────────────────────────────────────────

/**
 * Render a chronological payment schedule for vendors with due dates.
 */
export function renderPaymentSchedule() {
  const container = document.getElementById("analyticsPaymentSchedule");
  if (!container) return;

  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? [])
    .filter((v) => v.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  container.textContent = "";
  if (vendors.length === 0) {
    container.textContent = t("no_payment_schedule");
    return;
  }

  const now = new Date();
  const table = document.createElement("table");
  table.className = "data-table payment-schedule-table";
  const thead = document.createElement("thead");
  thead.innerHTML = `<tr><th data-i18n="col_vendor">${t("col_vendor")}</th><th data-i18n="label_vendor_due_date">${t("label_vendor_due_date")}</th><th data-i18n="vendor_paid">${t("vendor_paid")}</th><th data-i18n="label_status">${t("label_status")}</th></tr>`;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  vendors.forEach((v) => {
    const tr = document.createElement("tr");
    const dueDate = new Date(v.dueDate);
    const isPaid = (v.paid || 0) >= (v.price || 0);
    const isOverdue = dueDate < now && !isPaid;
    if (isOverdue) tr.className = "vendor-row--overdue";
    if (isPaid) tr.className = "vendor-row--paid";

    const statusText = isPaid ? t("vendor_status_paid") : (isOverdue ? t("vendor_overdue") : t("vendor_status_upcoming"));

    tr.innerHTML = `<td>${_escSvg(v.name || v.category)}</td><td>${v.dueDate}</td><td>₪${(v.paid || 0).toLocaleString()} / ₪${(v.price || 0).toLocaleString()}</td><td>${statusText}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

// ── S16.4 RSVP Response Timeline ─────────────────────────────────────────

/**
 * Render an SVG timeline of RSVP responses over time.
 */
export function renderRsvpTimeline() {
  const container = document.getElementById("analyticsRsvpTimeline");
  if (!container) return;

  const guests = /** @type {any[]} */ (storeGet("guests") ?? [])
    .filter((g) => g.rsvpDate)
    .sort((a, b) => (a.rsvpDate || "").localeCompare(b.rsvpDate || ""));

  container.textContent = "";
  if (guests.length === 0) {
    container.textContent = t("no_rsvp_data");
    return;
  }

  // Group by date
  /** @type {Map<string, number>} */
  const byDate = new Map();
  guests.forEach((g) => {
    const d = g.rsvpDate.slice(0, 10);
    byDate.set(d, (byDate.get(d) ?? 0) + 1);
  });

  const entries = [...byDate.entries()];
  const maxVal = Math.max(...entries.map(([, v]) => v), 1);
  const barW = 30;
  const gap = 6;
  const w = entries.length * (barW + gap) + 40;
  const h = 160;
  const barArea = h - 40;

  let svg = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${t("rsvp_timeline_title")}">`;
  // X-axis
  svg += `<line x1="20" y1="${h - 25}" x2="${w - 10}" y2="${h - 25}" stroke="var(--border)" stroke-width="1"/>`;

  entries.forEach(([date, count], i) => {
    const x = 25 + i * (barW + gap);
    const barH = (count / maxVal) * barArea;
    const y = h - 25 - barH;
    svg += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="var(--accent)" rx="3"/>`;
    svg += `<text x="${x + barW / 2}" y="${y - 3}" text-anchor="middle" font-size="9" fill="var(--text)">${count}</text>`;
    svg += `<text x="${x + barW / 2}" y="${h - 10}" text-anchor="middle" font-size="7" fill="var(--text-muted)">${date.slice(5)}</text>`;
  });

  svg += `</svg>`;
  container.innerHTML = svg; // safe: computed from store data + CSS vars
}

// ── S16.5 Printable Dietary Cards ────────────────────────────────────────

/**
 * Generate and print per-table dietary requirement cards for the caterer.
 */
export function printDietaryCards() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []).filter((g) => g.status === "confirmed");
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);

  const lines = [];
  lines.push(`<html><head><meta charset="utf-8"><title>${t("dietary_cards_title")}</title>`);
  lines.push(`<style>
    body { font-family: 'Segoe UI', tahoma, sans-serif; direction: rtl; }
    .card { page-break-inside: avoid; border: 1px solid #333; padding: 12px; margin: 10px 0; border-radius: 8px; }
    .card h3 { margin: 0 0 8px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: right; }
    th { background: #f0f0f0; }
    .meal-special { font-weight: bold; color: #d33; }
    @media print { .no-print { display: none; } }
  </style></head><body>`);

  tables.forEach((tb) => {
    const seated = guests.filter((g) => g.tableId === tb.id);
    if (seated.length === 0) return;
    const mealCounts = /** @type {Record<string, number>} */ ({});
    seated.forEach((g) => {
      const m = g.meal || "regular";
      mealCounts[m] = (mealCounts[m] || 0) + (g.count || 1);
    });
    lines.push(`<div class="card"><h3>${_escSvg(tb.name)} (${seated.reduce((s, g) => s + (g.count || 1), 0)} ${t("stat_guests")})</h3>`);
    lines.push(`<table><thead><tr><th>${t("col_name")}</th><th>${t("col_meal")}</th><th>${t("label_meal_notes")}</th><th>${t("col_count")}</th></tr></thead><tbody>`);
    seated.forEach((g) => {
      const special = g.meal && g.meal !== "regular" ? "meal-special" : "";
      lines.push(`<tr><td>${_escSvg(g.firstName)} ${_escSvg(g.lastName || "")}</td><td class="${special}">${t(`meal_${g.meal || "regular"}`)}</td><td>${_escSvg(g.mealNotes || "")}</td><td>${g.count || 1}</td></tr>`);
    });
    lines.push(`</tbody></table>`);
    lines.push(`<p><strong>${t("dietary_summary")}:</strong> ${Object.entries(mealCounts).map(([m, c]) => `${t(`meal_${m}`)}: ${c}`).join(", ")}</p>`);
    lines.push(`</div>`);
  });

  // Unassigned guests with special diets
  const unassigned = guests.filter((g) => !g.tableId && g.meal && g.meal !== "regular");
  if (unassigned.length > 0) {
    lines.push(`<div class="card"><h3>${t("filter_unassigned")} — ${t("dietary_special")}</h3><ul>`);
    unassigned.forEach((g) => {
      lines.push(`<li>${_escSvg(g.firstName)} ${_escSvg(g.lastName || "")} — ${t(`meal_${g.meal}`)} ${g.mealNotes ? `(${_escSvg(g.mealNotes)})` : ""}</li>`);
    });
    lines.push(`</ul></div>`);
  }

  lines.push(`</body></html>`);
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(lines.join("\\n"));
    w.document.close();
    w.print();
  }
}

// ── S17.3 Expense Category Donut Chart ───────────────────────────────────

/**
 * Render a donut chart of expenses broken down by category.
 */
export function renderExpenseDonut() {
  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []);
  const container = document.getElementById("analyticsExpenseDonut");
  if (!container) return;

  container.textContent = "";
  if (expenses.length === 0) {
    container.textContent = t("no_expenses");
    return;
  }

  /** @type {Map<string, number>} */
  const catMap = new Map();
  expenses.forEach((e) => {
    const cat = e.category || t("expense_cat_other");
    catMap.set(cat, (catMap.get(cat) ?? 0) + (e.amount || 0));
  });

  const colors = [
    "var(--primary)", "var(--accent)", "var(--success)", "var(--warning)",
    "var(--danger)", "var(--info, #0288d1)", "#9c27b0", "#ff5722",
  ];
  const slices = Array.from(catMap.entries()).map(([label, value], i) => ({
    label,
    value,
    color: colors[i % colors.length],
  }));
  _renderDonut("analyticsExpenseDonut", slices);

  // Append legend
  const legend = document.createElement("div");
  legend.className = "donut-legend";
  slices.forEach((sl) => {
    const item = document.createElement("div");
    item.className = "donut-legend-item";
    item.innerHTML = `<span class="donut-legend-dot" style="background:${sl.color}"></span><span>${_escSvg(sl.label)}: ₪${sl.value.toLocaleString()}</span>`;
    legend.appendChild(item);
  });
  container.appendChild(legend);
}

// ── S17.5 Budget Overshoot Helpers ───────────────────────────────────────

/**
 * Check if total committed (vendors + expenses) exceeds the budget target.
 * Returns { overBudget: boolean, committed: number, target: number }
 */
export function checkBudgetOvershoot() {
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []);
  const settings = /** @type {any} */ (storeGet("weddingInfo") ?? {});
  const target = Number(settings.budgetTarget) || 0;
  const committed =
    vendors.reduce((s, v) => s + (v.price || 0), 0) +
    expenses.reduce((s, e) => s + (e.amount || 0), 0);
  return { overBudget: target > 0 && committed > target, committed, target };
}

// ── S18.2 Guest Arrival Forecast ────────────────────────────────────────

const _MAYBE_PCT = 0.6;  // assume 60% of "maybe" guests will come
const _PENDING_PCT = 0.4; // assume 40% of pending guests will come

// ── F4.1.2 No-Show Rate Prediction ──────────────────────────────────────

/**
 * Predict no-show rate based on RSVP timing patterns.
 * Guests who confirmed late (close to event date) historically have higher no-show rates.
 * @returns {{ noShowRate: number, expectedNoShows: number, confirmed: number, lateConfirmed: number, details: string }}
 */
export function predictNoShowRate() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo") ?? {});
  const weddingDate = info.date ? new Date(info.date) : null;

  const confirmed = guests.filter((g) => g.status === "confirmed");
  if (confirmed.length === 0 || !weddingDate) {
    return { noShowRate: 0, expectedNoShows: 0, confirmed: 0, lateConfirmed: 0, details: "" };
  }

  const DAY = 86400000;
  let lateCount = 0; // confirmed within 7 days of event
  let veryLateCount = 0; // confirmed within 3 days
  const totalHeads = confirmed.reduce((s, g) => s + (g.count || 1) + (g.children || 0), 0);

  for (const g of confirmed) {
    if (!g.rsvpDate) continue;
    const rsvp = new Date(g.rsvpDate);
    const daysBeforeEvent = (weddingDate.getTime() - rsvp.getTime()) / DAY;
    if (daysBeforeEvent <= 3) veryLateCount++;
    else if (daysBeforeEvent <= 7) lateCount++;
  }

  // Base no-show rate: 5% for on-time, 15% for late, 25% for very-late
  const onTimeCount = confirmed.length - lateCount - veryLateCount;
  const weighted = (onTimeCount * 0.05) + (lateCount * 0.15) + (veryLateCount * 0.25);
  const noShowRate = confirmed.length > 0 ? weighted / confirmed.length : 0.05;
  const expectedNoShows = Math.round(totalHeads * noShowRate);

  const details = `${onTimeCount} ${t("noshow_on_time") || "בזמן"}, ${lateCount + veryLateCount} ${t("noshow_late") || "מאוחר"}`;

  return { noShowRate, expectedNoShows, confirmed: totalHeads, lateConfirmed: lateCount + veryLateCount, details };
}

/**
 * Compute projected final headcount (heads, not unique guests).
 * @returns {{ projected: number, confirmed: number, maybe: number, pending: number, declined: number }}
 */
export function computeArrivalForecast() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  let confirmed = 0, maybe = 0, pending = 0, declined = 0;
  guests.forEach((g) => {
    const heads = (g.count || 1) + (g.children || 0);
    if (g.status === "confirmed") confirmed += heads;
    else if (g.status === "maybe") maybe += heads;
    else if (g.status === "pending") pending += heads;
    else if (g.status === "declined") declined += heads;
  });
  const projected = Math.round(confirmed + maybe * _MAYBE_PCT + pending * _PENDING_PCT);
  return { projected, confirmed, maybe, pending, declined };
}

/**
 * Render guest arrival forecast card into #dashForecastCard.
 */
export function renderArrivalForecast() {
  const { projected, confirmed, maybe, pending } = computeArrivalForecast();
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const capacity = tables.reduce((s, tb) => s + (tb.capacity || 0), 0);

  const isOver = capacity > 0 && projected > capacity;
  const colorClass = isOver ? "forecast-num--over" : "forecast-num--projected";

  // Format: structured elements (dashboard & analytics both use these ids)
  const confirmedEl = document.getElementById("forecastConfirmed");
  const projectedEl = document.getElementById("forecastProjected");
  const capacityEl  = document.getElementById("forecastCapacity");
  const detailEl    = document.getElementById("forecastDetail");

  if (confirmedEl) confirmedEl.textContent = String(confirmed);
  if (projectedEl) {
    projectedEl.textContent = String(projected);
    projectedEl.className = `forecast-num ${colorClass}`;
  }
  if (capacityEl) capacityEl.textContent = String(capacity || "—");
  if (detailEl) {
    const overMsg = isOver
      ? t("forecast_detail_over").replace("{n}", String(projected - capacity))
      : t("forecast_detail_ok");
    detailEl.textContent = `${overMsg}  |  ${t("status_maybe")}: ${maybe} × ${Math.round(_MAYBE_PCT * 100)}%  ${t("status_pending")}: ${pending} × ${Math.round(_PENDING_PCT * 100)}%`;
  }
}

// ── S22.2 Expense Trend SVG Line Chart ────────────────────────────────────

/**
 * Render a month-by-month expense trend as an SVG polyline in #expenseTrendSvg.
 */
export function renderExpenseTrend() {
  const container = document.getElementById("expenseTrendSvg");
  if (!container) return;
  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []);

  // Build monthly buckets — last 6 months
  const now = new Date();
  /** @type {{ label: string, total: number }[]} */
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("he-IL", { month: "short" });
    const total = expenses
      .filter((e) => (e.date || "").startsWith(key))
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    months.push({ label, total });
  }

  const W = 280, H = 120, PAD = { top: 10, right: 10, bottom: 30, left: 44 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const maxVal = Math.max(...months.map((m) => m.total), 1);

  container.setAttribute("viewBox", `0 0 ${W} ${H}`);
  container.setAttribute("width", "100%");
  container.setAttribute("height", String(H));
  container.textContent = "";

  const ns = "http://www.w3.org/2000/svg";
  const xStep = chartW / Math.max(months.length - 1, 1);

  // Y-axis grid lines
  [0, 0.5, 1].forEach((frac) => {
    const y = PAD.top + chartH * (1 - frac);
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", String(PAD.left));
    line.setAttribute("x2", String(PAD.left + chartW));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("stroke", "var(--card-border)");
    line.setAttribute("stroke-dasharray", "4 4");
    container.appendChild(line);
    const amt = Math.round(maxVal * frac);
    const labelEl = document.createElementNS(ns, "text");
    labelEl.setAttribute("x", String(PAD.left - 4));
    labelEl.setAttribute("y", String(y + 4));
    labelEl.setAttribute("text-anchor", "end");
    labelEl.setAttribute("font-size", "9");
    labelEl.setAttribute("fill", "var(--text-muted)");
    labelEl.textContent = amt > 999 ? `${Math.round(amt / 1000)}K` : String(amt);
    container.appendChild(labelEl);
  });

  // Poly-line points
  const pts = months.map((m, i) => {
    const x = PAD.left + i * xStep;
    const y = PAD.top + chartH * (1 - m.total / maxVal);
    return { x, y, m };
  });
  const polyline = document.createElementNS(ns, "polyline");
  polyline.setAttribute("points", pts.map((p) => `${p.x},${p.y}`).join(" "));
  polyline.setAttribute("fill", "none");
  polyline.setAttribute("stroke", "var(--color-accent, #8b5cf6)");
  polyline.setAttribute("stroke-width", "2");
  polyline.setAttribute("stroke-linejoin", "round");
  polyline.setAttribute("stroke-linecap", "round");
  container.appendChild(polyline);

  // Data points + X labels
  pts.forEach(({ x, y, m }) => {
    const dot = document.createElementNS(ns, "circle");
    dot.setAttribute("cx", String(x));
    dot.setAttribute("cy", String(y));
    dot.setAttribute("r", "3");
    dot.setAttribute("fill", "var(--color-accent, #8b5cf6)");
    container.appendChild(dot);
    const lbl = document.createElementNS(ns, "text");
    lbl.setAttribute("x", String(x));
    lbl.setAttribute("y", String(H - PAD.bottom + 14));
    lbl.setAttribute("text-anchor", "middle");
    lbl.setAttribute("font-size", "9");
    lbl.setAttribute("fill", "var(--text-muted)");
    lbl.textContent = m.label;
    container.appendChild(lbl);
  });
}

// -- S24.4 Tag Breakdown -------------------------------------------------------

/**
 * Render a horizontal bar breakdown of guest tags in #analyticsTagBreakdown.
 */
export function renderTagBreakdown() {
  const container = document.getElementById("analyticsTagBreakdown");
  if (!container) return;
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);

  /** @type {Map<string, number>} */
  const tagCounts = new Map();
  guests.forEach((g) => {
    const tags = Array.isArray(g.tags) ? g.tags : [];
    tags.forEach((/** @type {string} */ tag) => {
      const normalized = String(tag || "").trim();
      if (normalized) tagCounts.set(normalized, (tagCounts.get(normalized) ?? 0) + 1);
    });
  });

  container.textContent = "";
  if (tagCounts.size === 0) {
    container.textContent = t("analytics_no_tags") || "אין תגיות עדיין";
    return;
  }

  const entries = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  const max = entries[0][1];
  entries.forEach(([tag, count]) => {
    const row = document.createElement("div");
    row.className = "tag-breakdown-row";

    const label = document.createElement("span");
    label.className = "tag-breakdown-label";
    label.textContent = tag;

    const barWrap = document.createElement("div");
    barWrap.className = "tag-breakdown-bar-wrap";
    const bar = document.createElement("div");
    bar.className = "tag-breakdown-bar";
    bar.style.width = `${Math.round((count / max) * 100)}%`;
    barWrap.appendChild(bar);

    const num = document.createElement("span");
    num.className = "tag-breakdown-count";
    num.textContent = String(count);

    row.appendChild(label);
    row.appendChild(barWrap);
    row.appendChild(num);
    container.appendChild(row);
  });
}

// ── F4.1.2 No-Show Prediction Renderer ──────────────────────────────────

/**
 * Render no-show prediction card into #noShowPrediction.
 */
export function renderNoShowPrediction() {
  const container = document.getElementById("noShowPrediction");
  if (!container) return;
  const { noShowRate, expectedNoShows, confirmed, lateConfirmed } = predictNoShowRate();

  container.textContent = "";
  if (confirmed === 0) {
    container.textContent = t("forecast_no_guests") || "אין אורחים מאושרים עדיין";
    return;
  }

  const items = [
    { num: `${Math.round(noShowRate * 100)}%`, label: t("noshow_rate") || "שיעור אי-הגעה צפוי" },
    { num: String(expectedNoShows), label: t("noshow_expected") || "צפויים לא להגיע" },
    { num: String(confirmed - expectedNoShows), label: t("noshow_actual_expected") || "צפויים להגיע" },
    { num: String(lateConfirmed), label: t("noshow_late_rsvp") || "אישרו מאוחר" },
  ];

  for (const { num, label } of items) {
    const box = document.createElement("div");
    box.className = "analytics-stat-box";
    const numEl = document.createElement("div");
    numEl.className = "analytics-stat-num";
    numEl.textContent = num;
    const lblEl = document.createElement("div");
    lblEl.className = "analytics-stat-lbl";
    lblEl.textContent = label;
    box.appendChild(numEl);
    box.appendChild(lblEl);
    container.appendChild(box);
  }
}

// ── F4.3.2 Response Time Histogram ────────────────────────────────────────

/**
 * Render a histogram showing guest response times (days between invite and RSVP).
 */
function renderResponseHistogram() {
  const container = document.getElementById("analyticsResponseHistogram");
  if (!container) return;
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);

  // Compute response days for guests that have both createdAt and rsvpDate
  const days = [];
  for (const g of guests) {
    if (!g.createdAt || !g.rsvpDate) continue;
    const created = new Date(g.createdAt).getTime();
    const rsvp = new Date(g.rsvpDate).getTime();
    if (Number.isNaN(created) || Number.isNaN(rsvp)) continue;
    days.push(Math.max(0, Math.round((rsvp - created) / 86_400_000)));
  }

  if (days.length === 0) {
    container.textContent = t("no_data") || "אין נתונים";
    return;
  }

  // Bucket into ranges: 0-1, 2-3, 4-7, 8-14, 15-30, 30+
  const buckets = [
    { label: "0-1d", max: 1, count: 0 },
    { label: "2-3d", max: 3, count: 0 },
    { label: "4-7d", max: 7, count: 0 },
    { label: "8-14d", max: 14, count: 0 },
    { label: "15-30d", max: 30, count: 0 },
    { label: "30d+", max: Infinity, count: 0 },
  ];
  for (const d of days) {
    const b = buckets.find((bk) => d <= bk.max);
    if (b) b.count++;
  }

  const bars = buckets
    .filter((b) => b.count > 0)
    .map((b) => ({ label: b.label, value: b.count, color: "var(--accent)" }));
  _renderBar("analyticsResponseHistogram", bars);
}

// ── F4.3.3 Budget Burn-Down Chart ──────────────────────────────────────────

/**
 * Render a simple burn-down SVG showing cumulative paid vs budget target.
 */
function renderBudgetBurndown() {
  const container = document.getElementById("analyticsBudgetBurndown");
  if (!container) return;

  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []);
  const budget = /** @type {Record<string,any>} */ (storeGet("budget") ?? {});
  const target = Number(budget.target) || 0;

  if (expenses.length === 0 || target === 0) {
    container.textContent = t("no_data") || "אין נתונים";
    return;
  }

  // Sort expenses by date and compute cumulative
  const sorted = [...expenses]
    .filter((e) => e.date && e.amount)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (sorted.length === 0) {
    container.textContent = t("no_data") || "אין נתונים";
    return;
  }

  const points = [];
  let cumulative = 0;
  for (const e of sorted) {
    cumulative += Number(e.amount) || 0;
    points.push({ date: e.date, total: cumulative });
  }

  // SVG dimensions
  const w = 280;
  const h = 120;
  const pad = 20;
  const chartW = w - pad * 2;
  const chartH = h - pad * 2;
  const maxY = Math.max(target, cumulative) * 1.1;

  // Build path from points
  const pathParts = points.map((p, i) => {
    const x = pad + (i / Math.max(points.length - 1, 1)) * chartW;
    const y = pad + chartH - (p.total / maxY) * chartH;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  });

  // Budget target line
  const tgtY = pad + chartH - (target / maxY) * chartH;

  let svg = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${t("budget_burndown_title")}"><title>${t("budget_burndown_title")}</title>`;
  // Target line
  svg += `<line x1="${pad}" y1="${tgtY.toFixed(1)}" x2="${w - pad}" y2="${tgtY.toFixed(1)}" stroke="var(--danger)" stroke-dasharray="4 2" stroke-width="1"/>`;
  svg += `<text x="${w - pad}" y="${(tgtY - 3).toFixed(1)}" text-anchor="end" font-size="7" fill="var(--danger)">${_escSvg(t("budget_target") || "Target")}</text>`;
  // Cumulative line
  svg += `<path d="${pathParts.join(" ")}" fill="none" stroke="var(--accent)" stroke-width="2"/>`;
  // Axis labels
  svg += `<text x="${pad}" y="${h - 2}" font-size="7" fill="var(--text-muted)">${_escSvg(sorted[0].date.slice(0, 7))}</text>`;
  svg += `<text x="${w - pad}" y="${h - 2}" text-anchor="end" font-size="7" fill="var(--text-muted)">${_escSvg(sorted.at(-1).date.slice(0, 7))}</text>`;
  svg += `</svg>`;
  container.innerHTML = svg;
}

// ── F4.3.4 Seating Quality Score ──────────────────────────────────────────

/**
 * Compute and render a seating quality score based on group/side coherence.
 */
function renderSeatingScore() {
  const container = document.getElementById("analyticsSeatingScore");
  if (!container) return;
  container.textContent = "";

  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const seated = guests.filter((g) => g.tableId);

  if (seated.length === 0 || tables.length === 0) {
    container.textContent = t("no_data") || "אין נתונים";
    return;
  }

  // Build table → guests map
  const tableGuests = new Map();
  for (const g of seated) {
    const arr = tableGuests.get(g.tableId) ?? [];
    arr.push(g);
    tableGuests.set(g.tableId, arr);
  }

  let totalScore = 0;
  let tableCount = 0;

  for (const [, tblGuests] of tableGuests) {
    if (tblGuests.length < 2) continue;
    tableCount++;
    // Side coherence: fraction of majority side
    const sides = /** @type {Record<string, number>} */ ({});
    const groups = /** @type {Record<string, number>} */ ({});
    for (const g of tblGuests) {
      sides[g.side || "mutual"] = (sides[g.side || "mutual"] || 0) + 1;
      groups[g.group || "other"] = (groups[g.group || "other"] || 0) + 1;
    }
    const maxSide = Math.max(...Object.values(sides));
    const maxGroup = Math.max(...Object.values(groups));
    const sideScore = maxSide / tblGuests.length;
    const groupScore = maxGroup / tblGuests.length;
    totalScore += (sideScore + groupScore) / 2;
  }

  const avgScore = tableCount > 0 ? totalScore / tableCount : 0;
  const pct = Math.round(avgScore * 100);
  const grade = pct >= 80 ? "A" : pct >= 60 ? "B" : pct >= 40 ? "C" : "D";

  const items = [
    { num: `${pct}%`, label: t("seating_score_pct") || "ציון כולל" },
    { num: grade, label: t("seating_score_grade") || "דרגה" },
    { num: String(seated.length), label: t("seating_score_seated") || "מושבים" },
    { num: String(tableCount), label: t("seating_score_tables") || "שולחנות" },
  ];

  for (const { num, label } of items) {
    const box = document.createElement("div");
    box.className = "analytics-stat-box";
    const numEl = document.createElement("div");
    numEl.className = "analytics-stat-num";
    numEl.textContent = num;
    const lblEl = document.createElement("div");
    lblEl.className = "analytics-stat-lbl";
    lblEl.textContent = label;
    box.appendChild(numEl);
    box.appendChild(lblEl);
    container.appendChild(box);
  }
}

// ── Sprint 8: Response Velocity ──────────────────────────────────────────

/**
 * Calculate RSVP response velocity — submissions per day over time.
 * @returns {{ date: string, count: number }[]}
 */
export function computeResponseVelocity() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const dated = guests.filter((g) => g.rsvpDate);
  const buckets = /** @type {Record<string, number>} */ ({});
  for (const g of dated) {
    const day = g.rsvpDate.slice(0, 10);
    buckets[day] = (buckets[day] || 0) + 1;
  }
  return Object.entries(buckets)
    .map(([date, count]) => ({ date, count: /** @type {number} */ (count) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ── Sprint 8: Meal Distribution ──────────────────────────────────────────

/**
 * Get meal distribution with counts and percentages.
 * @returns {{ meal: string, count: number, pct: number }[]}
 */
export function getMealDistribution() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const confirmed = guests.filter((g) => g.status === "confirmed");
  const total = confirmed.length || 1;
  const counts = /** @type {Record<string, number>} */ ({});
  for (const g of confirmed) {
    const m = g.meal || "regular";
    counts[m] = (counts[m] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([meal, count]) => ({ meal, count: /** @type {number} */ (count), pct: Math.round((/** @type {number} */ (count) / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

// ── Sprint 8: Side Balance ───────────────────────────────────────────────

/**
 * Get bride/groom side balance with percentages.
 * @returns {{ groom: number, bride: number, mutual: number, groomPct: number, bridePct: number }}
 */
export function getSideBalance() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const groom = guests.filter((g) => g.side === "groom").length;
  const bride = guests.filter((g) => g.side === "bride").length;
  const mutual = guests.filter((g) => g.side === "mutual" || !g.side).length;
  const total = guests.length || 1;
  return {
    groom, bride, mutual,
    groomPct: Math.round((groom / total) * 100),
    bridePct: Math.round((bride / total) * 100),
  };
}

// ── Sprint 8: Check-in Velocity ──────────────────────────────────────────

/**
 * Get check-in velocity — arrivals per 15-minute slot.
 * @returns {{ slot: string, count: number }[]}
 */
export function getCheckinVelocity() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const checkedIn = guests.filter((g) => g.checkedIn && g.checkedInAt);
  const slots = /** @type {Record<string, number>} */ ({});
  for (const g of checkedIn) {
    const d = new Date(g.checkedInAt);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(Math.floor(d.getMinutes() / 15) * 15).padStart(2, "0");
    const slot = `${hh}:${mm}`;
    slots[slot] = (slots[slot] || 0) + 1;
  }
  return Object.entries(slots)
    .map(([slot, count]) => ({ slot, count: /** @type {number} */ (count) }))
    .sort((a, b) => a.slot.localeCompare(b.slot));
}

// ── Sprint 8: RSVP Conversion Rate ──────────────────────────────────────

/**
 * Get RSVP conversion metrics.
 * @returns {{ sent: number, responded: number, rate: number, confirmed: number, confirmRate: number }}
 */
export function getRsvpConversionRate() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const sent = guests.filter((g) => g.sent).length;
  const responded = guests.filter((g) => g.status !== "pending").length;
  const confirmed = guests.filter((g) => g.status === "confirmed").length;
  return {
    sent,
    responded,
    rate: sent > 0 ? Math.round((responded / sent) * 100) : 0,
    confirmed,
    confirmRate: responded > 0 ? Math.round((confirmed / responded) * 100) : 0,
  };
}

// ── Sprint 6: Advanced Analytics Helpers ──────────────────────────────────

/**
 * Compute cost per confirmed head (budget / confirmed seats).
 * @returns {{ costPerHead: number, totalBudget: number, confirmedSeats: number }}
 */
export function getCostPerHead() {
  const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo") ?? {});
  const target = parseFloat(info.budgetTarget || "0") || 0;
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []);
  const totalBudget = target ||
    vendors.reduce((s, v) => s + (parseFloat(v.price) || 0), 0) +
    expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const confirmedSeats = guests
    .filter((g) => g.status === "confirmed")
    .reduce((s, g) => s + (g.count || 1), 0);
  return {
    costPerHead: confirmedSeats > 0 ? Math.round(totalBudget / confirmedSeats) : 0,
    totalBudget,
    confirmedSeats,
  };
}

/**
 * Get seating completion metrics.
 * @returns {{ totalGuests: number, seated: number, unseated: number, rate: number }}
 */
export function getSeatingCompletion() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const confirmed = guests.filter((g) => g.status === "confirmed");
  const seated = confirmed.filter((g) => g.tableId).length;
  return {
    totalGuests: confirmed.length,
    seated,
    unseated: confirmed.length - seated,
    rate: confirmed.length > 0 ? Math.round((seated / confirmed.length) * 100) : 0,
  };
}

/**
 * Get budget category breakdown with percentages.
 * @returns {Array<{ category: string, amount: number, pct: number }>}
 */
export function getBudgetCategoryBreakdown() {
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []);
  /** @type {Record<string, number>} */
  const cats = {};
  for (const v of vendors) {
    const cat = v.category || "other";
    cats[cat] = (cats[cat] || 0) + (parseFloat(v.price) || 0);
  }
  for (const e of expenses) {
    const cat = e.category || "other";
    cats[cat] = (cats[cat] || 0) + (parseFloat(e.amount) || 0);
  }
  const total = Object.values(cats).reduce((s, v) => s + v, 0);
  return Object.entries(cats)
    .map(([category, amount]) => ({
      category,
      amount,
      pct: total > 0 ? Math.round((amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Get RSVP deadline countdown in days.
 * @returns {{ daysLeft: number | null, deadline: string | null, isOverdue: boolean }}
 */
export function getRsvpDeadlineCountdown() {
  const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo") ?? {});
  const deadline = info.rsvpDeadline;
  if (!deadline) return { daysLeft: null, deadline: null, isOverdue: false };
  const dl = new Date(deadline);
  if (isNaN(dl.getTime())) return { daysLeft: null, deadline: null, isOverdue: false };
  const now = new Date();
  const diff = dl.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return { daysLeft: days, deadline, isOverdue: days < 0 };
}

/**
 * Get vendor payment progress summary.
 * @returns {{ totalVendors: number, fullyPaid: number, partiallyPaid: number,
 *             unpaid: number, totalCost: number, totalPaid: number, outstanding: number }}
 */
export function getVendorPaymentProgress() {
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  let totalCost = 0, totalPaid = 0, fullyPaid = 0, partiallyPaid = 0, unpaid = 0;
  for (const v of vendors) {
    const price = parseFloat(v.price) || 0;
    const paid = parseFloat(v.paid) || 0;
    totalCost += price;
    totalPaid += paid;
    if (paid >= price && price > 0) fullyPaid++;
    else if (paid > 0) partiallyPaid++;
    else unpaid++;
  }
  return {
    totalVendors: vendors.length,
    fullyPaid,
    partiallyPaid,
    unpaid,
    totalCost,
    totalPaid,
    outstanding: totalCost - totalPaid,
  };
}

// ── Phase 10.3 — Error Analytics Dashboard ───────────────────────────────

/**
 * Compute error statistics from the local `errorLog` store.
 * @returns {{
 *   total: number,
 *   bySeverity: Record<string, number>,
 *   recent: Array<{message: string, level: string, ts: string, url: string}>
 * }}
 */
export function getErrorStats() {
  const raw = /** @type {unknown[]} */ (storeGet("errorLog") ?? []);
  /** @type {Record<string, number>} */
  const bySeverity = {};
  const recent = /** @type {Array<{message: string, level: string, ts: string, url: string}>} */ ([]);

  for (const entry of raw) {
    const e = /** @type {Record<string, unknown>} */ (entry);
    const level = String(e.level ?? e.severity ?? "error");
    bySeverity[level] = (bySeverity[level] ?? 0) + 1;
    recent.push({
      message: String(e.message ?? e.msg ?? "").slice(0, 120),
      level,
      ts: String(e.ts ?? e.timestamp ?? e.createdAt ?? ""),
      url: String(e.url ?? "").slice(0, 80),
    });
  }

  return { total: raw.length, bySeverity, recent: recent.slice(-10).reverse() };
}

/**
 * Render the error analytics dashboard into #analyticsErrorSummary and #analyticsErrorList.
 */
export function renderErrorAnalytics() {
  const { total, bySeverity, recent } = getErrorStats();

  // Summary grid
  const summaryEl = document.getElementById("analyticsErrorSummary");
  if (summaryEl) {
    summaryEl.textContent = "";

    const severityColors = /** @type {Record<string, string>} */ ({
      error: "var(--danger)",
      critical: "var(--danger)",
      high: "var(--danger)",
      warning: "var(--warning)",
      medium: "var(--warning)",
      info: "var(--info)",
      low: "var(--info)",
    });

    // Total
    const totalBox = _createStatBox(String(total), t("error_analytics_total"), "var(--primary)");
    summaryEl.appendChild(totalBox);

    // Per severity
    for (const [level, count] of Object.entries(bySeverity).sort((a, b) => b[1] - a[1])) {
      const box = _createStatBox(
        String(count),
        level,
        severityColors[level] ?? "var(--muted)",
      );
      summaryEl.appendChild(box);
    }
  }

  // Recent errors list
  const listEl = document.getElementById("analyticsErrorList");
  if (listEl) {
    listEl.textContent = "";
    if (recent.length === 0) {
      const p = document.createElement("p");
      p.className = "u-text-muted";
      p.textContent = t("error_analytics_empty");
      listEl.appendChild(p);
      return;
    }
    for (const err of recent) {
      const row = document.createElement("div");
      row.className = "analytics-error-row";
      const badge = document.createElement("span");
      badge.className = `badge badge--${err.level === "error" || err.level === "critical" ? "danger" : err.level === "warning" ? "warn" : "info"}`;
      badge.textContent = err.level;
      const msg = document.createElement("span");
      msg.className = "analytics-error-msg";
      msg.textContent = err.message;
      const time = document.createElement("span");
      time.className = "analytics-error-time u-text-muted";
      time.textContent = err.ts ? new Date(err.ts).toLocaleTimeString("he-IL") : "";
      row.appendChild(badge);
      row.appendChild(msg);
      row.appendChild(time);
      listEl.appendChild(row);
    }
  }
}

/** Helper: create a small stat box div (reuses pattern from other analytics). */
function _createStatBox(num, label, color) {
  const box = document.createElement("div");
  box.className = "analytics-stat-box";
  const numEl = document.createElement("div");
  numEl.className = "analytics-stat-num";
  numEl.style.color = color;
  numEl.textContent = num;
  const lblEl = document.createElement("div");
  lblEl.className = "analytics-stat-lbl";
  lblEl.textContent = label;
  box.appendChild(numEl);
  box.appendChild(lblEl);
  return box;
}
