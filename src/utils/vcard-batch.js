/**
 * vCard 4.0 batch export — produce a multi-contact `.vcf` document from a
 * guest list. Compatible with iOS Contacts, Android, Outlook.
 *
 * Pure functions; no I/O.
 *
 * @typedef {object} VcardGuest
 * @property {string} id
 * @property {string} [name]
 * @property {string} [phone]
 * @property {string} [email]
 * @property {string} [organization]
 * @property {string} [note]
 */

const CRLF = "\r\n";

/**
 * Escape vCard TEXT-typed values per RFC 6350 §3.4.
 *
 * @param {unknown} v
 * @returns {string}
 */
export function escapeValue(v) {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/**
 * Fold a long line at 75 octets per RFC 6350 §3.2.
 *
 * @param {string} line
 * @returns {string}
 */
export function foldLine(line) {
  if (line.length <= 75) return line;
  const out = [line.slice(0, 75)];
  let i = 75;
  while (i < line.length) {
    out.push(` ${line.slice(i, i + 74)}`);
    i += 74;
  }
  return out.join(CRLF);
}

/**
 * Build a single vCard for one guest. Returns an empty string when no
 * usable contact information is present.
 *
 * @param {VcardGuest} guest
 * @returns {string}
 */
export function buildVcard(guest) {
  if (!guest || typeof guest.id !== "string") return "";
  const hasContact =
    typeof guest.name === "string" ||
    typeof guest.phone === "string" ||
    typeof guest.email === "string";
  if (!hasContact) return "";

  const lines = [
    "BEGIN:VCARD",
    "VERSION:4.0",
    `UID:${escapeValue(guest.id)}`,
  ];
  const name = guest.name ?? "";
  lines.push(`FN:${escapeValue(name)}`);
  lines.push(`N:${escapeValue(name)};;;;`);
  if (guest.phone) lines.push(`TEL;TYPE=cell:${escapeValue(guest.phone)}`);
  if (guest.email) lines.push(`EMAIL:${escapeValue(guest.email)}`);
  if (guest.organization) lines.push(`ORG:${escapeValue(guest.organization)}`);
  if (guest.note) lines.push(`NOTE:${escapeValue(guest.note)}`);
  lines.push("END:VCARD");
  return lines.map(foldLine).join(CRLF);
}

/**
 * Build a batch `.vcf` document from many guests.
 *
 * @param {ReadonlyArray<VcardGuest>} guests
 * @returns {string}
 */
export function buildBatch(guests) {
  const cards = [];
  for (const g of guests) {
    const card = buildVcard(g);
    if (card.length > 0) cards.push(card);
  }
  return cards.length > 0 ? `${cards.join(CRLF)}${CRLF}` : "";
}
