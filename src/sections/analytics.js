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
  _unsubs.push(storeSubscribe("expenses", renderBudgetChart));
  _unsubs.push(storeSubscribe("vendors", renderBudgetChart));
  renderAnalytics();
  renderBudgetChart();
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
