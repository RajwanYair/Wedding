/**
 * src/services/security.js — Encryption, session guard, secure storage, NFC + check-in (S246 + S282)
 *
 * Merged from:
 *   - crypto-security.js  (S83/S87) — AES-GCM primitives + session inactivity guard
 *   - secure-storage.js   (Phase A4) — Encrypted localStorage for tokens & PII
 *   - nfc-session.js      (S259)     — Web NFC API + day-of check-in session manager
 *
 * ROADMAP §5 Phase A — Auth tokens in plaintext localStorage are a top P0 risk
 * (OWASP A02:2021 Cryptographic Failures). This module wraps `localStorage`
 * with Web Crypto AES-256-GCM and a per-device random key.
 *
 * - Per-device key is generated on first use and stored under
 *   `wedding_v1_device_key` as raw bytes (base64). The key cannot be exfiltrated
 *   without script execution on the same origin (same risk class as a JWT).
 * - Values are JSON-serialised, encrypted, and stored as base64 envelopes:
 *   `{ "iv": "<b64>", "ct": "<b64>", "v": 1 }`.
 * - Backward-compatible fallback: `getSecure()` returns `null` for missing keys
 *   and unsealed legacy values (they are deleted lazily so old plaintext is
 *   purged on first read).
 *
 * NOTE: This is opportunistic encryption — XSS still wins. The point is to
 * prevent passive exposure (shared-device, dev-tools snooping, malware scrapers)
 * and to satisfy compliance reviews that flag plaintext tokens.
 */

import { STORAGE_PREFIX } from "../core/config.js";
import { storeGet, storeSet } from "../core/store.js";

// ── §1 — AES-GCM primitives ──────────────────────────────────────────────

const ALGO = "AES-GCM";
const IV_LEN = 12; // bytes

/**
 * Generate a fresh AES-256-GCM key.
 * @returns {Promise<CryptoKey>}
 */
export async function generateKey() {
  return crypto.subtle.generateKey(
    { name: ALGO, length: 256 },
    false, // non-extractable
    ["encrypt", "decrypt"],
  );
}

/**
 * Import a raw 32-byte key (Uint8Array or ArrayBuffer) as AES-256-GCM.
 * @param {Uint8Array | ArrayBuffer} rawKey  32 bytes
 * @returns {Promise<CryptoKey>}
 */
