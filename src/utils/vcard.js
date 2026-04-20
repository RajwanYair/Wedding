/**
 * src/utils/vcard.js — vCard 3.0 contact exporter (Sprint 35)
 *
 * Builds RFC 6350-compatible vCard 3.0 strings from guest records.
 * Safe for download links — does not write to the DOM.
 *
 * vCard line-folding rule (RFC 5545 §3.1): lines longer than 75 octets are
 * folded by inserting CRLF + SP at the fold point.
 *
 * Roadmap ref: Phase 4.2 — Guest management enhancements
 */

/**
 * Fold a vCard property line so no line exceeds 75 characters (excluding CRLF).
 * @param {string} line
 * @returns {string}
 */
function _fold(line) {
  if (line.length <= 75) return line;
  let out = "";
  let pos = 0;
  while (pos < line.length) {
    const chunk = line.slice(pos, pos + (pos === 0 ? 75 : 74));
    out += (pos === 0 ? "" : "\r\n ") + chunk;
    pos += chunk.length;
  }
  return out;
}

/**
 * Escape special vCard characters in a text value.
 * @param {string} val
 * @returns {string}
 */
function _esc(val) {
  return String(val ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Build a vCard 3.0 string for a single guest.
 *
 * @param {{
 *   firstName?: string,
 *   lastName?:  string,
 *   phone?:     string,
 *   email?:     string,
 *   notes?:     string,
 * }} guest
 * @returns {string}  UTF-8 vCard 3.0 text
 */
export function buildVCard(guest) {
  const first = _esc(guest.firstName ?? "");
  const last  = _esc(guest.lastName  ?? "");
  const fn    = `${first} ${last}`.trim() || "Unknown";

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    _fold(`FN:${fn}`),
    _fold(`N:${last};${first};;;`),
  ];

  if (guest.phone) {
    lines.push(_fold(`TEL;TYPE=CELL:${_esc(guest.phone)}`));
  }
  if (guest.email) {
    lines.push(_fold(`EMAIL;TYPE=INTERNET:${_esc(guest.email)}`));
  }
  if (guest.notes) {
    lines.push(_fold(`NOTE:${_esc(guest.notes)}`));
  }

  lines.push("END:VCARD");
  return `${lines.join("\r\n")}\r\n`;
}

/**
 * Build a `data:text/vcard` URL for a single guest, suitable for a download link.
 *
 * @param {object} guest
 * @returns {string}  Data URL
 */
export function buildVCardDataUrl(guest) {
  const content = buildVCard(guest);
  return `data:text/vcard;charset=utf-8,${encodeURIComponent(content)}`;
}

/**
 * Build a vCard file that contains multiple guests (one vCard block per guest).
 *
 * @param {object[]} guests
 * @returns {string}  UTF-8 multi-record vCard text
 */
export function buildBulkVCard(guests) {
  return guests.map(buildVCard).join("");
}

/**
 * Suggest a filename for a bulk vCard export.
 *
 * @param {number} count
 * @returns {string}
 */
export function buildBulkVCardFilename(count) {
  return `wedding-guests-${count}.vcf`;
}
