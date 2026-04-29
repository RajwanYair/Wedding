/**
 * src/utils/charts.js — Pure SVG chart primitives for analytics section
 */

import { t } from "../core/i18n.js";

/** SVG namespace constant. */
const SVG_NS = "http://www.w3.org/2000/svg";

/** Shorthand: create an SVG element in the SVG namespace. */
function _svg(tag) {
  return document.createElementNS(SVG_NS, tag);
}

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

  const svgEl = _svg("svg");
  svgEl.setAttribute("viewBox", "0 0 120 120");
  svgEl.setAttribute("role", "img");
  svgEl.setAttribute("aria-label", t("chart"));

  const titleEl = _svg("title");
  titleEl.textContent = t("chart");
  svgEl.appendChild(titleEl);

  let offset = -Math.PI / 2;

  slices.forEach((sl) => {
    if (sl.value === 0) return;
    const angle = (sl.value / total) * 2 * Math.PI;
    const dashLen = (sl.value / total) * circ;
    const rotate = (offset * 180) / Math.PI;

    const circle = _svg("circle");
    circle.setAttribute("cx", String(cx));
    circle.setAttribute("cy", String(cy));
    circle.setAttribute("r", String(r));
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", sl.color);
    circle.setAttribute("stroke-width", String(strokeW));
    circle.setAttribute("stroke-dasharray", `${dashLen} ${circ - dashLen}`);
    circle.setAttribute("transform", `rotate(${rotate} ${cx} ${cy})`);
    svgEl.appendChild(circle);

    offset += angle;
  });

  const textEl = _svg("text");
  textEl.setAttribute("x", String(cx));
  textEl.setAttribute("y", String(cy + 5));
  textEl.setAttribute("text-anchor", "middle");
  textEl.setAttribute("font-size", "14");
  textEl.setAttribute("fill", "var(--text)");
  textEl.textContent = String(total);
  svgEl.appendChild(textEl);

  container.textContent = "";
  container.appendChild(svgEl);
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

  const svgEl = _svg("svg");
  svgEl.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svgEl.setAttribute("role", "img");
  svgEl.setAttribute("aria-label", t("chart"));

  const titleEl = _svg("title");
  titleEl.textContent = t("chart");
  svgEl.appendChild(titleEl);

  bars.forEach((b, i) => {
    const y = i * rowH;
    const barW = (b.value / maxVal) * barMaxW;

    const labelText = _svg("text");
    labelText.setAttribute("x", "0");
    labelText.setAttribute("y", String(y + 14));
    labelText.setAttribute("font-size", "10");
    labelText.setAttribute("fill", "var(--text)");
    labelText.textContent = b.label;
    svgEl.appendChild(labelText);

    const rect = _svg("rect");
    rect.setAttribute("x", String(labelW));
    rect.setAttribute("y", String(y + 4));
    rect.setAttribute("width", String(barW));
    rect.setAttribute("height", String(rowH - 6));
    rect.setAttribute("fill", b.color);
    rect.setAttribute("rx", "3");
    svgEl.appendChild(rect);

    const valueText = _svg("text");
    valueText.setAttribute("x", String(labelW + barW + 4));
    valueText.setAttribute("y", String(y + 14));
    valueText.setAttribute("font-size", "10");
    valueText.setAttribute("fill", "var(--text)");
    valueText.textContent = String(b.value);
    svgEl.appendChild(valueText);
  });

  container.textContent = "";
  container.appendChild(svgEl);
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
