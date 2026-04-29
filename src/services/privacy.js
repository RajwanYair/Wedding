/**
 * src/services/privacy.js — Unified privacy service (S229)
 *
 * Merged from:
 *   - data-classification.js  (S62)  — PII field classification policy
 *   - pii-storage.js          (S157) — encrypted PII read/write helpers
 *   - gdpr-erasure.js         (S86)  — GDPR right-to-erasure
 */

import { STORE_DATA_CLASS, DATA_CLASS } from "../core/constants.js";
import { STORAGE_PREFIX } from "../core/config.js";
import { getActiveEventId } from "../core/state.js";
import { setSecure, getSecure } from "./secure-storage.js";

// ══════════════════════════════════════════════════════════════════════════
// §1 — Data classification (merged from data-classification.js, S62)
// ══════════════════════════════════════════════════════════════════════════

/**
 * @typedef {"public"|"internal"|"pii"|"sensitive"} ClassificationLevel
 * @typedef {Record<string, ClassificationLevel>} DomainPolicy
 */

/** @type {Record<string, DomainPolicy>} */
const CLASSIFICATION_POLICY = {
  guest: {
    id: "internal",
    firstName: "pii",
    lastName: "pii",
    phone: "pii",
    email: "pii",
    count: "public",
    children: "public",
    status: "internal",
    side: "internal",
    group: "internal",
    meal: "internal",
    mealNotes: "sensitive",
    accessibility: "sensitive",
    transport: "internal",
    tableId: "internal",
    gift: "internal",
    notes: "pii",
    sent: "internal",
    checkedIn: "internal",
    rsvpDate: "internal",
    createdAt: "internal",
    updatedAt: "internal",
  },
  table: {
    id: "internal",
    name: "internal",
    capacity: "internal",
    shape: "internal",
  },
  vendor: {
    id: "internal",
    name: "internal",
    category: "internal",
    contact: "pii",
    phone: "pii",
    price: "internal",
    paid: "internal",
    notes: "internal",
    createdAt: "internal",
    updatedAt: "internal",
  },
  expense: {
    id: "internal",
    category: "internal",
    description: "internal",
    amount: "internal",
    date: "internal",
    createdAt: "internal",
  },
  contact: {
    id: "internal",
    name: "pii",
    phone: "pii",
    email: "pii",
    message: "pii",
    createdAt: "internal",
  },
};

/**
 * Get the classification level for a specific domain field.
 * @param {string} domain
 * @param {string} field
 * @returns {ClassificationLevel|undefined}
 */
export function getFieldClassification(domain, field) {
  return CLASSIFICATION_POLICY[domain]?.[field];
}

/**
 * Whether a field is personally identifiable information (PII) or sensitive.
 * @param {string} domain
 * @param {string} field
 * @returns {boolean}
 */
export function isPII(domain, field) {
  const level = getFieldClassification(domain, field);
  return level === "pii" || level === "sensitive";
}

/**
 * Get all field names at or above the given classification level for a domain.
 * @param {string} domain
 * @param {ClassificationLevel} minLevel
 * @returns {string[]}
 */
export function getFieldsByClassification(domain, minLevel) {
  const policy = CLASSIFICATION_POLICY[domain];
  if (!policy) return [];
  const levels = ["sensitive", "pii", "internal", "public"];
  const minIdx = levels.indexOf(minLevel);
  if (minIdx === -1) return [];
  return Object.entries(policy)
    .filter(([, level]) => levels.indexOf(level) <= minIdx)
    .map(([field]) => field);
}

/**
 * Return all PII + sensitive fields for a domain.
 * @param {string} domain
 * @returns {string[]}
 */
export function getPIIFields(domain) {
  return getFieldsByClassification(domain, "pii");
}

/**
 * Return only sensitive fields for a domain.
 * @param {string} domain
 * @returns {string[]}
 */
export function getSensitiveFields(domain) {
  return getFieldsByClassification(domain, "sensitive");
}

/**
 * List all registered domain names.
 * @returns {string[]}
 */
export function listDomains() {
  return Object.keys(CLASSIFICATION_POLICY);
}

/**
 * Redact (null out) all PII and sensitive fields on an object copy.
 * @template {Record<string, unknown>} T
 * @param {string} domain
 * @param {T} obj
 * @returns {T}
 */
export function redactPII(domain, obj) {
  const piiFields = getPIIFields(domain);
  const copy = /** @type {T} */ ({ ...obj });
  for (const field of piiFields) {
    if (Object.hasOwn(copy, field)) {
      copy[field] = null;
    }
  }
  return copy;
}

// ══════════════════════════════════════════════════════════════════════════
// §2 — PII storage (merged from pii-storage.js, S157)
// ══════════════════════════════════════════════════════════════════════════

/** Classes that require encryption at rest */
const _ENCRYPTED_CLASSES = new Set([DATA_CLASS.ADMIN_SENSITIVE, DATA_CLASS.GUEST_PRIVATE]);

