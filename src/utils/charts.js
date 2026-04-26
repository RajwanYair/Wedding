/**
 * src/utils/charts.js — Pure SVG chart primitives for analytics section
 */

import { t } from "../core/i18n.js";

/**
 * Render a donut SVG chart into the given container.
 * @param {string} containerId
 * @param {{ label: string, value: number, color: string }[]} slices
 */
export function renderDonut(containerId, slices) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) {
    container.textContent = "";
    return;
  }

  const cx = 60,
    cy = 60,
    r = 45,
    strokeW = 18;
  const circ = 2 * Math.PI * r;
  let svg = `<svg viewBox="0 0 120 120" role="img" aria-label="${t("chart")}"><title>${t("chart")}</title>`;
  let offset = -Math.PI / 2;

  slices.forEach((sl) => {
    if (sl.value === 0) return;
    const angle = (sl.value / total) * 2 * Math.PI;
    const dashLen = (sl.value / total) * circ;
    const rotate = (offset * 180) / Math.PI;
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${sl.color}"
      stroke-width="${strokeW}" stroke-dasharray="${dashLen} ${circ - dashLen}"
      transform="rotate(${rotate} ${cx} ${cy})" />`;
    offset += angle;
  });

  svg += `<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="14" fill="var(--text)">${total}</text>`;
  svg += `</svg>`;
  container.innerHTML = svg; // safe: all values are numbers/CSS vars/i18n strings
}

/**
 * Render a simple horizontal SVG bar chart.
 * @param {string} containerId
 * @param {{ label: string, value: number, color: string }[]} bars
 */
export function renderBar(containerId, bars) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const maxVal = Math.max(...bars.map((b) => b.value), 1);
  const rowH = 22,
    w = 220,
    labelW = 80,
    barMaxW = 120;
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
export function setStatText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

/**
 * Escape SVG special characters.
 * @param {string} s
 */
export function escSvg(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Escape HTML special characters for safe insertion into generated HTML.
 * @param {string} s
 */
export function escHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
