/**
 * src/utils/event-schedule.js — Wedding event schedule construction helpers
 *
 * S59: Pure data constructors and transformers for building a wedding day
 * schedule. Complements src/utils/timeline-analyzer.js (analysis layer) by
 * focusing on *creation*, *organisation*, and *mutation* of schedule items.
 *
 * All items use minute-offset integers (minutes since midnight) for
 * start/end times so they remain timezone-agnostic and easy to sort.
 */

// ── Wedding phase constants ────────────────────────────────────────────────

/** Canonical phase keys for a wedding day. */
export const WEDDING_PHASES = Object.freeze({
  PREPARATION: "preparation",
  CEREMONY: "ceremony",
  RECEPTION: "reception",
  DINNER: "dinner",
  DANCING: "dancing",
  CLOSING: "closing",
});

/** Ordered phase sequence (useful for UI rendering). */
export const PHASE_ORDER = Object.freeze([
  WEDDING_PHASES.PREPARATION,
  WEDDING_PHASES.CEREMONY,
  WEDDING_PHASES.RECEPTION,
  WEDDING_PHASES.DINNER,
  WEDDING_PHASES.DANCING,
  WEDDING_PHASES.CLOSING,
]);

// ── Item construction ──────────────────────────────────────────────────────

let _idSeq = 0;

/**
 * Creates a schedule item with validated fields.
 * @param {{
 *   title: string;
 *   startMinute: number;
 *   durationMinutes: number;
 *   phase?: string;
 *   location?: string;
 *   notes?: string;
 *   responsible?: string;
 * }} opts
 * @returns {{
 *   id: string;
 *   title: string;
 *   startMinute: number;
 *   durationMinutes: number;
 *   endMinute: number;
 *   phase: string;
 *   location: string;
 *   notes: string;
 *   responsible: string;
 * }}
 */
export function createScheduleItem(opts) {
  if (!opts.title || typeof opts.title !== "string") {
    throw new Error("createScheduleItem: title is required");
  }
  if (typeof opts.startMinute !== "number" || opts.startMinute < 0) {
    throw new Error("createScheduleItem: startMinute must be a non-negative number");
  }
  if (typeof opts.durationMinutes !== "number" || opts.durationMinutes <= 0) {
    throw new Error("createScheduleItem: durationMinutes must be a positive number");
  }
  _idSeq += 1;
  return {
    id: `sched-${Date.now()}-${_idSeq}`,
    title: opts.title,
    startMinute: opts.startMinute,
    durationMinutes: opts.durationMinutes,
    endMinute: opts.startMinute + opts.durationMinutes,
    phase: opts.phase ?? WEDDING_PHASES.RECEPTION,
    location: opts.location ?? "",
    notes: opts.notes ?? "",
    responsible: opts.responsible ?? "",
  };
}

// ── Sorting ────────────────────────────────────────────────────────────────

/**
 * Returns a new array of schedule items sorted by startMinute ascending.
 * Items with equal startMinute are sub-sorted by endMinute.
 * @param {ReturnType<typeof createScheduleItem>[]} items
 * @returns {ReturnType<typeof createScheduleItem>[]}
 */
export function sortByTime(items) {
  return [...items].sort((a, b) =>
    a.startMinute !== b.startMinute
      ? a.startMinute - b.startMinute
      : a.endMinute - b.endMinute
  );
}

// ── Phase filtering ────────────────────────────────────────────────────────

/**
 * Returns only the items belonging to a given phase.
 * @param {ReturnType<typeof createScheduleItem>[]} items
 * @param {string} phase
 * @returns {ReturnType<typeof createScheduleItem>[]}
 */
export function getItemsByPhase(items, phase) {
  return items.filter(i => i.phase === phase);
}

/**
 * Groups items by phase. Returns a Map keyed by phase string.
 * Phases present in PHASE_ORDER are always present (empty array if no items).
 * @param {ReturnType<typeof createScheduleItem>[]} items
 * @returns {Map<string, ReturnType<typeof createScheduleItem>[]>}
 */
