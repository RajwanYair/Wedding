/**
 * src/utils/pii.js — PII classification & masking utilities (Sprint 18 / Phase 5)
 *
 * Provides:
 *  - DATA_CLASS: sensitivity constants (public / guest-private / admin-sensitive / operational)
 *  - STORE_KEY_CLASSES: data class for each store key
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

// ── Data class constants ──────────────────────────────────────────────────

/**
 * Sensitivity tiers for personal data fields.
 * Maps to the DataClass type in src/types.d.ts.
 *
 * @type {Readonly<Record<"PUBLIC" | "GUEST_PRIVATE" | "ADMIN_SENSITIVE" | "OPERATIONAL", import('../types.js').DataClass>>}
 */
export const DATA_CLASS = Object.freeze({
  PUBLIC:          "public",
  GUEST_PRIVATE:   "guest-private",
  ADMIN_SENSITIVE: "admin-sensitive",
  OPERATIONAL:     "operational",
});

// ── Store key → data class mapping ───────────────────────────────────────

/**
 * Maps every store key to its data sensitivity class.
 * Used by logError to decide what to strip before writing to error_log.
 *
 * @type {Record<string, import('../types.js').DataClass>}
 */
export const STORE_KEY_CLASSES = {
  // PII-heavy keys
  guests:       DATA_CLASS.GUEST_PRIVATE,
  rsvp_log:     DATA_CLASS.GUEST_PRIVATE,
  contacts:     DATA_CLASS.GUEST_PRIVATE,

  // Admin-visible operational data
  tables:       DATA_CLASS.ADMIN_SENSITIVE,
  vendors:      DATA_CLASS.ADMIN_SENSITIVE,
  expenses:     DATA_CLASS.ADMIN_SENSITIVE,
  budget:       DATA_CLASS.ADMIN_SENSITIVE,
  timeline:     DATA_CLASS.ADMIN_SENSITIVE,
  gallery:      DATA_CLASS.ADMIN_SENSITIVE,
  weddingInfo:  DATA_CLASS.ADMIN_SENSITIVE,
  settings:     DATA_CLASS.ADMIN_SENSITIVE,

  // Operational / non-sensitive
  timelineDone: DATA_CLASS.OPERATIONAL,
  lang:         DATA_CLASS.OPERATIONAL,
  theme:        DATA_CLASS.OPERATIONAL,
  version:      DATA_CLASS.OPERATIONAL,

  // Public
  landing:      DATA_CLASS.PUBLIC,
  invitation:   DATA_CLASS.PUBLIC,
};

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
