/**
 * src/services/wa-messaging.js - WhatsApp Business API + message personalization (S270)
 *
 * Merged from:
 *   - whatsapp-business.js (Sprint 38) - WA Cloud API payload builders + config helpers
 *   - message-tools.js     (Sprint 55) - Message personalization bridge + tone picker
 *
 * §1 WA Business API  - isBusinessAPIConfigured, buildApiEndpoint,
 *                        buildTemplatePayload, buildTextPayload, sendTemplateMessage
 * §2 Personalization  - getVariableHints, WEDDING_TEMPLATES, personalizeMessage
 * §3 Tone picker      - MESSAGE_TONES, applyTone, generateToneVariants
 *
 * Named exports only - no window.* side effects, no DOM mutation.
 *
 * @typedef {{
 *   phoneNumberId: string,
 *   accessToken:   string,
 *   apiVersion?:   string,
 * }} WaBusinessConfig
 *
 * @typedef {{
 *   name:        string,
 *   language?:   string,
 *   components?: WaTemplateComponent[],
 * }} WaTemplateRef
 *
 * @typedef {{
 *   type:       "header" | "body" | "button",
 *   parameters: WaTemplateParam[],
 * }} WaTemplateComponent
 *
 * @typedef {{
 *   type:  "text" | "currency" | "date_time" | "image" | "document" | "video",
 *   text?: string,
 * }} WaTemplateParam
 */

import { renderTemplate } from "../utils/message-templates.js";

const DEFAULT_API_VERSION = "v19.0";
const GRAPH_BASE = "https://graph.facebook.com";

// ── §1 WA Business API ─────────────────────────────────────────────────────

/**
 * Return true when all required WhatsApp Business config keys are present
 * and non-empty.
 *
 * @param {Partial<WaBusinessConfig>} config
 * @returns {boolean}
 */
export function isBusinessAPIConfigured(config) {
  return (
    typeof config?.phoneNumberId === "string" &&
    config.phoneNumberId.length > 0 &&
    typeof config?.accessToken === "string" &&
    config.accessToken.length > 0
  );
}

/**
 * Build the Graph API messages endpoint URL for a given config.
 *
 * @param {WaBusinessConfig} config
 * @returns {string}
 */
export function buildApiEndpoint(config) {
  const version = config.apiVersion ?? DEFAULT_API_VERSION;
  return `${GRAPH_BASE}/${version}/${config.phoneNumberId}/messages`;
}

/**
 * Build a WhatsApp Cloud API template message payload.
 *
 * @param {string}           to           Recipient phone number in E.164 format
 * @param {WaTemplateRef}    templateRef  Template name + language + components
 * @returns {object}  JSON-serialisable payload for POST /messages
 */
export function buildTemplatePayload(to, templateRef) {
  return {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateRef.name,
      language: {
        code: templateRef.language ?? "he",
      },
      ...(templateRef.components?.length ? { components: templateRef.components } : {}),
    },
  };
}

/**
 * Build a plain-text message payload.
 *
 * @param {string} to
 * @param {string} text
 * @param {{ previewUrl?: boolean }} [opts]
 * @returns {object}
 */
export function buildTextPayload(to, text, opts = {}) {
  return {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: {
      preview_url: opts.previewUrl ?? false,
      body: text,
    },
  };
}

/**
 * Simulate sending a template message without making a real HTTP request.
 * Useful for preview / dry-run mode and in test environments.
 *
 * Returns a mock API response object that mirrors the real Cloud API shape.
 *
 * @param {string}           to
 * @param {WaTemplateRef}    templateRef
 * @param {WaBusinessConfig} config
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {{ success: boolean, payload: object, endpoint: string, dryRun: boolean }}
 */
export function sendTemplateMessage(to, templateRef, config, opts = {}) {
  const dryRun = opts.dryRun !== false; // default: dry-run for safety
  const payload = buildTemplatePayload(to, templateRef);
  const endpoint = isBusinessAPIConfigured(config) ? buildApiEndpoint(config) : "(not configured)";

  return {
    success: true,
    payload,
    endpoint,
    dryRun,
  };
}

// ── §2 Message personalization ─────────────────────────────────────────────

/**
 * @typedef {{ key: string; label: string; exampleHe: string; exampleEn: string }} VarHint
 */

/** @type {VarHint[]} */
const VAR_HINTS = [
  { key: "name",      label: "{name}",      exampleHe: "ישראל ישראלי",  exampleEn: "John Doe" },
  { key: "firstName", label: "{firstName}", exampleHe: "ישראל",          exampleEn: "John" },
  { key: "date",      label: "{date}",      exampleHe: "15.08.2025",     exampleEn: "08/15/2025" },
  { key: "venue",     label: "{venue}",     exampleHe: "אולם הגנים",     exampleEn: "Garden Hall" },
  { key: "groom",     label: "{groom}",     exampleHe: "יוסף",           exampleEn: "Joseph" },
  { key: "bride",     label: "{bride}",     exampleHe: "מרים",           exampleEn: "Miriam" },
  { key: "tableName", label: "{tableName}", exampleHe: "שולחן 5",        exampleEn: "Table 5" },
  { key: "rsvpLink",  label: "{rsvpLink}",  exampleHe: "https://...",    exampleEn: "https://..." },
];

