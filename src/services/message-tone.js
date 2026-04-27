/**
 * src/services/message-tone.js — S111 AI message draft tone picker.
 *
 * Generates RSVP/WhatsApp message variants from a single base template by
 * applying tone transformations. Pure ESM, deterministic, locale-aware.
 *
 * Tones:
 *   - "formal"   — uses "אתם מוזמנים" / "You are cordially invited"
 *   - "casual"   — drops honorifics, adds emoji
 *   - "playful"  — exclamation marks + party emoji
 *   - "minimal"  — single-line bare facts
 *
 * The functions here are deliberately rule-based (no LLM call). A future
 * sprint may swap in a remote AI endpoint behind the same signature.
 */

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
 * a period or newline; transformer adds prefix/suffix only — never alters
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
