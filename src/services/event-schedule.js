/**
 * src/services/event-schedule.js — Run-of-show / event-day schedule (Sprint 48 / C1)
 *
 * Transforms raw timeline store items into an annotated event schedule.
 * Pure functions — no DOM, no network.
 */

import { storeGet } from "../core/store.js";

/**
 * @typedef {{ id: string, time?: string, title?: string, note?: string, icon?: string }} TimelineItem
 *
 * @typedef {{
 *   id:         string,
 *   time:       string,
 *   title:      string,
 *   icon:       string,
 *   note:       string,
 *   minutesDelta: number,
 *   isNext:     boolean,
 *   isPast:     boolean,
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
  const [hh, mm] = String(time).split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const d = new Date(base);
  d.setHours(hh, mm, 0, 0);
  return d;
}

/**
 * Build a sorted, annotated run-of-show from store data.
 *
 * @param {Date} [now]   override "current time" (useful for tests)
 * @returns {ScheduleEvent[]}
 */
export function getRunOfShow(now = new Date()) {
  const items = /** @type {TimelineItem[]} */ (storeGet("timeline") ?? []);
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
  if (nextIdx !== -1) events[nextIdx].isNext = true;

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
