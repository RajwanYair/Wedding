/**
 * src/services/search-index.js — S109 Cmd-K command palette index.
 *
 * Lightweight in-memory index of guests, tables, vendors, and section names
 * for the command palette. No external deps; case-insensitive substring scan
 * with a small ranking heuristic (prefix match > word-start > substring).
 *
 * Designed to be rebuilt on demand — the dataset for a single wedding is
 * small (≤ 1000 guests). Avoids the cost of maintaining incremental updates.
 */

import { storeGet } from "../core/store.js";
import { t } from "../core/i18n.js";
import { SECTION_LIST } from "../core/constants.js";

/** @typedef {{ id: string, type: "guest"|"table"|"vendor"|"section", label: string, hint?: string }} SearchEntry */

/**
 * Build the index from the current store state.
 * @returns {SearchEntry[]}
 */
export function buildSearchIndex() {
  /** @type {SearchEntry[]} */
  const out = [];

  for (const sectionId of SECTION_LIST) {
    const key = `nav_${sectionId}`;
    const label = (t(key) || sectionId);
    out.push({
      id: `section:${sectionId}`,
      type: "section",
      label,
      hint: sectionId,
    });
  }

  const guests = /** @type {Array<{id:string, name?:string, phone?:string}>} */ (
    storeGet("guests") ?? []
  );
  for (const g of guests) {
    if (!g?.id) continue;
    out.push({
      id: `guest:${g.id}`,
      type: "guest",
      label: g.name ?? g.id,
      hint: g.phone ?? "",
    });
  }

  const tables = /** @type {Array<{id:string, name?:string, capacity?:number}>} */ (
    storeGet("tables") ?? []
  );
  for (const tbl of tables) {
    if (!tbl?.id) continue;
    out.push({
      id: `table:${tbl.id}`,
      type: "table",
      label: tbl.name ?? `#${tbl.id}`,
      hint: tbl.capacity != null ? String(tbl.capacity) : "",
    });
  }

  const vendors = /** @type {Array<{id:string, name?:string, category?:string}>} */ (
    storeGet("vendors") ?? []
  );
  for (const v of vendors) {
    if (!v?.id) continue;
    out.push({
      id: `vendor:${v.id}`,
      type: "vendor",
      label: v.name ?? v.id,
      hint: v.category ?? "",
    });
  }

  return out;
}

/**
 * Score an entry against a query. Higher is better; 0 means no match.
 * @param {SearchEntry} entry
 * @param {string} query lowercase trimmed
 * @returns {number}
 */
function _scoreEntry(entry, query) {
  if (!query) return 1;
  const label = entry.label.toLowerCase();
  if (label === query) return 100;
  if (label.startsWith(query)) return 80;
  if (label.includes(` ${query}`)) return 60;
  if (label.includes(query)) return 40;
  const hint = (entry.hint ?? "").toLowerCase();
  if (hint.includes(query)) return 20;
  return 0;
}

/**
 * Search the index. Returns top-N matches by descending score.
 * @param {SearchEntry[]} index
 * @param {string} query
 * @param {number} [limit=20]
 * @returns {SearchEntry[]}
 */
export function searchIndex(index, query, limit = 20) {
  const q = (query ?? "").trim().toLowerCase();
  if (!q) return index.slice(0, limit);
  const scored = /** @type {Array<{e: SearchEntry, s: number}>} */ ([]);
  for (const e of index) {
    const s = _scoreEntry(e, q);
    if (s > 0) scored.push({ e, s });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => x.e);
}