export async function importRawKey(rawKey) {
  return crypto.subtle.importKey("raw", rawKey, { name: ALGO, length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * @param {CryptoKey} key
 * @param {string} plaintext
 * @returns {Promise<string>}  base64-encoded IV+ciphertext
 */
export async function encryptField(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherbuf = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encoded);
  const combined = new Uint8Array(IV_LEN + cipherbuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherbuf), IV_LEN);
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a base64-encoded IV+ciphertext produced by `encryptField`.
 * @param {CryptoKey} key
 * @param {string} ciphertext  base64-encoded IV+ciphertext
 * @returns {Promise<string>}  plaintext
 */
export async function decryptField(key, ciphertext) {
  const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, IV_LEN);
  const encrypted = combined.slice(IV_LEN);
  const plainbuf = await crypto.subtle.decrypt({ name: ALGO, iv }, key, encrypted);
  return new TextDecoder().decode(plainbuf);
}

// ── §2 — Session inactivity guard ────────────────────────────────────────

/**
 * @typedef {{
 *   timeoutMs: number,
 *   warningMs?: number,
 *   onTimeout: () => void,
 *   onWarning?: () => void
 * }} SessionGuardOptions
 *
 * @typedef {{
 *   recordActivity(): void,
 *   destroy(): void,
 *   remainingMs(): number,
 *   reset(): void
 * }} SessionGuard
 */

/**
 * Create a session inactivity guard.
 *
 * @param {SessionGuardOptions} opts
 * @returns {SessionGuard}
 */
export function createSessionGuard(opts) {
  const { timeoutMs, warningMs, onTimeout, onWarning } = opts;
  if (timeoutMs < 1) throw new RangeError("timeoutMs must be >= 1");

  let lastActivity = Date.now();
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timeoutHandle = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let warningHandle = null;
  let destroyed = false;

  function clearTimers() {
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
    if (warningHandle !== null) {
      clearTimeout(warningHandle);
      warningHandle = null;
    }
  }

  function scheduleTimers() {
    if (destroyed) return;
    clearTimers();
    timeoutHandle = setTimeout(() => {
      if (!destroyed) onTimeout();
    }, timeoutMs);

    if (typeof warningMs === "number" && warningMs < timeoutMs && onWarning) {
      warningHandle = setTimeout(() => {
        if (!destroyed) onWarning();
      }, timeoutMs - warningMs);
    }
  }

  scheduleTimers();

  return {
    /** Call whenever the user performs an action. */
    recordActivity() {
      if (destroyed) return;
      lastActivity = Date.now();
      scheduleTimers();
    },

    /** Tear down all timers. */
    destroy() {
      destroyed = true;
      clearTimers();
    },

    /** Milliseconds until timeout fires (0 if already fired or destroyed). */
    remainingMs() {
      return Math.max(0, lastActivity + timeoutMs - Date.now());
    },

    /** Reset the timer without recording a user gesture. */
    reset() {
      if (destroyed) return;
      lastActivity = Date.now();
      scheduleTimers();
    },
  };
}

// ── §3 — Encrypted localStorage (secure-storage) ────────────────────────

const KEY_NAME = `${STORAGE_PREFIX}device_key`;
const KEY_LEN = 32;
const ENVELOPE_VERSION = 1;

/** @type {Promise<CryptoKey> | null} */
let _keyPromise = null;

// ── base64 helpers (browser + Node) ───────────────────────────────────────

/** @param {Uint8Array} bytes */
function toB64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(/** @type {number} */ (bytes[i]));
  return btoa(s);
}

