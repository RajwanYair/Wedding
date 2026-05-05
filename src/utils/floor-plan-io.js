/**
 * src/utils/floor-plan-io.js — S629 Floor-plan layout export/import
 *
 * Pure helpers for serialising floor-plan layouts to JSON and generating
 * simple SVG representations. Also handles import validation and
 * version-stamped layout files.
 *
 * @module floor-plan-io
 * @owner ux
 */

import { listFurnitureTypes } from "./floor-plan.js";

/**
 * @typedef {import('./floor-plan.js').Furniture} Furniture
 * @typedef {import('./floor-plan.js').Room} Room
 */

/**
 * @typedef {object} FloorPlanLayout
 * @property {number}      version
 * @property {string}      name
 * @property {Room}        room
 * @property {Furniture[]} items
 * @property {string=}     exportedAt  // ISO timestamp
 */

const CURRENT_VERSION = 1;

/**
 * Export a floor plan to a JSON-serialisable layout object.
 *
 * @param {string} name
 * @param {Room} room
 * @param {Furniture[]} items
 * @returns {FloorPlanLayout}
 */
export function exportLayout(name, room, items) {
  return {
    version: CURRENT_VERSION,
    name: typeof name === "string" && name.trim() !== "" ? name.trim() : "Untitled",
    room: { width: room?.width ?? 800, height: room?.height ?? 600 },
    items: Array.isArray(items) ? items.map(({ id, type, x, y, w, h, rotation, label }) => ({
      id, type, x, y, w, h,
      ...(rotation != null ? { rotation } : {}),
      ...(label ? { label } : {}),
    })) : [],
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Validate an imported layout object. Returns error strings (empty = valid).
 *
 * @param {unknown} data
 * @returns {string[]}
 */
export function validateLayout(data) {
  const errors = [];
  if (!data || typeof data !== "object") return ["layout must be an object"];
  const d = /** @type {Record<string, unknown>} */ (data);
  if (typeof d.version !== "number" || d.version < 1) errors.push("invalid version");
  if (typeof d.name !== "string" || d.name.trim() === "") errors.push("name is required");
  if (!d.room || typeof d.room !== "object") {
    errors.push("room is required");
  } else {
    const r = /** @type {Record<string, unknown>} */ (d.room);
    if (typeof r.width !== "number" || r.width <= 0) errors.push("room.width must be positive");
    if (typeof r.height !== "number" || r.height <= 0) errors.push("room.height must be positive");
  }
  if (!Array.isArray(d.items)) {
    errors.push("items must be an array");
  } else {
    const validTypes = listFurnitureTypes();
    for (let i = 0; i < d.items.length; i++) {
      const it = d.items[i];
      if (!it || typeof it !== "object") {
        errors.push(`items[${i}]: must be an object`);
        continue;
      }
      if (!validTypes.includes(it.type)) errors.push(`items[${i}]: invalid type "${it.type}"`);
      if (typeof it.x !== "number") errors.push(`items[${i}]: x must be a number`);
      if (typeof it.y !== "number") errors.push(`items[${i}]: y must be a number`);
      if (typeof it.w !== "number" || it.w <= 0) errors.push(`items[${i}]: w must be positive`);
      if (typeof it.h !== "number" || it.h <= 0) errors.push(`items[${i}]: h must be positive`);
    }
  }
  return errors;
}

/**
 * Import a layout from a parsed JSON object. Validates first.
 *
 * @param {unknown} data
 * @returns {{ ok: boolean, layout?: FloorPlanLayout, errors?: string[] }}
 */
export function importLayout(data) {
  const errors = validateLayout(data);
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, layout: /** @type {FloorPlanLayout} */ (data) };
}

/**
 * Generate a simple SVG string for a floor plan (for thumbnails/export).
 *
 * @param {Room} room
 * @param {Furniture[]} items
 * @returns {string}
 */
export function toSvg(room, items) {
  const w = room?.width ?? 800;
  const h = room?.height ?? 600;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`,
    `<rect x="0" y="0" width="${w}" height="${h}" fill="#f5f0eb" stroke="#ccc"/>`,
  ];
  const fills = {
    "round-table": "#e0c9a6",
    "rect-table": "#d4b896",
    "head-table": "#c9a86c",
    "dance-floor": "#b3d4f0",
    bar: "#a3c2db",
    stage: "#d4a3db",
    "bar-tall": "#c2d4a3",
    buffet: "#dbd4a3",
  };
  if (Array.isArray(items)) {
    for (const it of items) {
      const fill = fills[it.type] ?? "#ccc";
      if (it.type === "round-table") {
        const cx = it.x + it.w / 2;
        const cy = it.y + it.h / 2;
        const r = Math.min(it.w, it.h) / 2;
        parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="#666"/>`);
      } else {
        parts.push(
          `<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" fill="${fill}" stroke="#666" rx="4"/>`,
        );
      }
      if (it.label) {
        const tx = it.x + it.w / 2;
        const ty = it.y + it.h / 2 + 4;
        parts.push(
          `<text x="${tx}" y="${ty}" text-anchor="middle" font-size="10" fill="#333">${escapeXml(it.label)}</text>`,
        );
      }
    }
  }
  parts.push("</svg>");
  return parts.join("\n");
}

/**
 * Escape XML special characters for safe SVG text.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
