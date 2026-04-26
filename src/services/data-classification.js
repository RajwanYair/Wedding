/**
 * src/services/data-classification.js — PII data classification policy (Sprint 62)
 *
 * Maps each domain field to a classification level, enabling:
 *  - GDPR erasure to know which fields to wipe
 *  - Export code to redact or omit PII fields
 *  - Audit pipeline to flag sensitive operations
 *
 * Classification levels:
 *  "public"      — non-personal, freely shareable
 *  "internal"    — business data, restricted to admins
 *  "pii"         — personally identifiable info; requires consent
 *  "sensitive"   — health/accessibility data; highest protection
 *
 * Usage:
 *   import { getFieldClassification, isPII, getSensitiveFields } from "./data-classification.js";
 *   const level = getFieldClassification("guest", "phone"); // → "pii"
 *   if (isPII("guest", "email")) { ... }
 */

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
    mealNotes: "sensitive", // health/dietary
    accessibility: "sensitive", // health/disability
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
 * Get all field names classified at or above the given level for a domain.
 * Returns fields that are "pii" or "sensitive" when level is "pii",
 * or only "sensitive" when level is "sensitive".
 *
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
 * Convenience: return all PII + sensitive fields for a domain.
 * @param {string} domain
 * @returns {string[]}
 */
export function getPIIFields(domain) {
  return getFieldsByClassification(domain, "pii");
}

/**
 * Convenience: return only sensitive fields for a domain.
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
