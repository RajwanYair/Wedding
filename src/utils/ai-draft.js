/**
 * src/utils/ai-draft.js — LLM-agnostic AI message drafting interface
 *
 * S61: Pure prompt-building and response-parsing utilities for AI-assisted
 * message generation. No network calls — all functions build data objects that
 * callers pass to their chosen LLM (OpenAI, Anthropic, local, etc.).
 *
 * Supports Hebrew (RTL) + English output; wedding-specific tones and contexts.
 */

// ── Constants ──────────────────────────────────────────────────────────────

/** Available tone values for drafted messages. */
export const AI_TONES = Object.freeze({
  FORMAL: "formal",
  CASUAL: "casual",
  PLAYFUL: "playful",
  WARM: "warm",
  ELEGANT: "elegant",
});

/** Supported output language codes. */
export const AI_LANGUAGES = Object.freeze({
  HEBREW: "he",
  ENGLISH: "en",
  ARABIC: "ar",
  RUSSIAN: "ru",
});

/** Message context types for system prompt generation. */
export const DRAFT_CONTEXTS = Object.freeze({
  INVITATION: "invitation",
  RSVP_REMINDER: "rsvp_reminder",
  RSVP_CONFIRMATION: "rsvp_confirmation",
  DAY_OF: "day_of",
  THANK_YOU: "thank_you",
  VENDOR_OUTREACH: "vendor_outreach",
});

/** Approximate token ratio: chars ÷ 4 ≈ tokens (rough GPT-3.5/4 estimate). */
const CHARS_PER_TOKEN = 4;

// ── System prompt ──────────────────────────────────────────────────────────

/**
 * Builds a system prompt for a wedding messaging assistant.
 * @param {{ language?: string; tone?: string; coupleName?: string }} opts
 * @returns {string}
 */
export function buildSystemPrompt(opts = {}) {
  const lang = opts.language ?? AI_LANGUAGES.HEBREW;
  const tone = opts.tone ?? AI_TONES.WARM;
  const couple = opts.coupleName ? ` for the wedding of ${opts.coupleName}` : "";
  const rtlNote = lang === AI_LANGUAGES.HEBREW || lang === AI_LANGUAGES.ARABIC
    ? " Write in right-to-left script. Do not mix LTR and RTL characters unnecessarily."
    : "";

  return `You are a warm, professional wedding messaging assistant${couple}. Write all messages in ${lang} with a ${tone} tone. Messages should be concise (under 160 words), personal, and appropriate for WhatsApp.${rtlNote} Never include placeholders — only finalized, ready-to-send text.`;
}

// ── Prompt builders ────────────────────────────────────────────────────────

/**
 * Builds a chat-completion prompt for an invitation message.
 * @param {{
 *   guestName: string;
 *   coupleName: string;
 *   weddingDate: string;
 *   venue: string;
 *   language?: string;
 *   tone?: string;
 *   additionalDetails?: string;
 * }} opts
 * @returns {{ system: string; user: string; context: string }}
 */
export function buildInvitationPrompt(opts) {
  const lang = opts.language ?? AI_LANGUAGES.HEBREW;
  const tone = opts.tone ?? AI_TONES.WARM;
  const extra = opts.additionalDetails ? ` Additional details: ${opts.additionalDetails}.` : "";

  return {
    system: buildSystemPrompt({ language: lang, tone, coupleName: opts.coupleName }),
    user: `Write a WhatsApp wedding invitation message for ${opts.guestName}. `
      + `The wedding is on ${opts.weddingDate} at ${opts.venue}.${extra} `
      + `Include the date, venue, and a warm personal greeting.`,
    context: DRAFT_CONTEXTS.INVITATION,
  };
}

/**
 * Builds a prompt for an RSVP reminder message.
 * @param {{
 *   guestName: string;
 *   coupleName: string;
 *   deadlineDate: string;
 *   language?: string;
 *   tone?: string;
 * }} opts
 * @returns {{ system: string; user: string; context: string }}
 */
