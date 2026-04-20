/**
 * src/utils/message-personalizer.js — Smart message personalizer (Sprint 37)
 *
 * Higher-level API on top of message-templates.js.
 * Fills guest-specific tokens in WhatsApp/SMS message templates and provides
 * validation helpers so UI can warn authors about unknown or missing tokens.
 *
 * Supported tokens:
 *   {{firstName}}    — guest.firstName
 *   {{lastName}}     — guest.lastName
 *   {{fullName}}     — firstName + lastName
 *   {{phone}}        — guest.phone
 *   {{rsvpLink}}     — weddingInfo.rsvpBaseUrl + ?guestId=...
 *   {{weddingDate}}  — weddingInfo.weddingDate (formatted)
 *   {{venue}}        — weddingInfo.venue
 *   {{tableName}}    — weddingInfo.tableName (optional)
 *   {{guestCount}}   — guest.count
 *
 * Roadmap ref: Phase 4.1 — Communication enhancements
 */

import { renderTemplate } from "./message-templates.js";

// ── Token catalogue ────────────────────────────────────────────────────────

/**
 * All supported token names (without braces).
 * @type {readonly string[]}
 */
const SUPPORTED_TOKENS = Object.freeze([
  "firstName",
  "lastName",
  "fullName",
  "phone",
  "rsvpLink",
  "weddingDate",
  "venue",
  "tableName",
  "guestCount",
]);

/**
 * Return the list of all tokens supported by personalizeMessage.
 * @returns {readonly string[]}
 */
export function getAvailableTokens() {
  return SUPPORTED_TOKENS;
}

// ── Validation ─────────────────────────────────────────────────────────────

/**
 * Validate a template string against the supported token catalogue.
 *
 * @param {string} template
 * @returns {{ valid: boolean, unknownTokens: string[] }}
 */
export function validateTemplate(template) {
  const found = [...template.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
  // Exclude conditional block markers (#if, /if) — they are not data tokens
  const dataTokens = found.filter((t) => !t.startsWith("#") && t !== "if");
  const unknownTokens = [...new Set(dataTokens.filter((t) => !SUPPORTED_TOKENS.includes(t)))];
  return { valid: unknownTokens.length === 0, unknownTokens };
}

// ── Personalisation ────────────────────────────────────────────────────────

/**
 * Build the variable map from a guest record and optional wedding info object.
 *
 * @param {{
 *   firstName?: string,
 *   lastName?:  string,
 *   phone?:     string,
 *   count?:     number,
 *   tableId?:   string,
 * }} guest
 * @param {{
 *   rsvpBaseUrl?:  string,
 *   weddingDate?:  string,
 *   venue?:        string,
 *   tableName?:    string,
 * }} [weddingInfo]
 * @returns {Record<string, string>}
 */
function _buildVars(guest, weddingInfo = {}) {
  const first = guest.firstName ?? "";
  const last  = guest.lastName  ?? "";
  const guestId = guest.id ?? "";

  let rsvpLink = "";
  if (weddingInfo.rsvpBaseUrl) {
    const url = new URL(weddingInfo.rsvpBaseUrl);
    if (guestId) url.searchParams.set("guestId", guestId);
    rsvpLink = url.toString();
  }

  return {
    firstName:   first,
    lastName:    last,
    fullName:    `${first} ${last}`.trim(),
    phone:       guest.phone    ?? "",
    guestCount:  String(guest.count ?? 1),
    rsvpLink,
    weddingDate: weddingInfo.weddingDate ?? "",
    venue:       weddingInfo.venue       ?? "",
    tableName:   weddingInfo.tableName   ?? "",
  };
}

/**
 * Personalise a message template for a single guest.
 *
 * @param {string} template   Template string with `{{token}}` placeholders
 * @param {object} guest      Guest record
 * @param {object} [weddingInfo]  Optional wedding context (date, venue, rsvpBaseUrl, tableName)
 * @param {{ escape?: boolean }} [opts]  Forwarded to renderTemplate
 * @returns {string}
 */
export function personalizeMessage(template, guest, weddingInfo = {}, opts = {}) {
  const vars = _buildVars(guest, weddingInfo);
  return renderTemplate(template, vars, opts);
}

/**
 * Personalise the same template for multiple guests, returning one message per guest.
 *
 * @param {string}   template
 * @param {object[]} guests
 * @param {object}   [weddingInfo]
 * @returns {{ guest: object, message: string }[]}
 */
export function personalizeBulk(template, guests, weddingInfo = {}) {
  return guests.map((g) => ({
    guest:   g,
    message: personalizeMessage(template, g, weddingInfo),
  }));
}
