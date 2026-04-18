/**
 * src/utils/pii.js — PII classification & masking utilities (Sprint 18 / Phase 5)
 *
 * Provides:
 *  - DATA_CLASS: canonical sensitivity constants from src/core/constants.js
 *  - STORE_KEY_CLASSES: data class for each store/localStorage key
 *  - maskPhone(raw): mask phone number leaving last 3 digits
 *  - maskEmail(raw): mask email leaving first char + domain
 *  - maskName(raw): mask name leaving first letter
 *  - classifyRecord(record): returns DATA_CLASS for a guest/vendor object
 *  - redactForLog(record): returns a copy safe for error logs
 *
 * Design rules:
 *  - Only admins may see full PII; guests see masked values in ARIA/logs
 *  - Error logs MUST call redactForLog() before serializing guest data
 *  - No re-identified data shall be sent to Supabase in error payloads
 */

import {
  DATA_CLASS as SHARED_DATA_CLASS,
  STORE_DATA_CLASS,
} from "../core/constants.js";

export const DATA_CLASS = SHARED_DATA_CLASS;

// ── Store key → data class mapping ───────────────────────────────────────

/**
 * Maps store keys and direct localStorage/sessionStorage keys to data sensitivity.
 * Used by logError to decide what to strip before writing to error_log.
 *
 * @type {Record<string, import('../types.js').DataClass>}
 */
export const STORE_KEY_CLASSES = Object.freeze({
  ...STORE_DATA_CLASS,

  // Non-store PII-heavy keys
  rsvp_log:     DATA_CLASS.GUEST_PRIVATE,
  settings:     DATA_CLASS.ADMIN_SENSITIVE,

  // Operational / non-sensitive
  timelineDone: DATA_CLASS.OPERATIONAL,
  lang:         DATA_CLASS.OPERATIONAL,
  theme:        DATA_CLASS.OPERATIONAL,
  version:      DATA_CLASS.OPERATIONAL,

  // Public
  landing:      DATA_CLASS.PUBLIC,
  invitation:   DATA_CLASS.PUBLIC,
});

// ── Masking helpers ───────────────────────────────────────────────────────

/**
 * Mask a phone number, showing only the last 3 digits.
 * Preserves the + prefix if present.
 *
 * @param {string} raw  e.g. "+972541234567" or "054-123-4567"
 * @returns {string}    e.g. "•••••••••567"
 */
export function maskPhone(raw) {
  if (typeof raw !== "string" || !raw.trim()) return "•••";
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 4) return "•••";
  const tail = digits.slice(-3);
  const dots = "•".repeat(Math.max(3, digits.length - 3));
  return `${dots}${tail}`;
}

/**
 * Mask an email address, showing only the first character and domain.
 *
 * @param {string} raw  e.g. "yair@example.com"
 * @returns {string}    e.g. "y•••@example.com"
 */
export function maskEmail(raw) {
  if (typeof raw !== "string" || !raw.trim()) return "•••";
  const atIdx = raw.indexOf("@");
  if (atIdx < 1) return "•••";
  const local = raw.slice(0, atIdx);
  const domain = raw.slice(atIdx);
  const head = local[0] ?? "•";
  const dots = "•".repeat(Math.max(2, local.length - 1));
  return `${head}${dots}${domain}`;
}

/**
 * Mask a full name, showing only the first letter of each part.
 *
 * @param {string} raw  e.g. "Yair Rajwany"
 * @returns {string}    e.g. "Y• R•"
 */
export function maskName(raw) {
  if (typeof raw !== "string" || !raw.trim()) return "•";
  return raw
    .trim()
    .split(/\s+/)
    .map((part) => `${part[0] ?? "•"}•`)
    .join(" ");
}

// ── Record classification ─────────────────────────────────────────────────

/**
 * Classify a data record based on presence of PII fields.
 * Returns the most sensitive DATA_CLASS applicable to the record.
 *
 * @param {Record<string, unknown>} record
 * @returns {import('../types.js').DataClass}
 */
export function classifyRecord(record) {
  if (!record || typeof record !== "object") return DATA_CLASS.OPERATIONAL;

  // Contains phone or email → guest-private
  if ("phone" in record || "email" in record) return DATA_CLASS.GUEST_PRIVATE;

  // Contains financial data → admin-sensitive
  if ("price" in record || "amount" in record || "paid" in record) return DATA_CLASS.ADMIN_SENSITIVE;

  // Default
  return DATA_CLASS.OPERATIONAL;
}

// ── Safe log export ───────────────────────────────────────────────────────

/** Fields that must be redacted before any logging. */
const PII_FIELDS = new Set(["phone", "email", "firstName", "lastName", "first_name", "last_name"]);

/**
 * Return a shallow copy of `record` with PII fields masked.
 * Safe to pass to logError or JSON.stringify for error reporting.
 *
 * @param {Record<string, unknown>} record
 * @returns {Record<string, unknown>}
 */
export function redactForLog(record) {
  if (!record || typeof record !== "object") return record;
  const out = { ...record };
  for (const [key, value] of Object.entries(out)) {
    if (!PII_FIELDS.has(key)) continue;
    if (typeof value !== "string") {
      out[key] = "•••";
      continue;
    }
    if (key === "phone") out[key] = maskPhone(value);
    else if (key === "email") out[key] = maskEmail(value);
    else out[key] = maskName(value);
  }
  return out;
}

/**
 * Return a safe guest summary for display in logs or ARIA announcements.
 * Never includes raw phone, email, or full name.
 *
 * @param {{ id?: string, firstName?: string, lastName?: string, phone?: string, email?: string, status?: string, [key: string]: unknown }} guest
 * @returns {{ id: string, name: string, phone: string, email: string, status: string }}
 */
export function safeGuestSummary(guest) {
  return {
    id:     guest.id    ?? "unknown",
    name:   maskName(`${guest.firstName ?? ""} ${guest.lastName ?? ""}`.trim()),
    phone:  maskPhone(guest.phone  ?? ""),
    email:  maskEmail(guest.email  ?? ""),
    status: String(guest.status ?? "unknown"),
  };
}
