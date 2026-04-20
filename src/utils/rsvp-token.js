/**
 * rsvp-token.js — Per-guest RSVP link token builder (Phase 3.2)
 *
 * Generates unique, URL-safe tokens for each guest so RSVP links can be
 * personalised and tracked through the 6-stage funnel:
 *   invited → link_sent → link_clicked → form_started → confirmed → checked_in
 *
 * Tokens are signed with HMAC-SHA256 when a secret is provided.
 * Without a secret, an unsigned (random) token is returned.
 *
 * Format:  <base64url-random-16-bytes>[.<hmac-8-bytes>]
 *
 * Pure async functions — no DOM, no store, no module-level state.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOKEN_BYTE_LENGTH = 16;
const HMAC_BYTE_LENGTH = 8; // truncated HMAC (first 8 bytes)
const ALGO = { name: "HMAC", hash: "SHA-256" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a Uint8Array to a URL-safe base64 string.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function _toBase64Url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Convert a URL-safe base64 string back to Uint8Array.
 * @param {string} b64url
 * @returns {Uint8Array}
 */
function _fromBase64Url(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

// ---------------------------------------------------------------------------
// Token generation
// ---------------------------------------------------------------------------

/**
 * Generate a random URL-safe token (unsigned).
 * @returns {string}
 */
export function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTE_LENGTH));
  return _toBase64Url(bytes);
}

/**
 * Generate a signed RSVP token for a guest.
 * The payload is `${guestId}:${eventId}` — short, reversible with the secret.
 *
 * @param {string} guestId
 * @param {string} eventId
 * @param {string} secret   HMAC signing secret (any non-empty string)
 * @returns {Promise<string>}  `<randomPart>.<hmacPart>`
 */
export async function generateSignedToken(guestId, eventId, secret) {
  const random = generateToken();
  const payload = `${guestId}:${eventId}:${random}`;

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    ALGO,
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(ALGO, keyMaterial, enc.encode(payload));
  const truncated = new Uint8Array(sig, 0, HMAC_BYTE_LENGTH);
  return `${random}.${_toBase64Url(truncated)}`;
}

/**
 * Verify a signed RSVP token.
 * @param {string} token   Full token string `<randomPart>.<hmacPart>`
 * @param {string} guestId
 * @param {string} eventId
 * @param {string} secret
 * @returns {Promise<boolean>}
 */
export async function verifySignedToken(token, guestId, eventId, secret) {
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex < 0) return false;

  const randomPart = token.slice(0, dotIndex);
  const hmacPart = token.slice(dotIndex + 1);
  const payload = `${guestId}:${eventId}:${randomPart}`;

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    ALGO,
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(ALGO, keyMaterial, enc.encode(payload));
  const expected = _toBase64Url(new Uint8Array(sig, 0, HMAC_BYTE_LENGTH));
  return expected === hmacPart;
}

// ---------------------------------------------------------------------------
// Link building
// ---------------------------------------------------------------------------

/**
 * Build a full RSVP URL with an embedded token.
 * @param {string} baseUrl   The RSVP base URL (e.g. 'https://example.com/rsvp')
 * @param {string} token
 * @param {string} [guestId]  Optional guest ID appended as a query param
 * @returns {string}
 */
export function buildRsvpLink(baseUrl, token, guestId) {
  const url = new URL(baseUrl);
  url.searchParams.set("t", token);
  if (guestId) url.searchParams.set("g", guestId);
  return url.toString();
}

/**
 * Extract the token from an RSVP URL.
 * @param {string} url
 * @returns {{ token: string | null, guestId: string | null }}
 */
export function parseRsvpLink(url) {
  try {
    const parsed = new URL(url);
    return {
      token: parsed.searchParams.get("t"),
      guestId: parsed.searchParams.get("g"),
    };
  } catch {
    return { token: null, guestId: null };
  }
}

// ---------------------------------------------------------------------------
// Bulk helpers
// ---------------------------------------------------------------------------

/**
 * Generate unsigned tokens for a list of guests in one call.
 * @param {Array<{ id: string }>} guests
 * @returns {Array<{ guestId: string, token: string }>}
 */
export function generateBulkTokens(guests) {
  return guests.map((g) => ({ guestId: g.id, token: generateToken() }));
}

/**
 * Generate signed tokens for a list of guests.
 * @param {Array<{ id: string }>} guests
 * @param {string} eventId
 * @param {string} secret
 * @returns {Promise<Array<{ guestId: string, token: string }>>}
 */
export async function generateBulkSignedTokens(guests, eventId, secret) {
  return Promise.all(
    guests.map(async (g) => ({
      guestId: g.id,
      token: await generateSignedToken(g.id, eventId, secret),
    })),
  );
}