/**
 * Return all available variable hints for the personalization chip bar.
 * @returns {VarHint[]}
 */
export function getVariableHints() {
  return VAR_HINTS;
}

/**
 * Curated starter templates for WhatsApp invitations.
 * Use `{{var}}` double-brace syntax for renderTemplate().
 * Use `{var}` single-brace syntax for the legacy _interpolate() in whatsapp.js.
 */
export const WEDDING_TEMPLATES = /** @type {const} */ ({
  invite:   `שלום {name}! 🎊\nאנחנו שמחים להזמין אותך לחתונה של {groom} ו-{bride}.\nתאריך: {date}\nמקום: {venue}\nנשמח לראותך שם!`,
  confirm:  `שלום {name}! 🎉\nתודה שאישרת הגעה לחתונה שלנו.\nמחכים לך ב-{date} ב-{venue}.`,
  reminder: `שלום {name}, רק מזכירים - נשמח לדעת אם אתם מגיעים לחתונה ב-{date}!\nאשרו הגעה: {rsvpLink}`,
  table:    `שלום {name}! שולחן {tableName} ממתין לך ב-{venue} ב-{date}.`,
  general:  `חתונה של {groom} ו-{bride}\nתאריך: {date}\nמקום: {venue}`,
});

/**
 * Interpolate a WhatsApp message template.
 *
 * Supports both legacy single-brace `{var}` tokens (used natively in the
 * WhatsApp section's textarea) AND double-brace `{{var}}` tokens (from the
 * message-templates.js engine, including `{{#if var}}...{{/if}}` conditionals).
 *
 * @param {string} template
 * @param {{ id?: string; firstName?: string; lastName?: string; phone?: string; tableId?: string }} guest
 * @param {Record<string, string>} info  - weddingInfo store slice
 * @param {string} [tableName]           - resolved table name for the guest
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
    name:      `${guest.firstName ?? ""} ${guest.lastName ?? ""}`.trim(),
    firstName: guest.firstName ?? "",
    lastName:  guest.lastName ?? "",
    date:      info.date ?? "",
    venue:     info.venue ?? "",
    groom:     info.groom ?? "",
    bride:     info.bride ?? "",
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

// ── §3 Tone picker ─────────────────────────────────────────────────────────

/** @typedef {"formal"|"casual"|"playful"|"minimal"} MessageTone */

/**
 * Available tone keys (stable ordering for UI rendering).
 * @type {readonly MessageTone[]}
 */
export const MESSAGE_TONES = Object.freeze([
  "formal",
  "casual",
  "playful",
  "minimal",
]);

/**
 * Transform a base message string per tone. The base is expected to end in
 * a period or newline; transformer adds prefix/suffix only - never alters
 * substituted variables (e.g. `{guest.name}`).
 *
 * @param {string} base
 * @param {MessageTone} tone
 * @param {"he"|"en"} [lang="he"]
 * @returns {string}
 */
export function applyTone(base, tone, lang = "he") {
  const text = (base ?? "").trim();
  if (!text) return "";
  const isHe = lang === "he";
  switch (tone) {
    case "formal": {
      const prefix = isHe ? "שלום רב,\n" : "Dear guest,\n";
      const suffix = isHe ? "\n\nבברכה,\nהזוג" : "\n\nKind regards,\nThe Couple";
      return `${prefix}${text}${suffix}`;
    }
    case "casual": {
      const prefix = isHe ? "היי 👋\n" : "Hi 👋\n";
      const suffix = isHe ? "\nנשמח לראותכם!" : "\nHope to see you!";
      return `${prefix}${text}${suffix}`;
    }
    case "playful": {
      const prefix = isHe ? "🎉 חתונה בקרוב!\n" : "🎉 Wedding incoming!\n";
      const suffix = isHe ? "\nרק לבוא להתפרע 💃🕺" : "\nCome celebrate with us! 💃🕺";
      return `${prefix}${text}${suffix}`;
    }
    case "minimal":
    default:
      return text.replace(/\s+/g, " ").trim();
  }
}

/**
 * Generate one variant per tone. Returns an ordered map.
 * @param {string} base
 * @param {"he"|"en"} [lang]
 * @returns {Record<MessageTone, string>}
 */
export function generateToneVariants(base, lang = "he") {
  /** @type {Record<MessageTone, string>} */
  const out = /** @type {any} */ ({});
  for (const tone of MESSAGE_TONES) {
    out[tone] = applyTone(base, tone, lang);
  }
  return out;
}