export function groupByPhase(items) {
  /** @type {Map<string, ReturnType<typeof createScheduleItem>[]>} */
  const map = new Map(PHASE_ORDER.map(p => [p, []]));
  for (const item of items) {
    if (!map.has(item.phase)) map.set(item.phase, []);
    map.get(item.phase).push(item);
  }
  return map;
}

// ── Duration helpers ───────────────────────────────────────────────────────

/**
 * Returns the sum of all durationMinutes in the array.
 * @param {ReturnType<typeof createScheduleItem>[]} items
 * @returns {number}
 */
export function estimateTotalDuration(items) {
  return items.reduce((acc, i) => acc + i.durationMinutes, 0);
}

/**
 * Returns a new array where each item has a buffer appended after it by
 * shifting subsequent items forward. Items within the same phase are
 * grouped — the buffer is only inserted *between* consecutive items;
 * items of different phases are not shifted.
 *
 * Simpler contract: just adds `bufferMinutes` to every item's
 * `durationMinutes` (and updates `endMinute`). The caller is responsible
 * for re-sorting and re-laying-out if needed.
 *
 * @param {ReturnType<typeof createScheduleItem>[]} items
 * @param {number} [bufferMinutes=15]
 * @returns {ReturnType<typeof createScheduleItem>[]}
 */
export function addBufferTime(items, bufferMinutes = 15) {
  return items.map(item => ({
    ...item,
    durationMinutes: item.durationMinutes + bufferMinutes,
    endMinute: item.endMinute + bufferMinutes,
  }));
}

// ── Conflict detection ─────────────────────────────────────────────────────

/**
 * Returns pairs of items whose time ranges overlap.
 * Items with matching location are more likely true conflicts; items in
 * different locations are flagged as potential conflicts.
 *
 * @param {ReturnType<typeof createScheduleItem>[]} items
 * @returns {{ a: ReturnType<typeof createScheduleItem>; b: ReturnType<typeof createScheduleItem>; sameLocation: boolean }[]}
 */
export function findConflicts(items) {
  const sorted = sortByTime(items);
  /** @type {{ a: ReturnType<typeof createScheduleItem>; b: ReturnType<typeof createScheduleItem>; sameLocation: boolean }[]} */
  const conflicts = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      if (b.startMinute >= a.endMinute) break; // no more overlaps possible for a
      conflicts.push({
        a,
        b,
        sameLocation: a.location !== "" && a.location === b.location,
      });
    }
  }
  return conflicts;
}

// ── Full-day schedule builder ──────────────────────────────────────────────

/**
 * Builds a day schedule object from a flat list of items.
 * Returns metadata alongside phase-grouped and time-sorted items.
 *
 * @param {ReturnType<typeof createScheduleItem>[]} items
 * @returns {{
 *   items: ReturnType<typeof createScheduleItem>[];
 *   byPhase: Map<string, ReturnType<typeof createScheduleItem>[]>;
 *   conflicts: ReturnType<typeof findConflicts>;
 *   totalDurationMinutes: number;
 *   startMinute: number;
 *   endMinute: number;
 * }}
 */
export function buildDaySchedule(items) {
  const sorted = sortByTime(items);
  return {
    items: sorted,
    byPhase: groupByPhase(sorted),
    conflicts: findConflicts(sorted),
    totalDurationMinutes: estimateTotalDuration(sorted),
    startMinute: sorted.length > 0 ? sorted[0].startMinute : 0,
    endMinute: sorted.length > 0 ? sorted[sorted.length - 1].endMinute : 0,
  };
}

// ── Time formatting helpers ────────────────────────────────────────────────

/**
 * Formats a minute-offset integer as an "HH:MM" string.
 * e.g. 630 → "10:30", 75 → "01:15"
 * @param {number} minutes
 * @returns {string}
 */
export function formatMinuteOffset(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Parses an "HH:MM" string into a minute-offset integer.
 * @param {string} timeStr
 * @returns {number}
 */
export function parseTimeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) {
    throw new Error(`parseTimeToMinutes: invalid time string "${timeStr}"`);
  }
  return h * 60 + m;
}
