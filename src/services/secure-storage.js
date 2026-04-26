/**
 * src/services/secure-storage.js — Encrypted localStorage for tokens & PII (P0)
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

const KEY_NAME = `${STORAGE_PREFIX}device_key`;
const ALGO = "AES-GCM";
const IV_LEN = 12;
const KEY_LEN = 32;
const ENVELOPE_VERSION = 1;

/** @type {Promise<CryptoKey> | null} */
let _keyPromise = null;

// ── base64 helpers (browser + Node) ───────────────────────────────────────

/** @param {Uint8Array} bytes */
function toB64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
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
    return crypto.subtle.importKey("raw", raw, ALGO, false, ["encrypt", "decrypt"]);
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
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ctBuf = await crypto.subtle.encrypt({ name: ALGO, iv }, cryptoKey, plaintext);
  const envelope = JSON.stringify({
    v: ENVELOPE_VERSION,
    iv: toB64(iv),
    ct: toB64(new Uint8Array(ctBuf)),
  });
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

  /** @type {{ v: number, iv: string, ct: string } | null} */
  let env = null;
  try {
    env = JSON.parse(raw);
  } catch {
    /* not JSON */
  }

  if (!env || env.v !== ENVELOPE_VERSION || !env.iv || !env.ct) {
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
    const iv = fromB64(env.iv);
    const ct = fromB64(env.ct);
    const plain = await crypto.subtle.decrypt({ name: ALGO, iv }, cryptoKey, ct);
    return /** @type {T} */ (JSON.parse(new TextDecoder().decode(plain)));
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
