/**
 * src/utils/whatsapp-template.js — WhatsApp message template engine
 *
 * S53: Produces ready-to-send WhatsApp deep links and pre-filled message text
 * for wedding-specific events: invitation, RSVP confirmation/decline,
 * reminders, bulk campaigns.
 *
 * All output is plain text suitable for wa.me links.
 * Phone numbers are expected in E.164 format (no "+" prefix for wa.me).
 */

// ── Constants ──────────────────────────────────────────────────────────────

export const WA_BASE_URL = "https://wa.me/";

/**
 * Maximum recommended character length for a WhatsApp message (soft limit).
 * WhatsApp truncates previews at ~1024 chars but messages are not hard-limited.
 */
export const WA_SOFT_LIMIT = 1024;

// ── Text builders ──────────────────────────────────────────────────────────

/**
 * Builds the guest's greeting part (Hebrew-first).
 * @param {string} name
 * @returns {string}
 */
function greeting(name) {
  return name ? `שלום ${name},` : "שלום,";
}

/**
 * Builds a wedding invitation message for a guest.
 * @param {{ name?: string }} guest
 * @param {{ coupleName?: string; date?: string; venue?: string; rsvpUrl?: string }} weddingInfo
 * @returns {string}
 */
export function buildWaInvitationText(guest, weddingInfo = {}) {
  const { coupleName = "", date = "", venue = "", rsvpUrl = "" } = weddingInfo;
  const lines = [greeting(guest.name ?? "")];
  if (coupleName) lines.push(`אנו שמחים להזמינך לחתונה של ${coupleName}`);
  if (date) lines.push(`📅 תאריך: ${date}`);
  if (venue) lines.push(`📍 מקום: ${venue}`);
  if (rsvpUrl) lines.push(`\nאנא אשר/י הגעתך:\n${rsvpUrl}`);
  lines.push("\nנשמח לראותך!");
  return lines.join("\n");
}

/**
 * Builds an RSVP confirmed thank-you message.
 * @param {{ name?: string; partySize?: number }} guest
 * @returns {string}
 */
export function buildWaRsvpConfirmText(guest) {
  const name = guest.name ?? "";
  const size = guest.partySize ?? 1;
  const sizeNote = size > 1 ? ` ל-${size} אורחים` : "";
  return [
    greeting(name),
    `תודה על אישור הגעתך${sizeNote}! 🎉`,
    "אנו מצפים לראותך בשמחה.",
  ].join("\n");
}

/**
 * Builds an RSVP declined acknowledgment message.
 * @param {{ name?: string }} guest
 * @returns {string}
 */
export function buildWaRsvpDeclineText(guest) {
  const name = guest.name ?? "";
  return [
    greeting(name),
    "תודה על הידיעה. חבל שלא תוכל/י להגיע.",
    "נשמח לחגוג איתך בהזדמנות הבאה! 💙",
  ].join("\n");
}

/**
 * Builds a reminder message for guests who have not yet RSVP'd.
 * @param {{ name?: string }} guest
 * @param {number} daysLeft  Days remaining until RSVP deadline
 * @param {{ rsvpUrl?: string }} [opts]
 * @returns {string}
 */
export function buildWaReminderText(guest, daysLeft, opts = {}) {
  const name = guest.name ?? "";
  const dayWord = daysLeft === 1 ? "יום אחד" : `${daysLeft} ימים`;
  const lines = [
    greeting(name),
    `תזכורת ידידותית: נותרו ${dayWord} בלבד לאשר הגעה לאירוע שלנו! ⏰`,
  ];
  if (opts.rsvpUrl) lines.push(`אנא אשר/י כאן:\n${opts.rsvpUrl}`);
  return lines.join("\n");
}

/**
 * Builds a day-of-event logistics message.
 * @param {{ name?: string }} guest
 * @param {{ venue?: string; time?: string; parkingInfo?: string }} [eventInfo]
 * @returns {string}
 */
