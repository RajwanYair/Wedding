/**
 * src/services/nfc-session.js — S259 merged NFC + check-in session service
 *
 * Merged from:
 *   - nfc.js            (S23)    — Web NFC API wrapper for check-in
 *   - checkin-session.js (S116)  — Day-of check-in session manager
 *
 * §1 NFC: isNFCSupported, writeNFCTag, startNFCScan
 * §2 Check-in session: startCheckinSession, endCheckinSession, getCheckinSession,
 *    recordCheckin, getSessionStats, isSessionActive
 *
 * Named exports only — no window.* side effects, no DOM.
 */
// ── Types ─────────────────────────────────────────────────────────────────

/**
 * @typedef {{ guestId: string, event: string }} NFCCheckinPayload
 */

// ── Feature detection ─────────────────────────────────────────────────────

/**
 * True when the Web NFC API (NDEFReader) is available.
 * Requires Chrome for Android 89+ with "WebNFC" flag or production enable.
 * @returns {boolean}
 */
export function isNFCSupported() {
  // Use globalThis so this works in both browser (window === globalThis) and test env
  return typeof globalThis !== "undefined" && typeof globalThis.NDEFReader === "function";
}

// ── Core scan API ─────────────────────────────────────────────────────────

/**
 * Start listening for NDEF records. Calls `onRecord(payload)` for each
 * matching wedding check-in record.
 *
 * @param {(payload: NFCCheckinPayload) => void} onRecord
 * @param {object} [options]
 * @param {string} [options.recordType]   NDEF record type to match (default "text")
 * @returns {Promise<() => void>}  Resolves to a stop function — call to end scan
 * @throws {Error} if NFC is not supported or permission is denied
 */
export async function startNFCScan(onRecord, { recordType = "text" } = {}) {
  if (!isNFCSupported()) {
    throw new Error("Web NFC not supported on this device");
  }

  // NDEFReader is only available in browser; cast for type safety
  const NDEFReader = /** @type {any} */ (globalThis.NDEFReader);
  const reader = new NDEFReader();

  /** @type {AbortController} */
  const controller = new AbortController();

  reader.addEventListener("reading", (/** @type {any} */ event) => {
    for (const record of event.message.records) {
      if (record.recordType === recordType) {
        try {
          const decoder = new TextDecoder();
          const text = decoder.decode(record.data);
          const payload = /** @type {NFCCheckinPayload} */ (JSON.parse(text));
          if (payload?.guestId && payload?.event === "wedding_checkin") {
            onRecord(payload);
          }
        } catch {
          // Unreadable record — ignore
        }
      }
    }
  });

  reader.addEventListener("readingerror", () => {
    // Non-fatal scan error — log but keep scanning
    console.warn("[NFC] Reading error — scanner still active");
  });

  await reader.scan({ signal: controller.signal });

  // Return stop function
  return function stopNFCScan() {
    controller.abort();
  };
}

// ── Write API ─────────────────────────────────────────────────────────────

/**
 * Write a wedding check-in record to the NFC tag currently in range.
 *
 * @param {string} guestId
 * @returns {Promise<void>}
 * @throws {Error} if NFC is not supported or write fails
 */
export async function writeNFCTag(guestId) {
  if (!isNFCSupported()) {
    throw new Error("Web NFC not supported on this device");
  }
  const NDEFReader = /** @type {any} */ (globalThis.NDEFReader);
  const writer = new NDEFReader();

  const payload = JSON.stringify({ guestId, event: "wedding_checkin" });
  const encoder = new TextEncoder();

  await writer.write({
    records: [
      {
        recordType: "text",
        data: encoder.encode(payload),
      },
    ],
  });
}


// ── §2 — Check-in session manager ──────────────────────────────────────

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
  const _sess = sessions[idx];
  if (idx === -1 || !_sess || !_sess.active) return false;
  sessions[idx] = { ..._sess, active: false, endedAt: Date.now() };
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
  if (!session) return "session_not_found";
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