export function buildRsvpReminderPrompt(opts) {
  const lang = opts.language ?? AI_LANGUAGES.HEBREW;
  const tone = opts.tone ?? AI_TONES.CASUAL;

  return {
    system: buildSystemPrompt({ language: lang, tone, coupleName: opts.coupleName }),
    user: `Write a friendly RSVP reminder WhatsApp message for ${opts.guestName}. `
      + `They have not yet responded to the invitation. The RSVP deadline is ${opts.deadlineDate}. `
      + `Keep it short, friendly, and not pushy.`,
    context: DRAFT_CONTEXTS.RSVP_REMINDER,
  };
}

/**
 * Builds a prompt for an RSVP confirmation message.
 * @param {{
 *   guestName: string;
 *   coupleName: string;
 *   weddingDate: string;
 *   tableNumber?: number | null;
 *   language?: string;
 *   tone?: string;
 * }} opts
 * @returns {{ system: string; user: string; context: string }}
 */
export function buildRsvpConfirmationPrompt(opts) {
  const lang = opts.language ?? AI_LANGUAGES.HEBREW;
  const tone = opts.tone ?? AI_TONES.WARM;
  const tableInfo = opts.tableNumber != null
    ? ` Their table number is ${opts.tableNumber}.`
    : "";

  return {
    system: buildSystemPrompt({ language: lang, tone, coupleName: opts.coupleName }),
    user: `Write a WhatsApp confirmation message for ${opts.guestName} who confirmed attending `
      + `the wedding of ${opts.coupleName} on ${opts.weddingDate}.${tableInfo} `
      + `Thank them for confirming and express excitement about celebrating together.`,
    context: DRAFT_CONTEXTS.RSVP_CONFIRMATION,
  };
}

/**
 * Builds a prompt for a day-of logistics message.
 * @param {{
 *   guestName: string;
 *   coupleName: string;
 *   weddingDate: string;
 *   venue: string;
 *   startTime: string;
 *   parkingInfo?: string;
 *   language?: string;
 *   tone?: string;
 * }} opts
 * @returns {{ system: string; user: string; context: string }}
 */
export function buildDayOfPrompt(opts) {
  const lang = opts.language ?? AI_LANGUAGES.HEBREW;
  const tone = opts.tone ?? AI_TONES.WARM;
  const parking = opts.parkingInfo ? ` Parking: ${opts.parkingInfo}.` : "";

  return {
    system: buildSystemPrompt({ language: lang, tone, coupleName: opts.coupleName }),
    user: `Write a WhatsApp day-of logistics message for ${opts.guestName}. `
      + `Wedding is today (${opts.weddingDate}) at ${opts.venue}, starting at ${opts.startTime}.${parking} `
      + `Include venue, time, and a celebratory greeting.`,
    context: DRAFT_CONTEXTS.DAY_OF,
  };
}

/**
 * Builds a prompt for a thank-you message after the wedding.
 * @param {{
 *   guestName: string;
 *   coupleName: string;
 *   language?: string;
 *   tone?: string;
 * }} opts
 * @returns {{ system: string; user: string; context: string }}
 */
export function buildThankYouPrompt(opts) {
  const lang = opts.language ?? AI_LANGUAGES.HEBREW;
  const tone = opts.tone ?? AI_TONES.WARM;

  return {
    system: buildSystemPrompt({ language: lang, tone, coupleName: opts.coupleName }),
    user: `Write a heartfelt WhatsApp thank-you message for ${opts.guestName} who attended `
      + `the wedding of ${opts.coupleName}. Thank them for joining the celebration and for any gifts. `
      + `Keep it personal and sincere.`,
    context: DRAFT_CONTEXTS.THANK_YOU,
  };
}

/**
 * Builds a prompt for a vendor outreach message.
 * @param {{
 *   vendorName: string;
 *   coupleName: string;
 *   serviceType: string;
 *   weddingDate: string;
 *   language?: string;
 *   tone?: string;
 * }} opts
 * @returns {{ system: string; user: string; context: string }}
 */
