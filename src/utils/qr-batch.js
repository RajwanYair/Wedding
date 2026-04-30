/**
 * QR batch utilities — build deep-link URLs and a printable manifest for
 * per-guest check-in QR codes.
 *
 * Pure functions. The actual QR rendering is delegated to `qr-code.js` (which
 * itself wraps the QR Server / qrserver fallback).
 *
 * @typedef {object} BatchGuest
 * @property {string} id
 * @property {string} [name]
 * @property {string} [phone]
 *
 * @typedef {object} BatchEntry
 * @property {string} id
 * @property {string} [name]
 * @property {string} url       Deep-link URL for the guest.
 * @property {string} payload   Token embedded in the URL.
 *
 * @typedef {object} BatchOptions
 * @property {string} [baseUrl]    Defaults to "https://example.com/checkin".
 * @property {string} [eventId]    Optional event scoping query parameter.
 * @property {string} [param="t"]  Query param name for the token.
 */

/**
 * Encode a guest id into a URL-safe checkin token.
 *
 * @param {string} guestId
 * @param {string} [eventId]
 * @returns {string}
 */
export function encodeToken(guestId, eventId) {
  if (typeof guestId !== "string" || guestId.length === 0) {
    throw new TypeError("guestId must be a non-empty string");
  }
  const raw = eventId ? `${eventId}:${guestId}` : guestId;
  // base64url without padding.
  const b64 = btoa(unescape(encodeURIComponent(raw)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Decode a token back into `{ guestId, eventId? }`.
 *
 * @param {string} token
 * @returns {{ guestId: string, eventId?: string }}
 */
export function decodeToken(token) {
  if (typeof token !== "string" || token.length === 0) {
    throw new TypeError("token must be a non-empty string");
  }
  const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = decodeURIComponent(escape(atob(padded)));
  const idx = raw.indexOf(":");
  if (idx === -1) return { guestId: raw };
  return { eventId: raw.slice(0, idx), guestId: raw.slice(idx + 1) };
}

/**
 * Produce one deep-link URL per guest.
 *
 * @param {ReadonlyArray<BatchGuest>} guests
 * @param {BatchOptions} [opts]
 * @returns {BatchEntry[]}
 */
export function buildBatch(guests, opts = {}) {
  const baseUrl = opts.baseUrl ?? "https://example.com/checkin";
  const param = opts.param ?? "t";
  /** @type {BatchEntry[]} */
  const out = [];
  for (const g of guests) {
    if (!g || typeof g.id !== "string") continue;
    const payload = encodeToken(g.id, opts.eventId);
    const url = new URL(baseUrl);
    url.searchParams.set(param, payload);
    out.push({ id: g.id, name: g.name, url: url.toString(), payload });
  }
  return out;
}

/**
 * Plain-text manifest suitable for printing alongside the QR sheet
 * (one line per guest: name + URL).
 *
 * @param {ReadonlyArray<BatchEntry>} entries
 * @returns {string}
 */
export function manifestText(entries) {
  return entries
    .map((e) => `${e.name ?? e.id}\t${e.url}`)
    .join("\n");
}