/** @param {string} b64 */
function fromB64(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ── Storage adapter ───────────────────────────────────────────────────────

/**
 * @returns {Storage | null}
 */
function _ls() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

// ── Key management ────────────────────────────────────────────────────────

/**
 * Get or lazily create the per-device AES-GCM key.
 * @returns {Promise<CryptoKey>}
 */
function _getKey() {
  if (_keyPromise) return _keyPromise;
  _keyPromise = (async () => {
    const ls = _ls();
    let raw;
    const stored = ls?.getItem(KEY_NAME);
    if (stored) {
      try {
        raw = fromB64(stored);
        if (raw.byteLength !== KEY_LEN) raw = null;
      } catch {
        raw = null;
      }
    }
    if (!raw) {
      raw = crypto.getRandomValues(new Uint8Array(KEY_LEN));
      try {
        ls?.setItem(KEY_NAME, toB64(raw));
      } catch {
        /* quota / blocked */
      }
    }
    return importRawKey(raw);
  })();
  return _keyPromise;
}

/**
 * Force a fresh key on next access. Caller is responsible for clearing
 * dependent encrypted entries first.
 */
export function rotateDeviceKey() {
  _keyPromise = null;
  try {
    _ls()?.removeItem(KEY_NAME);
  } catch {
    /* ignore */
  }
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Encrypt and store any JSON-serialisable value under `wedding_v1_<key>`.
 * @template T
 * @param {string} key  Short identifier (no prefix).
 * @param {T} value
 * @returns {Promise<void>}
 */
export async function setSecure(key, value) {
  const ls = _ls();
  if (!ls) return;
  const cryptoKey = await _getKey();
  const sealed = await encryptField(cryptoKey, JSON.stringify(value));
  const envelope = JSON.stringify({ v: ENVELOPE_VERSION, d: sealed });
  ls.setItem(STORAGE_PREFIX + key, envelope);
}

/**
 * Read and decrypt a previously sealed value. Returns `null` if missing,
 * malformed, or written by an old plaintext-only build (the legacy entry is
 * removed lazily so callers see a consistent state).
 * @template T
 * @param {string} key
 * @returns {Promise<T | null>}
 */
export async function getSecure(key) {
  const ls = _ls();
  if (!ls) return null;
  const raw = ls.getItem(STORAGE_PREFIX + key);
  if (!raw) return null;

  /** @type {{ v: number, d?: string, iv?: string, ct?: string } | null} */
  let env = null;
  try {
    env = JSON.parse(raw);
  } catch {
    /* not JSON */
  }

  if (!env || env.v !== ENVELOPE_VERSION) {
    // Legacy / unsealed: drop it so we never surface plaintext.
    try {
      ls.removeItem(STORAGE_PREFIX + key);
    } catch {
      /* ignore */
    }
    return null;
  }

  try {
    const cryptoKey = await _getKey();

    // New format: { v, d } — d is encryptField() output
    if (env.d) {
      const plain = await decryptField(cryptoKey, env.d);
      return /** @type {T} */ (JSON.parse(plain));
    }

    // Legacy format: { v, iv, ct } — inline AES-GCM (pre-Sprint 62)
    if (env.iv && env.ct) {
      const iv = fromB64(env.iv);
      const ct = fromB64(env.ct);
      const IV_LEN_LEGACY = 12;
      const combined = new Uint8Array(IV_LEN_LEGACY + ct.byteLength);
      combined.set(iv, 0);
      combined.set(ct, IV_LEN_LEGACY);
      const b64 = btoa(String.fromCharCode(...combined));
      const plain = await decryptField(cryptoKey, b64);
      return /** @type {T} */ (JSON.parse(plain));
    }

    // Unrecognised format — drop it
    ls.removeItem(STORAGE_PREFIX + key);
    return null;
  } catch {
    // Wrong key (e.g. rotated) — drop the unreadable entry.
    try {
      ls.removeItem(STORAGE_PREFIX + key);
    } catch {
      /* ignore */
    }
    return null;
  }
}

/**
 * Remove a sealed entry.
 * @param {string} key
 */
export function removeSecure(key) {
  try {
    _ls()?.removeItem(STORAGE_PREFIX + key);
  } catch {
    /* ignore */
  }
}

/**
 * Test-only: reset key cache. Does NOT clear localStorage.
 */
export function _resetKeyForTests() {
  _keyPromise = null;
}

/**
 * Diagnostic — returns whether the secure-storage runtime is available and
 * whether the device key + a sample sealed envelope exist. Used by Settings
 * UI to surface "Storage encrypted ✓" / "Plaintext fallback" indicators.
 *
 * @param {string} [sampleKey="auth_session"]  Storage key (without prefix) to
 *   check for a sealed envelope.
 * @returns {{ available: boolean, deviceKeyPresent: boolean, sealed: boolean }}
 */
export function getSecureStorageStatus(sampleKey = "auth_session") {
  const ls = _ls();
  if (!ls) return { available: false, deviceKeyPresent: false, sealed: false };
  let deviceKeyPresent = false;
  let sealed = false;
  try {
    deviceKeyPresent = Boolean(ls.getItem(KEY_NAME));
    const raw = ls.getItem(STORAGE_PREFIX + sampleKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      sealed = Boolean(parsed && parsed.v === ENVELOPE_VERSION && parsed.d);
    }
  } catch {
    /* ignore — corrupt or missing entries fall back to false */
  }
  return { available: true, deviceKeyPresent, sealed };
}

// ══════════════════════════════════════════════════════════════════════════════════════════════════
// §4 — NFC: Web NFC API wrapper (from nfc-session.js §1, S259/S23)
// ══════════════════════════════════════════════════════════════════════════════════════════════════

/** @typedef {{ guestId: string, event: string }} NFCCheckinPayload */

/**
 * True when the Web NFC API (NDEFReader) is available.
 * @returns {boolean}
 */
export function isNFCSupported() {
  return typeof globalThis !== "undefined" && typeof globalThis.NDEFReader === "function";
}

/**
 * Start listening for NDEF records. Calls `onRecord(payload)` for each
 * matching wedding check-in record.
 * @param {(payload: NFCCheckinPayload) => void} onRecord
 * @param {object} [options]
 * @param {string} [options.recordType]
 * @returns {Promise<() => void>}
 */
export async function startNFCScan(onRecord, { recordType = "text" } = {}) {
  if (!isNFCSupported()) throw new Error("Web NFC not supported on this device");
  const NDEFReader = /** @type {any} */ (globalThis.NDEFReader);
  const reader = new NDEFReader();
  const controller = new AbortController();
  reader.addEventListener("reading", (/** @type {any} */ event) => {
    for (const record of event.message.records) {
      if (record.recordType === recordType) {
        try {
          const decoder = new TextDecoder();
          const text = decoder.decode(record.data);
          const payload = /** @type {NFCCheckinPayload} */ (JSON.parse(text));
          if (payload?.guestId && payload?.event === "wedding_checkin") onRecord(payload);
        } catch { /* Unreadable record — ignore */ }
      }
    }
  });
  reader.addEventListener("readingerror", () => {
    console.warn("[NFC] Reading error — scanner still active");
  });
  await reader.scan({ signal: controller.signal });
  return function stopNFCScan() { controller.abort(); };
}

/**
 * Write a wedding check-in record to the NFC tag currently in range.
 * @param {string} guestId
 * @returns {Promise<void>}
 */
export async function writeNFCTag(guestId) {
  if (!isNFCSupported()) throw new Error("Web NFC not supported on this device");
  const NDEFReader = /** @type {any} */ (globalThis.NDEFReader);
  const writer = new NDEFReader();
  const payload = JSON.stringify({ guestId, event: "wedding_checkin" });
  const encoder = new TextEncoder();
  await writer.write({ records: [{ recordType: "text", data: encoder.encode(payload) }] });
}

// ══════════════════════════════════════════════════════════════════════════════════════════════════
// §5 — Check-in session manager (from nfc-session.js §2, S259/S116)
// ══════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {{
 *   id: string, eventId: string, startedAt: number, endedAt?: number | null,
 *   checkIns: Record<string, { ts: number, partySize: number }>, active: boolean,
 * }} CheckinSession
 */

