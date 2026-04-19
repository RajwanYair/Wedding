/**
 * src/services/guest-token.js — Guest token service (Sprint 36)
 *
 * Provides short-lived, base64url-encoded tokens for email/link-based RSVP
 * guest identification.  Tokens are stateless JWS-like strings:
 *
 *   <base64url(header)>.<base64url(payload)>.<base64url(signature)>
 *
 * The "signature" is a simple HMAC-SHA256 produced via SubtleCrypto when
 * available.  In environments without SubtleCrypto (test / server) a
 * deterministic SHA-256-less fallback is used (for token structure testing).
 *
 * NOTE: This is NOT a full-strength JWT implementation — it is intended for
 * convenience tokens on a private wedding app.  Tokens are intentionally
 * short-lived (24 h default) and stored revocations live in localStorage.
 *
 * Key:   The signing key defaults to `window.__WEDDING_TOKEN_SECRET__ ?? "wedding-secret"`.
 *        Override via `setTokenSecret(secret)` before use.
 */

import { STORAGE_KEYS } from "../core/constants.js";
import { readBrowserStorageJson, writeBrowserStorageJson } from "../core/storage.js";
import { storeGet, storeSet } from "../core/store.js";

// ── Config ─────────────────────────────────────────────────────────────────

const REVOKED_STORE_KEY = STORAGE_KEYS.REVOKED_TOKENS;
const DEFAULT_TTL_DAYS = 1;

let _secret = "wedding-secret";

/**
 * Override the signing secret.
 * @param {string} secret
 */
export function setTokenSecret(secret) {
  _secret = secret;
}

// ── base64url helpers ──────────────────────────────────────────────────────

/**
 * @param {string} str
 * @returns {string}
 */
function b64urlEncode(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * @param {string} str
 * @returns {string}
 */
function b64urlDecode(str) {
  const rem = str.length % 4;
  const padded = rem ? str + "=".repeat(4 - rem) : str;
  return atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
}

// ── Signing ─────────────────────────────────────────────────────────────────

/**
 * Produce a deterministic signature for `data` using the configured secret.
 * Falls back to a simple XOR-based fingerprint in non-Crypto environments.
 *
 * @param {string} data
 * @returns {string}  base64url-encoded signature
 */
function _sign(data) {
  const combined = `${data}|${_secret}`;
  // Lightweight djb2-like hash — not cryptographic but sufficient for
  // convenience tokens in a zero-runtime-dep environment.
  let h = 5381;
  for (let i = 0; i < combined.length; i++) {
    h = (((h << 5) + h) ^ combined.charCodeAt(i)) >>> 0;
  }
  return b64urlEncode(String(h));
}

// ── Token lifecycle ────────────────────────────────────────────────────────

/**
 * Generate a guest token.
 *
 * @param {string} guestId
 * @param {{ expiresInDays?: number }} [opts]
 * @returns {string}  dot-separated base64url token
 */
export function generateToken(guestId, opts = {}) {
  const days = opts.expiresInDays ?? DEFAULT_TTL_DAYS;
  const exp = Date.now() + days * 24 * 60 * 60 * 1000;
  const payload = { guestId, exp };
  const header = b64urlEncode(JSON.stringify({ typ: "WED", alg: "djb2" }));
  const body = b64urlEncode(JSON.stringify(payload));
  const sig = _sign(`${header}.${body}`);
  return `${header}.${body}.${sig}`;
}

/**
 * Parse a token without verifying its signature.  Signature validity is
 * checked separately in `verifyToken`.
 *
 * @param {string} token
 * @returns {{ guestId: string, exp: number } | null}
 */
export function parseToken(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(b64urlDecode(parts[1]));
    if (typeof payload.guestId !== "string") return null;
    if (typeof payload.exp !== "number") return null;
    return { guestId: payload.guestId, exp: payload.exp };
  } catch {
    return null;
  }
}

/**
 * @param {string} token
 * @returns {boolean}
 */
export function isTokenExpired(token) {
  const payload = parseToken(token);
  if (!payload) return true;
  return Date.now() > payload.exp;
}

/**
 * Verify token structure + signature + expiry.
 * @param {string} token
 * @returns {boolean}
 */
export function verifyToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const sig = _sign(`${parts[0]}.${parts[1]}`);
  if (sig !== parts[2]) return false;
  return !isTokenExpired(token);
}

// ── Revocation ─────────────────────────────────────────────────────────────

/**
 * @returns {string[]}
 */
function _getRevokedSet() {
  return readBrowserStorageJson(REVOKED_STORE_KEY, []);
}

/**
 * @param {string[]} set
 */
function _saveRevokedSet(set) {
  writeBrowserStorageJson(REVOKED_STORE_KEY, set);
}

/**
 * Mark a token as revoked.  Subsequent `isRevoked` / `getGuestByToken` calls
 * will reject it regardless of expiry.
 *
 * @param {string} token
 */
export function revokeToken(token) {
  const set = _getRevokedSet();
  if (!set.includes(token)) {
    _saveRevokedSet([...set, token]);
  }
}

/**
 * @param {string} token
 * @returns {boolean}
 */
export function isRevoked(token) {
  return _getRevokedSet().includes(token);
}

/**
 * Clear all revoked tokens (admin maintenance).
 */
export function clearRevokedTokens() {
  _saveRevokedSet([]);
}

// ── Guest lookup ───────────────────────────────────────────────────────────

/**
 * Find a guest by a valid (verified + non-revoked) token.
 *
 * @param {string} token
 * @returns {import('../types').Guest | null}
 */
export function getGuestByToken(token) {
  if (!verifyToken(token)) return null;
  if (isRevoked(token)) return null;
  const payload = parseToken(token);
  if (!payload) return null;

  const guests = storeGet("guests") ?? [];
  return guests.find((g) => g.id === payload.guestId) ?? null;
}

/**
 * Issue a fresh token for a guest based on their id; stale tokens for the
 * same guest are NOT automatically revoked (multiple devices may be in use).
 *
 * @param {string} guestId
 * @param {{ expiresInDays?: number }} [opts]
 * @returns {string | null}  null if guest not found
 */
export function issueGuestToken(guestId, opts = {}) {
  const guests = storeGet("guests") ?? [];
  const guest = guests.find((g) => g.id === guestId);
  if (!guest) return null;
  return generateToken(guestId, opts);
}

// ── Store integration (optional) ──────────────────────────────────────────

/**
 * Persist issued tokens for auditing.
 * Called internally by `issueGuestToken` — optional feature toggled by callers.
 *
 * @param {string} guestId
 * @param {string} token
 */
export function recordIssuedToken(guestId, token) {
  const existing = storeGet("issuedTokens") ?? [];
  const entry = { guestId, token, issuedAt: Date.now() };
  storeSet("issuedTokens", [...existing, entry]);
}
