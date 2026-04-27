/**
 * src/services/message-personalizer.js — Message personalization bridge (Sprint 55)
 *
 * Adapts the WhatsApp section's `{var}` placeholder style to the more powerful
 * `{{var}}` / `{{#if var}}...{{/if}}` engine in `src/utils/message-templates.js`.
 *
 * Provides:
 *   personalizeMessage(template, guest, info) — unified interpolation
 *   getVariableHints()                        — metadata for UI chips
 *   WEDDING_TEMPLATES                         — starter template strings (double-brace)
 */

import { renderTemplate } from "../utils/message-templates.js";

// ── Variable registry ──────────────────────────────────────────────────────

/**
 * @typedef {{ key: string; label: string; exampleHe: string; exampleEn: string }} VarHint
 */

/** @type {VarHint[]} */
const VAR_HINTS = [
  { key: "name",     label: "{name}",     exampleHe: "ישראל ישראלי",    exampleEn: "John Doe" },
  { key: "firstName",label: "{firstName}",exampleHe: "ישראל",            exampleEn: "John" },
  { key: "date",     label: "{date}",     exampleHe: "15.08.2025",        exampleEn: "08/15/2025" },
  { key: "venue",    label: "{venue}",    exampleHe: "אולם הגנים",        exampleEn: "Garden Hall" },
  { key: "groom",    label: "{groom}",    exampleHe: "יוסף",              exampleEn: "Joseph" },
  { key: "bride",    label: "{bride}",    exampleHe: "מרים",              exampleEn: "Miriam" },
  { key: "tableName",label: "{tableName}",exampleHe: "שולחן 5",          exampleEn: "Table 5" },
  { key: "rsvpLink", label: "{rsvpLink}", exampleHe: "https://...",       exampleEn: "https://..." },
];

/**
 * Return all available variable hints for the personalization chip bar.
 * @returns {VarHint[]}
 */
export function getVariableHints() {
  return VAR_HINTS;
}

// ── WEDDING_TEMPLATES ──────────────────────────────────────────────────────

/**
 * Curated starter templates for WhatsApp invitations.
 * Use `{{var}}` double-brace syntax for renderTemplate().
 * Use `{var}` single-brace syntax for the legacy _interpolate() in whatsapp.js.
 *
 * These use single-brace syntax so they work with the WhatsApp textarea
 * "paste chip" UX without requiring users to know the double-brace engine.
 */
export const WEDDING_TEMPLATES = /** @type {const} */ ({
  invite: `שלום {name}! 🎊\nאנחנו שמחים להזמין אותך לחתונה של {groom} ו-{bride}.\nתאריך: {date}\nמקום: {venue}\nנשמח לראותך שם!`,
  confirm: `שלום {name}! 🎉\nתודה שאישרת הגעה לחתונה שלנו.\nמחכים לך ב-{date} ב-{venue}.`,
  reminder: `שלום {name}, רק מזכירים - נשמח לדעת אם אתם מגיעים לחתונה ב-{date}!\nאשרו הגעה: {rsvpLink}`,
  table: `שלום {name}! שולחן {tableName} ממתין לך ב-{venue} ב-{date}.`,
  general: `חתונה של {groom} ו-{bride}\nתאריך: {date}\nמקום: {venue}`,
});

// ── personalizeMessage ─────────────────────────────────────────────────────

/**
 * Interpolate a WhatsApp message template.
 *
 * Supports both legacy single-brace `{var}` tokens (used natively in the
 * WhatsApp section's textarea) AND double-brace `{{var}}` tokens (from the
 * message-templates.js engine, including `{{#if var}}...{{/if}}` conditionals).
 *
 * @param {string} template
 * @param {{ id?: string; firstName?: string; lastName?: string; phone?: string; tableId?: string }} guest
 * @param {Record<string, string>} info  — weddingInfo store slice
 * @param {string} [tableName]           — resolved table name for the guest
 * @returns {string}
 */
export function personalizeMessage(template, guest, info, tableName = "") {
  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}`
      : "";
  const rsvpLink = guest.id
    ? `${baseUrl}?guestId=${encodeURIComponent(guest.id)}#rsvp`
    : "";

  const vars = {
    name: `${guest.firstName ?? ""} ${guest.lastName ?? ""}`.trim(),
    firstName: guest.firstName ?? "",
    lastName: guest.lastName ?? "",
    date: info.date ?? "",
    venue: info.venue ?? "",
    groom: info.groom ?? "",
    bride: info.bride ?? "",
    tableName,
    rsvpLink,
  };

  // First, process double-brace conditionals + tokens via the engine
  const afterEngine = renderTemplate(template, vars, { escape: false });

  // Then handle legacy single-brace tokens that may remain
  return afterEngine
    .replace(/\{name\}/g, vars.name)
    .replace(/\{firstName\}/g, vars.firstName)
    .replace(/\{lastName\}/g, vars.lastName)
    .replace(/\{date\}/g, vars.date)
    .replace(/\{venue\}/g, vars.venue)
    .replace(/\{groom\}/g, vars.groom)
    .replace(/\{bride\}/g, vars.bride)
    .replace(/\{tableName\}/g, vars.tableName)
    .replace(/\{rsvpLink\}/g, vars.rsvpLink);
}
