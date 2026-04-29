/**
 * src/services/guest-identity.js — S261 merged guest identity service
 *
 * Merged from:
 *   - contact-dedup.js (Sprint 136) — contact deduplication + merge
 *   - guest-token.js   (Sprint 36)  — RSVP token issuance + validation
 *
 * §1 Contact dedup: jaroSimilarity, findDuplicates, mergeContacts
 * §2 Guest tokens: issueGuestToken, getGuestByToken, revokeToken,
 *    isValidToken, recordIssuedToken, STORAGE_KEYS.REVOKED_TOKENS
 *
 * Named exports only — no window.* side effects.
 */
/**
 * @typedef {{ id: string, firstName: string, lastName: string,
 *   phone?: string, email?: string }} ContactRecord
 * @typedef {{ a: string, b: string, reason: string, score: number }} DuplicatePair
 */

/**
 * Normalise a phone for comparison: digits only.
 * @param {string | undefined} phone
 * @returns {string}
 */
function _normalisePhone(phone) {
  if (!phone) return "";
  return String(phone).replace(/\D/g, "").replace(/^0/, "972");
}

/**
 * Compute Jaro-Winkler similarity (simplified: Jaro only) between two strings.
 * Returns 0–1 where 1 = identical.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function jaroSimilarity(a, b) {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const matchWindow = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  if (matchWindow < 0) return 0;

  const aMatches = Array(a.length).fill(false);
  const bMatches = Array(b.length).fill(false);
  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < a.length; i++) {
    const lo = Math.max(0, i - matchWindow);
    const hi = Math.min(b.length - 1, i + matchWindow);
    for (let j = lo; j <= hi; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  return (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;
}

/**
 * Find potential duplicate contacts.
 * @param {ContactRecord[]} contacts
 * @param {{ phoneThreshold?: number, nameThreshold?: number }} [opts]
 * @returns {DuplicatePair[]}
 */
export function findDuplicates(contacts, { phoneThreshold = 1, nameThreshold = 0.92 } = {}) {
  /** @type {DuplicatePair[]} */
  const pairs = [];
  for (let i = 0; i < contacts.length; i++) {
    for (let j = i + 1; j < contacts.length; j++) {
      const a = contacts[i];
      const b = contacts[j];
      if (!a || !b) continue;

      // Phone match
      const pa = _normalisePhone(a.phone);
      const pb = _normalisePhone(b.phone);
      if (pa && pb && pa === pb) {
        pairs.push({ a: a.id, b: b.id, reason: "phone", score: phoneThreshold });
        continue;
      }

      // Name similarity
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      const score = jaroSimilarity(nameA, nameB);
      if (score >= nameThreshold) {
        pairs.push({ a: a.id, b: b.id, reason: "name", score });
      }
    }
  }
  return pairs;
}

/**
 * Merge contact B into contact A (A wins for non-empty fields).
 * @param {ContactRecord} primary
 * @param {ContactRecord} secondary
 * @returns {ContactRecord}
 */
export function mergeContacts(primary, secondary) {
  return {
    ...secondary,
    ...primary,
    phone: primary.phone || secondary.phone,
    email: primary.email || secondary.email,
  };
}


// ── §2 — Guest token service ───────────────────────────────────────────

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
    const payload = JSON.parse(b64urlDecode(parts[1] ?? ""));
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
  return /** @type {string[]} */ (readBrowserStorageJson(REVOKED_STORE_KEY, []) ?? []);
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

  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  return guests.find((/** @type {any} */ g) => g.id === payload.guestId) ?? null;
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
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const guest = guests.find((/** @type {any} */ g) => g.id === guestId);
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
  const existing = /** @type {Array<{guestId:string,token:string,issuedAt:number}>} */ (storeGet("issuedTokens") ?? []);
  const entry = { guestId, token, issuedAt: Date.now() };
  storeSet("issuedTokens", [...existing, entry]);
}

