/**
 * src/services/run-of-show.js — S125 wedding-day timeline editor.
 *
 * Pure data layer for the run-of-show editor: ordered itinerary items
 * (welcome → ceremony → cocktail → dinner → dancing → exit). Each item has
 * a fixed startTime + durationMinutes. Helpers normalise the timeline,
 * detect overlaps, and serialise to / from JSON.
 */

/** @typedef {{ id: string, title: string, startTime: string, durationMinutes: number, owner?: string, notes?: string }} TimelineItem */

import {
  readBrowserStorageJson,
  writeBrowserStorageJson,
} from "../core/storage.js";

const STORAGE_KEY = "wedding_v1_run_of_show";

const DEFAULT_TEMPLATE = Object.freeze([
  { title: "קבלת פנים", durationMinutes: 60 },
  { title: "חופה", durationMinutes: 30 },
  { title: "ארוחת ערב", durationMinutes: 90 },
  { title: "ריקודים", durationMinutes: 180 },
  { title: "סיום", durationMinutes: 0 },
]);

const _id = () => `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const _isHmm = (s) => typeof s === "string" && /^\d{1,2}:\d{2}$/.test(s);

const _toMinutes = (hhmm) => {
  if (!_isHmm(hhmm)) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const _fromMinutes = (n) => {
  const wrapped = ((n % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/** @returns {TimelineItem[]} */
export function loadRunOfShow() {
  const v = readBrowserStorageJson(STORAGE_KEY);
  return Array.isArray(v) ? v.filter(_isValid) : [];
}

/** @param {TimelineItem[]} items */
export function saveRunOfShow(items) {
  if (!Array.isArray(items)) throw new Error("items must be an array");
  writeBrowserStorageJson(STORAGE_KEY, items.filter(_isValid));
}

function _isValid(it) {
  return (
    it &&
    typeof it.id === "string" &&
    typeof it.title === "string" &&
    _isHmm(it.startTime) &&
    typeof it.durationMinutes === "number" &&
    it.durationMinutes >= 0
  );
}

/**
 * Build a default timeline starting at `firstStart`.
 * @param {string} firstStart e.g. "18:00"
 * @returns {TimelineItem[]}
 */
export function buildDefaultTimeline(firstStart = "18:00") {
  let cursor = _toMinutes(firstStart) ?? 18 * 60;
  return DEFAULT_TEMPLATE.map((tpl) => {
    const item = {
      id: _id(),
      title: tpl.title,
      startTime: _fromMinutes(cursor),
      durationMinutes: tpl.durationMinutes,
    };
    cursor += tpl.durationMinutes;
    return item;
  });
}

/**
 * Sort by startTime ascending. Wraps after midnight is *not* supported (assume same evening).
 * @param {TimelineItem[]} items
 */
export function sortTimeline(items) {
  return [...items].sort((a, b) => (_toMinutes(a.startTime) ?? 0) - (_toMinutes(b.startTime) ?? 0));
}

/**
 * Find pairs of items whose intervals overlap. Returns an array of `[idA, idB]`.
 * @param {TimelineItem[]} items
 */
export function detectOverlaps(items) {
  const sorted = sortTimeline(items);
  /** @type {[string,string][]} */
  const conflicts = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const aEnd = (_toMinutes(a.startTime) ?? 0) + a.durationMinutes;
    const bStart = _toMinutes(b.startTime) ?? 0;
    if (aEnd > bStart) conflicts.push([a.id, b.id]);
  }
  return conflicts;
}

/**
 * Append `delta` minutes to every item from `fromIndex` onward, returning a
 * new array. Useful for the editor's "shift everything later" button.
 *
 * @param {TimelineItem[]} items
 * @param {number} fromIndex
 * @param {number} deltaMinutes
 */
export function shiftTimeline(items, fromIndex, deltaMinutes) {
  return items.map((it, i) => {
    if (i < fromIndex) return it;
    const start = _toMinutes(it.startTime) ?? 0;
    return { ...it, startTime: _fromMinutes(start + deltaMinutes) };
  });
}

export const _internals = { _toMinutes, _fromMinutes };
