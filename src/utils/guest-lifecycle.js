/**
 * src/utils/guest-lifecycle.js
 * Guest stage transition state machine: tracks each guest through the
 * invited → rsvp_sent → rsvp_opened → confirmed/declined → checked_in pipeline.
 * Pure data — no DOM, no network, no localStorage.
 *
 * @module guest-lifecycle
 */

// ── Stage definitions ──────────────────────────────────────────────────────

/**
 * Ordered guest lifecycle stages (index = ordinal weight).
 * @type {readonly string[]}
 */
export const LIFECYCLE_STAGES = Object.freeze([
  "new",
  "invited",
  "rsvp_sent",
  "rsvp_opened",
  "form_started",
  "confirmed",
  "declined",
  "waitlisted",
  "checked_in",
]);

/**
 * Terminal stages — once reached no further automatic transitions occur.
 * @type {readonly string[]}
 */
export const TERMINAL_STAGES = Object.freeze([
  "confirmed",
  "declined",
  "checked_in",
]);

/**
 * Valid forward transitions per stage.
 * @type {Readonly<Record<string, readonly string[]>>}
 */
export const ALLOWED_TRANSITIONS = Object.freeze({
  new: ["invited"],
  invited: ["rsvp_sent", "confirmed", "declined"],
  rsvp_sent: ["rsvp_opened", "confirmed", "declined"],
  rsvp_opened: ["form_started", "confirmed", "declined"],
  form_started: ["confirmed", "declined", "waitlisted"],
  confirmed: ["checked_in", "declined"],
  declined: ["confirmed"], // allow reinstatement
  waitlisted: ["confirmed", "declined"],
  checked_in: [],
});

// ── Transition helpers ─────────────────────────────────────────────────────

/**
 * Returns true when the transition from `from` → `to` is allowed.
 * @param {string} from
 * @param {string} to
 * @returns {boolean}
 */
export function canTransition(from, to) {
  const allowed = ALLOWED_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

/**
 * Attempts to transition a guest to the next stage.
 * Returns the updated guest object on success, or null if the transition is invalid.
 * Does NOT mutate the input guest.
 * @param {{ id: string, stage: string, [key: string]: unknown }} guest
 * @param {string} toStage
 * @param {object} [meta] - optional metadata to merge (e.g. { checkinTime })
 * @returns {{ id: string, stage: string, stageHistory: Array, [key: string]: unknown } | null}
 */
export function transitionGuest(guest, toStage, meta = {}) {
  if (!guest || !toStage) return null;
  const from = guest.stage ?? "new";
  if (!canTransition(from, toStage)) return null;

  const history = Array.isArray(guest.stageHistory)
    ? [...guest.stageHistory]
    : [];
  history.push({ from, to: toStage, at: meta.at ?? new Date().toISOString() });

  return { ...guest, ...meta, stage: toStage, stageHistory: history };
}

/**
 * Forces a stage without transition validation.
 * Use only for data imports/migrations.
 * @param {{ [key: string]: unknown }} guest
 * @param {string} stage
 * @returns {{ stage: string, stageHistory: Array, [key: string]: unknown }}
 */
export function forceStage(guest, stage) {
  if (!guest) return { stage, stageHistory: [] };
  const history = Array.isArray(guest.stageHistory)
    ? [...guest.stageHistory]
    : [];
  history.push({
    from: guest.stage ?? "new",
    to: stage,
    at: new Date().toISOString(),
    forced: true,
  });
  return { ...guest, stage, stageHistory: history };
}

// ── Stage queries ──────────────────────────────────────────────────────────

/**
 * Returns the ordinal index of a stage (higher = further in the funnel).
 * Unknown stages return -1.
 * @param {string} stage
 * @returns {number}
 */
export function stageOrdinal(stage) {
  return LIFECYCLE_STAGES.indexOf(stage);
}

/**
 * Returns true when `a` is further along the funnel than `b`.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function isLaterStage(a, b) {
  return stageOrdinal(a) > stageOrdinal(b);
}

/**
 * Returns true if the guest is in a terminal stage.
 * @param {{ stage?: string }} guest
 * @returns {boolean}
 */
export function isTerminal(guest) {
  return TERMINAL_STAGES.includes(guest?.stage ?? "");
}

/**
 * Returns true when guest has been checked in.
 * @param {{ stage?: string }} guest
 * @returns {boolean}
 */
export function isCheckedIn(guest) {
  return guest?.stage === "checked_in";
}

/**
 * Returns true when guest has confirmed attendance.
 * @param {{ stage?: string }} guest
 * @returns {boolean}
 */
export function isConfirmed(guest) {
  return guest?.stage === "confirmed" || guest?.stage === "checked_in";
}

// ── Batch helpers ──────────────────────────────────────────────────────────

/**
 * Groups an array of guests by their current stage.
 * @param {Array<{ stage?: string }>} guests
 * @returns {Record<string, Array>}
 */
export function groupByStage(guests) {
  if (!Array.isArray(guests)) return {};
  const groups = {};
  for (const g of guests) {
    const stage = g.stage ?? "new";
    (groups[stage] ??= []).push(g);
  }
  return groups;
}

/**
 * Returns a funnel summary: count per stage and cumulative progress.
 * @param {Array<{ stage?: string }>} guests
 * @returns {{ total: number, byStagе: Record<string, number>, confirmedRate: number, checkinRate: number }}
 */
export function buildLifecycleSummary(guests) {
  if (!Array.isArray(guests))
    return { total: 0, byStage: {}, confirmedRate: 0, checkinRate: 0 };

  const byStage = {};
  for (const g of guests) {
    const s = g.stage ?? "new";
    byStage[s] = (byStage[s] ?? 0) + 1;
  }

  const total = guests.length;
  const confirmed = (byStage.confirmed ?? 0) + (byStage.checked_in ?? 0);
  const checkedIn = byStage.checked_in ?? 0;

  return {
    total,
    byStage,
    confirmedRate: total > 0 ? confirmed / total : 0,
    checkinRate: total > 0 ? checkedIn / total : 0,
  };
}

/**
 * Returns guests whose stage is before `targetStage` in the funnel.
 * Useful for identifying who still needs nudging.
 * @param {Array<{ stage?: string }>} guests
 * @param {string} targetStage
 * @returns {Array}
 */
export function guestsBeforeStage(guests, targetStage) {
  if (!Array.isArray(guests)) return [];
  const target = stageOrdinal(targetStage);
  return guests.filter((g) => {
    const ord = stageOrdinal(g.stage ?? "new");
    return ord >= 0 && ord < target;
  });
}
