/**
 * src/services/schedule.js — Wedding-day schedule: run-of-show editor + live event tracker (S253)
 *
 * §1 Run-of-show editor (S125) — ordered itinerary items with overlap detection and timeline shifting.
 * §2 Live event schedule (S48/C1) — transforms timeline store items into an annotated event schedule.
 *
 * Pure functions — no DOM, no network.
 */

// ── §1 — Run-of-show editor ───────────────────────────────────────────────

/** @typedef {{ id: string, title: string, startTime: string, durationMinutes: number, owner?: string, notes?: string }} TimelineItem */

import {
  readBrowserStorageJson,
  writeBrowserStorageJson,
} from "../core/storage.js";
import { storeGet } from "../core/store.js";

const STORAGE_KEY = "wedding_v1_run_of_show";

const DEFAULT_TEMPLATE = Object.freeze([
  { title: "קבלת פנים", durationMinutes: 60 },
  { title: "חופה", durationMinutes: 30 },
  { title: "ארוחת ערב", durationMinutes: 90 },
  { title: "ריקודים", durationMinutes: 180 },
  { title: "סיום", durationMinutes: 0 },
]);

const _id = () => `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const _isHmm = (/** @type {any} */ s) => typeof s === "string" && /^\d{1,2}:\d{2}$/.test(s);

const _toMinutes = (/** @type {string} */ hhmm) => {
  if (!_isHmm(hhmm)) return null;
  const parts = hhmm.split(":").map(Number);
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
};

const _fromMinutes = (/** @type {number} */ n) => {
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

function _isValid(/** @type {any} */ it) {
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
    const a = /** @type {NonNullable<(typeof sorted)[number]>} */ (sorted[i]);
    const b = /** @type {NonNullable<(typeof sorted)[number]>} */ (sorted[i + 1]);
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

// ── §2 — Live event schedule ──────────────────────────────────────────────

/**
 * @typedef {{ id: string, time?: string, title?: string, note?: string, icon?: string }} StoreTimelineItem
 *
 * @typedef {{
 *   id:           string,
 *   time:         string,
 *   title:        string,
 *   icon:         string,
 *   note:         string,
 *   minutesDelta: number,
 *   isNext:       boolean,
 *   isPast:       boolean,
 * }} ScheduleEvent
 */

/**
 * Parse a "HH:MM" time string for the given base date.
 * Returns null if time is invalid.
 *
 * @param {string} time   e.g. "18:30"
 * @param {Date}   base   wedding date
 * @returns {Date | null}
 */
function _parseTime(time, base) {
  const parts = String(time).split(":").map(Number);
  const hh = parts[0], mm = parts[1];
  if (Number.isNaN(hh ?? NaN) || Number.isNaN(mm ?? NaN)) return null;
  const d = new Date(base);
  d.setHours(hh ?? 0, mm ?? 0, 0, 0);
  return d;
}

/**
 * Build a sorted, annotated run-of-show from store data.
 *
 * @param {Date} [now]   override "current time" (useful for tests)
 * @returns {ScheduleEvent[]}
 */
export function getRunOfShow(now = new Date()) {
  const items = /** @type {StoreTimelineItem[]} */ (storeGet("timeline") ?? []);
  const info = /** @type {Record<string,unknown>} */ (storeGet("weddingInfo") ?? {});
  const dateStr = /** @type {string} */ (info.date ?? "");

  if (!dateStr || items.length === 0) return [];

  const base = new Date(new Date(dateStr).toDateString());

  /** @type {ScheduleEvent[]} */
  const events = items
    .filter((item) => item.time)
    .map((item) => {
      const dt = _parseTime(/** @type {string} */ (item.time), base);
      const minutesDelta = dt ? Math.round((dt.getTime() - now.getTime()) / 60_000) : 0;
      return {
        id: item.id,
        time: item.time ?? "",
        title: item.title ?? "",
        icon: item.icon ?? "📅",
        note: item.note ?? "",
        minutesDelta,
        isNext: false,
        isPast: dt ? dt < now : false,
      };
    })
    .sort((a, b) => a.time.localeCompare(b.time));

  // Mark the first upcoming event as "next"
  const nextIdx = events.findIndex((e) => !e.isPast);
  if (nextIdx !== -1 && events[nextIdx]) events[nextIdx].isNext = true;

  return events;
}

/**
 * Return the single next upcoming event, or null.
 *
 * @param {Date} [now]
 * @returns {ScheduleEvent | null}
 */
export function getNextItem(now = new Date()) {
  return getRunOfShow(now).find((e) => e.isNext) ?? null;
}

/**
 * Format remaining time until an event as a human-readable string.
 * Positive = future; negative = past.
 *
 * @param {number} minutesDelta
 * @returns {string}   e.g. "בעוד 30 דק׳" or "לפני 10 דק׳"
 */
export function formatTimeUntil(minutesDelta) {
  const abs = Math.abs(minutesDelta);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}ש׳`);
  if (m > 0 || h === 0) parts.push(`${m}ד׳`);
  const durStr = parts.join(" ");
  return minutesDelta >= 0 ? `בעוד ${durStr}` : `לפני ${durStr}`;
}