export function buildWaDayOfText(guest, eventInfo = {}) {
  const name = guest.name ?? "";
  const { venue = "", time = "", parkingInfo = "" } = eventInfo;
  const lines = [greeting(name), "מחכים לך היום! 🎊"];
  if (time) lines.push(`🕐 שעת האירוע: ${time}`);
  if (venue) lines.push(`📍 כתובת: ${venue}`);
  if (parkingInfo) lines.push(`🚗 חניה: ${parkingInfo}`);
  return lines.join("\n");
}

// ── URL builder ────────────────────────────────────────────────────────────

/**
 * Builds a wa.me deep link for a phone number and optional pre-filled text.
 * @param {string} phone E.164-style digits without "+" (e.g. "972541234567")
 * @param {string} [text] Pre-filled message text
 * @returns {string}
 */
export function buildWaLink(phone, text) {
  const base = `${WA_BASE_URL}${phone}`;
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

/**
 * Builds a wa.me deep link with a pre-filled invitation message.
 * @param {string} phone
 * @param {{ name?: string }} guest
 * @param {{ coupleName?: string; date?: string; venue?: string; rsvpUrl?: string }} weddingInfo
 * @returns {string}
 */
export function buildWaInvitationLink(phone, guest, weddingInfo) {
  const text = buildWaInvitationText(guest, weddingInfo);
  return buildWaLink(phone, text);
}

// ── Bulk helpers ───────────────────────────────────────────────────────────

/**
 * @typedef {"invitation" | "confirm" | "decline" | "reminder" | "dayof"} WaMessageType
 */

/**
 * @typedef {{ name?: string; phone?: string; partySize?: number }} WaGuest
 */

/**
 * Builds a batch of WhatsApp messages for multiple guests.
 * Guests without a phone number are skipped (returned in `skipped`).
 * @param {WaGuest[]} guests
 * @param {WaMessageType} type
 * @param {object} [opts]
 * @param {{ coupleName?: string; date?: string; venue?: string; rsvpUrl?: string }} [opts.weddingInfo]
 * @param {number} [opts.daysLeft]
 * @param {{ venue?: string; time?: string; parkingInfo?: string }} [opts.eventInfo]
 * @returns {{ messages: Array<{ phone: string; text: string; link: string }>; skipped: WaGuest[] }}
 */
export function buildWaBulkMessages(guests, type, opts = {}) {
  const { weddingInfo = {}, daysLeft = 7, eventInfo = {} } = opts;
  const messages = [];
  const skipped = [];

  for (const guest of guests) {
    if (!guest.phone) {
      skipped.push(guest);
      continue;
    }
    let text = "";
    switch (type) {
      case "invitation":
        text = buildWaInvitationText(guest, weddingInfo);
        break;
      case "confirm":
        text = buildWaRsvpConfirmText(guest);
        break;
      case "decline":
        text = buildWaRsvpDeclineText(guest);
        break;
      case "reminder":
        text = buildWaReminderText(guest, daysLeft, {
          rsvpUrl: weddingInfo.rsvpUrl,
        });
        break;
      case "dayof":
        text = buildWaDayOfText(guest, eventInfo);
        break;
      default:
        skipped.push(guest);
        continue;
    }
    messages.push({
      phone: guest.phone,
      text,
      link: buildWaLink(guest.phone, text),
    });
  }

  return { messages, skipped };
}

/**
 * Returns true if a message text exceeds the soft character limit.
 * @param {string} text
 * @returns {boolean}
 */
export function isOverLimit(text) {
  return text.length > WA_SOFT_LIMIT;
}

/**
 * Truncates a message to the soft limit, appending "…" if cut.
 * @param {string} text
 * @param {number} [limit]
 * @returns {string}
 */
export function truncateWaMessage(text, limit = WA_SOFT_LIMIT) {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1)}\u2026`;
}
