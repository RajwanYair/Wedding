/**
 * src/utils/timeline-analyzer.js — Timeline analysis utilities (Sprint 107)
 *
 * Detects scheduling conflicts, builds the day-of schedule, and finds
 * free-time gaps in a sequence of timeline events.
 *
 * All functions are pure (no side effects, no DOM) and work with plain
 * JS objects so they are easily testable.
 *
 * @typedef {{ id: string, title: string, startMs: number, endMs: number, category?: string }} TimelineEvent
 * @typedef {{ a: TimelineEvent, b: TimelineEvent, overlapMs: number }}  TimelineConflict
 * @typedef {{ startMs: number, endMs: number, durationMs: number }} TimeGap
 * @typedef {{ time: string, event: TimelineEvent, vendor?: { name: string } | null }} ScheduleItem
 */

/**
 * Format a UNIX ms timestamp as HH:MM (Asia/Jerusalem).
 * @param {number} ms
 * @returns {string}
 */
export function formatEventTime(ms) {
  return new Date(ms).toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jerusalem",
  });
}

// ── Conflict detection ─────────────────────────────────────────────────────

/**
 * Detect overlapping events.
 * Two events A and B conflict when A.startMs < B.endMs && B.startMs < A.endMs
 * @param {TimelineEvent[]} events
 * @returns {TimelineConflict[]}
 */
export function detectConflicts(events) {
  const sorted = [...events].sort((a, b) => a.startMs - b.startMs);
  /** @type {TimelineConflict[]} */
  const conflicts = [];

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      if (b.startMs >= a.endMs) break;  // later events can't overlap a
      const overlapStart = Math.max(a.startMs, b.startMs);
      const overlapEnd   = Math.min(a.endMs,   b.endMs);
      conflicts.push({ a, b, overlapMs: overlapEnd - overlapStart });
    }
  }

  return conflicts;
}

// ── Free-time gap detection ────────────────────────────────────────────────

/**
 * Find all gaps of at least `minGapMs` duration between events.
 * @param {TimelineEvent[]} events
 * @param {number}          minGapMs   Minimum gap length in ms (default 15 min)
 * @returns {TimeGap[]}
 */
export function findGaps(events, minGapMs = 15 * 60 * 1000) {
  if (events.length < 2) return [];

  const sorted = [...events].sort((a, b) => a.endMs - b.endMs);
  /** @type {TimeGap[]} */
  const gaps = [];

  // Build a "covered" time union by merging sorted intervals
  const merged = [{ start: sorted[0].startMs, end: sorted[0].endMs }];
  for (const ev of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (ev.startMs <= last.end) {
      last.end = Math.max(last.end, ev.endMs);
    } else {
      merged.push({ start: ev.startMs, end: ev.endMs });
    }
  }

  for (let i = 0; i < merged.length - 1; i++) {
    const gapStart = merged[i].end;
    const gapEnd   = merged[i + 1].start;
    const duration = gapEnd - gapStart;
    if (duration >= minGapMs) {
      gaps.push({ startMs: gapStart, endMs: gapEnd, durationMs: duration });
    }
  }

  return gaps;
}

// ── Day-of schedule ────────────────────────────────────────────────────────

/**
 * Build a chronological schedule combining timeline events and vendor slots.
 * @param {TimelineEvent[]} events
 * @param {{ id: string, name: string, arrivalMs?: number }[]} [vendors]
 * @returns {ScheduleItem[]}
 */
export function buildDaySchedule(events, vendors = []) {
  /** @type {ScheduleItem[]} */
  const items = [];

  for (const ev of events) {
    const vendor = vendors.find((v) => v.id && ev.title.toLowerCase().includes(v.name.toLowerCase())) ?? null;
    items.push({
      time:   formatEventTime(ev.startMs),
      event:  ev,
      vendor: vendor ?? null,
    });
  }

  items.sort((a, b) => a.event.startMs - b.event.startMs);

  return items;
}

// ── Duration helpers ───────────────────────────────────────────────────────

/**
 * Calculate total scheduled minutes for a set of events.
 * @param {TimelineEvent[]} events
 * @returns {number}
 */
export function totalScheduledMinutes(events) {
  return events.reduce((sum, ev) => sum + (ev.endMs - ev.startMs) / 60_000, 0);
}

/**
 * Group events by category.
 * @param {TimelineEvent[]} events
 * @returns {Record<string, TimelineEvent[]>}
 */
export function groupByCategory(events) {
  /** @type {Record<string, TimelineEvent[]>} */
  const out = {};
  for (const ev of events) {
    const cat = ev.category ?? "other";
    (out[cat] ??= []).push(ev);
  }
  return out;
}
