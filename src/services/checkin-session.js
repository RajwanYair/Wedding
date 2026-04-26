/**
 * src/services/checkin-session.js — Day-of check-in session manager (Sprint 116)
 *
 * Manages real-time check-in state for the wedding day.  A session tracks
 * who has arrived, when, and provides live stats.
 *
 * Usage:
 *   import { startSession, checkIn, getSessionStats } from "./checkin-session.js";
 *
 *   const sessionId = startSession({ eventId: "evt_1" });
 *   checkIn(sessionId, "g_42", 3);   // guestId, plus party size
 *   getSessionStats(sessionId);      // { total, present, partySize }
 */

import { storeGet, storeSet } from "../core/store.js";

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   id:          string,
 *   eventId:     string,
 *   startedAt:   number,
 *   endedAt?:    number | null,
 *   checkIns:    Record<string, { ts: number, partySize: number }>,
 *   active:      boolean,
 * }} CheckinSession
 */

// ── Helpers ────────────────────────────────────────────────────────────────

/** @returns {CheckinSession[]} */
function _getSessions() {
  return /** @type {CheckinSession[]} */ (storeGet("checkinSessions") ?? []);
}

/** @param {CheckinSession[]} sessions */
function _save(sessions) {
  storeSet("checkinSessions", sessions);
}

function _id() {
  return `ci_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Session lifecycle ─────────────────────────────────────────────────────

/**
 * Start a new check-in session.
 * @param {{ eventId?: string }} [opts]
 * @returns {string}  session id
 */
export function startSession(opts = {}) {
  const session = /** @type {CheckinSession} */ ({
    id: _id(),
    eventId: opts.eventId ?? "_default",
    startedAt: Date.now(),
    endedAt: null,
    checkIns: {},
    active: true,
  });
  _save([..._getSessions(), session]);
  return session.id;
}

/**
 * End an active check-in session.
 * @param {string} sessionId
 * @returns {boolean}
 */
export function endSession(sessionId) {
  const sessions = _getSessions();
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1 || !sessions[idx].active) return false;
  sessions[idx] = { ...sessions[idx], active: false, endedAt: Date.now() };
  _save(sessions);
  return true;
}

/**
 * Get a session by id.
 * @param {string} sessionId
 * @returns {CheckinSession | null}
 */
export function getSession(sessionId) {
  return _getSessions().find((s) => s.id === sessionId) ?? null;
}

// ── Check-in ──────────────────────────────────────────────────────────────

/**
 * Record a guest check-in.
 * @param {string} sessionId
 * @param {string} guestId
 * @param {number} [partySize=1]
 * @returns {"ok" | "already_checked_in" | "session_not_found" | "session_ended"}
 */
export function checkIn(sessionId, guestId, partySize = 1) {
  const sessions = _getSessions();
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) return "session_not_found";
  const session = sessions[idx];
  if (!session.active) return "session_ended";
  if (session.checkIns[guestId]) return "already_checked_in";
  session.checkIns[guestId] = { ts: Date.now(), partySize };
  sessions[idx] = { ...session };
  _save(sessions);
  return "ok";
}

/**
 * Check if a guest has checked in.
 * @param {string} sessionId
 * @param {string} guestId
 * @returns {boolean}
 */
export function isCheckedIn(sessionId, guestId) {
  return Boolean(getSession(sessionId)?.checkIns[guestId]);
}

// ── Stats ─────────────────────────────────────────────────────────────────

/**
 * Get check-in stats for a session.
 * @param {string} sessionId
 * @returns {{ guestCount: number, partySize: number, isActive: boolean, startedAt: number } | null}
 */
export function getSessionStats(sessionId) {
  const session = getSession(sessionId);
  if (!session) return null;
  const entries = Object.values(session.checkIns);
  const partySize = entries.reduce((s, e) => s + e.partySize, 0);
  return {
    guestCount: entries.length,
    partySize,
    isActive: session.active,
    startedAt: session.startedAt,
  };
}