/** @returns {CheckinSession[]} */
function _getSessions() {
  return /** @type {CheckinSession[]} */ (storeGet("checkinSessions") ?? []);
}
/** @param {CheckinSession[]} sessions */
function _saveSessions(sessions) { storeSet("checkinSessions", sessions); }
function _sessionId() { return `ci_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

/** Start a new check-in session. @param {{ eventId?: string }} [opts] @returns {string} */
export function startSession(opts = {}) {
  const session = /** @type {CheckinSession} */ ({
    id: _sessionId(), eventId: opts.eventId ?? "_default",
    startedAt: Date.now(), endedAt: null, checkIns: {}, active: true,
  });
  _saveSessions([..._getSessions(), session]);
  return session.id;
}

/** End an active check-in session. @param {string} sessionId @returns {boolean} */
export function endSession(sessionId) {
  const sessions = _getSessions();
  const idx = sessions.findIndex((s) => s.id === sessionId);
  const _sess = sessions[idx];
  if (idx === -1 || !_sess || !_sess.active) return false;
  sessions[idx] = { ..._sess, active: false, endedAt: Date.now() };
  _saveSessions(sessions);
  return true;
}

/** Get a session by id. @param {string} sessionId @returns {CheckinSession | null} */
export function getSession(sessionId) {
  return _getSessions().find((s) => s.id === sessionId) ?? null;
}

/**
 * Record a guest check-in.
 * @param {string} sessionId
 * @param {string} guestId
 * @param {number} [partySize]
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
  _saveSessions(sessions);
  return "ok";
}

/** @param {string} sessionId @param {string} guestId @returns {boolean} */
export function isCheckedIn(sessionId, guestId) {
  return Boolean(getSession(sessionId)?.checkIns[guestId]);
}

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
  return { guestCount: entries.length, partySize, isActive: session.active, startedAt: session.startedAt };
}