/**
 * Check if a store key holds PII and should be encrypted.
 * @param {string} key  Store domain key (e.g. "guests", "vendors")
 * @returns {boolean}
 */
export function isPiiKey(key) {
  return _ENCRYPTED_CLASSES.has(/** @type {any} */ (STORE_DATA_CLASS[key]));
}

/**
 * Storage prefix scoped to the active event.
 * @returns {string}
 */
function _prefix() {
  const eid = getActiveEventId();
  return eid === "default" ? STORAGE_PREFIX : `${STORAGE_PREFIX}evt_${eid}_`;
}

/**
 * Full localStorage key for a store domain.
 * @param {string} storageKey
 * @returns {string}
 */
function _fullKey(storageKey) {
  return _prefix() + storageKey;
}

/**
 * Encrypt and persist a PII value. Fire-and-forget.
 * @param {string} storageKey
 * @param {unknown} value
 */
export function savePii(storageKey, value) {
  const secureKey = `enc_${_fullKey(storageKey)}`;
  setSecure(secureKey, value).catch(() => {});
}

/**
 * Load a PII value: try encrypted storage first, then fall back to plaintext.
 * @template T
 * @param {string} storageKey
 * @param {T} fallback
 * @returns {Promise<T>}
 */
export async function loadPii(storageKey, fallback) {
  const secureKey = `enc_${_fullKey(storageKey)}`;
  const encrypted = await getSecure(secureKey).catch(() => null);
  if (encrypted !== null && encrypted !== undefined) {
    return /** @type {T} */ (encrypted);
  }
  const fullKey = _fullKey(storageKey);
  try {
    const raw = localStorage.getItem(fullKey);
    if (raw === null) return fallback;
    const parsed = /** @type {T} */ (JSON.parse(raw));
    setSecure(secureKey, parsed).catch(() => {});
    try { localStorage.removeItem(fullKey); } catch { /* ignore */ }
    return parsed;
  } catch {
    return fallback;
  }
}

/**
 * Migrate all PII keys from plaintext to encrypted storage in one pass.
 * @param {Map<string, string>} persistMap  state-key → storageKey map
 * @returns {Promise<number>} Number of keys migrated
 */
export async function migratePlaintextPii(persistMap) {
  let migrated = 0;
  for (const [stateKey, storageKey] of persistMap) {
    if (!isPiiKey(stateKey)) continue;
    const secureKey = `enc_${_fullKey(storageKey)}`;
    const existing = await getSecure(secureKey).catch(() => null);
    if (existing !== null && existing !== undefined) continue;
    const fullKey = _fullKey(storageKey);
    try {
      const raw = localStorage.getItem(fullKey);
      if (raw === null) continue;
      const parsed = JSON.parse(raw);
      await setSecure(secureKey, parsed);
      localStorage.removeItem(fullKey);
      migrated++;
    } catch {
      /* skip broken entries */
    }
  }
  return migrated;
}

// ══════════════════════════════════════════════════════════════════════════
// §3 — GDPR erasure (merged from gdpr-erasure.js, S86)
// ══════════════════════════════════════════════════════════════════════════

/** @typedef {import("@supabase/supabase-js").SupabaseClient} SupabaseClient */

/**
 * PII columns that must be nullified for GDPR erasure.
 * Derived from the classification policy above (pii + sensitive).
 */
export const PII_COLUMNS = [
  "first_name",
  "last_name",
  "phone",
  "email",
  "notes",
  "meal_notes",
  "accessibility",
  "gift",
];

/**
 * Erase all PII for a guest.
 * @param {SupabaseClient} supabase
 * @param {string} guestId
 * @param {{ requestedBy?: string }} [opts]
 * @returns {Promise<void>}
 */
export async function eraseGuest(supabase, guestId, opts = {}) {
  /** @type {Record<string, null | string>} */
  const nullPatch = Object.fromEntries(PII_COLUMNS.map((c) => [c, null]));
  nullPatch.erased_at = new Date().toISOString();

  const { error: updateError } = await supabase.from("guests").update(nullPatch).eq("id", guestId);
  if (updateError) throw updateError;

  const { error: logError } = await supabase.from("erasure_log").insert({
    entity_type: "guest",
    entity_id: guestId,
    requested_by: opts.requestedBy ?? null,
    erased_at: nullPatch.erased_at,
  });
  if (logError) throw logError;
}

/**
 * Check if a guest has already been erased.
 * @param {SupabaseClient} supabase
 * @param {string} guestId
 * @returns {Promise<boolean>}
 */
export async function isErased(supabase, guestId) {
  const { data, error } = await supabase
    .from("guests")
    .select("erased_at")
    .eq("id", guestId)
    .maybeSingle();
  if (error) throw error;
  return data?.erased_at != null;
}
