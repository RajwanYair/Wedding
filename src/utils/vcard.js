/**
 * src/utils/vcard.js — vCard 3.0 contact card builder
 *
 * ROADMAP §5 Phase C C1 — "Download contact" per vendor in Vendors section.
 * Pure, side-effect-free, no runtime dependencies.
 *
 * @typedef {{
 *   name?: string,
 *   category?: string,
 *   phone?: string,
 *   contact?: string,
 *   notes?: string,
 *   contractUrl?: string
 * }} VCardSource
 */

/**
 * Escape special characters for vCard text fields.
 * RFC 6350 §3.4 requires backslash-escaping of commas, semicolons and backslashes.
 * @param {string} val
 * @returns {string}
 */
function _esc(val) {
  return val.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/**
 * Build a vCard 3.0 string from a vendor-style object.
 *
 * @param {VCardSource} src
 * @returns {string}
 */
export function buildVCard(src) {
  const fullName = src.name ?? "";
  const org = src.category ?? "";
  const phone = src.phone ?? "";
  const note = [src.notes ?? "", src.contractUrl ? `Contract: ${src.contractUrl}` : ""]
    .filter(Boolean)
    .join(" | ");

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${_esc(fullName)}`,
    `N:${_esc(fullName)};;;;`,
  ];

  if (org) lines.push(`ORG:${_esc(org)}`);
  if (phone) lines.push(`TEL;TYPE=WORK,VOICE:${_esc(phone)}`);
  if (note) lines.push(`NOTE:${_esc(note)}`);
  if (src.contractUrl) lines.push(`URL:${_esc(src.contractUrl)}`);

  lines.push("END:VCARD");
  return lines.join("\r\n");
}

/**
 * Build a `data:` URI for a vCard so it can be used as an `<a href>`.
 * @param {VCardSource} src
 * @returns {string}
 */
export function buildVCardDataUrl(src) {
  const content = buildVCard(src);
  return `data:text/vcard;charset=utf-8,${encodeURIComponent(content)}`;
}

/**
 * Return a safe filename for the vCard download.
 * @param {VCardSource} src
 * @returns {string}
 */
export function getVCardFilename(src) {
  const base = (src.name ?? src.category ?? "contact")
    .trim()
    .replace(/[^\w\u0590-\u05FF\s-]/g, "")
    .replace(/\s+/g, "_");
  return `${base || "contact"}.vcf`;
}