export function buildVendorOutreachPrompt(opts) {
  const lang = opts.language ?? AI_LANGUAGES.ENGLISH;
  const tone = opts.tone ?? AI_TONES.FORMAL;

  return {
    system: buildSystemPrompt({ language: lang, tone, coupleName: opts.coupleName }),
    user: `Write a professional WhatsApp message to ${opts.vendorName}, a ${opts.serviceType} vendor, `
      + `from the couple ${opts.coupleName} for their wedding on ${opts.weddingDate}. `
      + `Inquire about availability and express interest in their services.`,
    context: DRAFT_CONTEXTS.VENDOR_OUTREACH,
  };
}

// ── Response parsing ───────────────────────────────────────────────────────

/**
 * Extracts the message text from a common LLM API response shape.
 * Supports OpenAI chat completions and Anthropic messages format.
 * Returns null if the response shape is unrecognized.
 * @param {unknown} response
 * @returns {string | null}
 */
export function parseAiResponse(response) {
  if (!response || typeof response !== "object") return null;

  const r = /** @type {Record<string, unknown>} */ (response);

  // OpenAI chat completions: { choices: [{ message: { content: "..." } }] }
  if (Array.isArray(r.choices) && r.choices.length > 0) {
    const choice = /** @type {Record<string, unknown>} */ (r.choices[0]);
    const msg = /** @type {Record<string, unknown>} */ (choice.message ?? {});
    if (typeof msg.content === "string") return msg.content.trim();
  }

  // Anthropic messages: { content: [{ type: "text", text: "..." }] }
  if (Array.isArray(r.content) && r.content.length > 0) {
    const first = /** @type {Record<string, unknown>} */ (r.content[0]);
    if (first.type === "text" && typeof first.text === "string") return first.text.trim();
  }

  // Simple { text: "..." } or { message: "..." }
  if (typeof r.text === "string") return r.text.trim();
  if (typeof r.message === "string") return r.message.trim();

  return null;
}

/**
 * Removes common AI-generated noise: markdown formatting, leading/trailing
 * quotes, excess whitespace, and bold/italic markers.
 * @param {string} text
 * @returns {string}
 */
export function sanitizeAiOutput(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")   // **bold**
    .replace(/\*(.+?)\*/g, "$1")        // *italic*
    .replace(/^["']|["']$/g, "")        // leading/trailing quotes
    .replace(/^#+\s*/gm, "")            // markdown headings
    .replace(/\n{3,}/g, "\n\n")         // triple+ newlines → double
    .trim();
}

// ── Token estimation ───────────────────────────────────────────────────────

/**
 * Estimates the token count for a string (rough GPT-style estimate).
 * @param {string} text
 * @returns {number}
 */
export function estimateTokenCount(text) {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Estimates the total token count for a prompt object (system + user).
 * @param {{ system: string; user: string }} prompt
 * @returns {{ systemTokens: number; userTokens: number; totalTokens: number }}
 */
export function estimatePromptTokens(prompt) {
  const systemTokens = estimateTokenCount(prompt.system);
  const userTokens = estimateTokenCount(prompt.user);
  return {
    systemTokens,
    userTokens,
    totalTokens: systemTokens + userTokens,
  };
}

// ── Bulk prompt builder ────────────────────────────────────────────────────

/**
 * Builds an array of invitation prompts for multiple guests in one call.
 * @param {{
 *   guests: Array<{ name: string }>;
 *   coupleName: string;
 *   weddingDate: string;
 *   venue: string;
 *   language?: string;
 *   tone?: string;
 * }} opts
 * @returns {Array<{ guestName: string; prompt: { system: string; user: string; context: string } }>}
 */
export function buildBulkInvitationPrompts(opts) {
  return opts.guests.map(g => ({
    guestName: g.name,
    prompt: buildInvitationPrompt({
      guestName: g.name,
      coupleName: opts.coupleName,
      weddingDate: opts.weddingDate,
      venue: opts.venue,
      language: opts.language,
      tone: opts.tone,
    }),
  }));
}
