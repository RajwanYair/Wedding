/**
 * src/services/compliance.js — Privacy, PII, GDPR, and audit logging (S278)
 *
 * Merged from:
 *   - privacy.js (S229) — data classification + PII storage + GDPR erasure
 *   - audit.js (Phase 8.3) — client-side audit entry writer + batched pipeline
 *
 * §1 Data classification — getFieldClassification, isPII, getFieldsByClassification,
 *    getPIIFields, getSensitiveFields, listDomains, redactPII.
 * §2 PII storage — isPiiKey, savePii, loadPii, migratePlaintextPii.
 * §3 GDPR erasure — PII_COLUMNS, eraseGuest, isErased.
 * §4 Audit writer — audit, logAdminAction, logError.
 * §5 Audit pipeline — createAuditPipeline (batched Supabase writer).
 */

import { STORE_DATA_CLASS, DATA_CLASS } from "../core/constants.js";
import { STORAGE_PREFIX } from "../core/config.js";
import { getActiveEventId } from "../core/state.js";
import { setSecure, getSecure } from "./security.js";
import { APP_VERSION } from "../core/config.js";
import { getBackendTypeConfig, getSupabaseAnonKey, getSupabaseUrl } from "../core/app-config.js";
import { STORAGE_KEYS } from "../core/constants.js";
import {
  readBrowserStorageJson,
  readSessionStorage,
  writeSessionStorage,
} from "../core/storage.js";

// ══════════════════════════════════════════════════════════════════════════
// §1 — Data classification
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
      (/** @type {any} */ (copy))[field] = null;
    }
  }
  return copy;
}

// ══════════════════════════════════════════════════════════════════════════
// §2 — PII storage
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
// §3 — GDPR erasure
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

// ══════════════════════════════════════════════════════════════════════════
// §4 — Audit writer
// ══════════════════════════════════════════════════════════════════════════

// ── Runtime credential helpers ─────────────────────────────────────────

function _url() {
  return getSupabaseUrl();
}

function _key() {
  return getSupabaseAnonKey();
}

function _getAdminEmail() {
  const sess = /** @type {any} */ (readBrowserStorageJson(STORAGE_KEYS.SUPABASE_SESSION, null));
  return sess?.user?.email ?? null;
}

// ── Session token for RLS ──────────────────────────────────────────────

function _getAccessToken() {
  const sess = /** @type {any} */ (readBrowserStorageJson(STORAGE_KEYS.SUPABASE_SESSION, null));
  return sess?.access_token ?? null;
}

/**
 * @param {string} action   e.g. "INSERT", "UPDATE", "DELETE"
 * @param {string} entity   e.g. "guests", "tables", "vendors"
 * @param {string | null}   entityId
 * @param {{ before?: unknown, after?: unknown } | null} diff
 * @returns {void}
 */
export function audit(action, entity, entityId, diff = null) {
  if (getBackendTypeConfig() !== "supabase") return;
  const baseUrl = _url();
  const key = _key();
  if (!baseUrl || !key) return;

  const userEmail = _getAdminEmail();
  if (!userEmail) return; // Only log admin actions

  const token = _getAccessToken();

  const entry = {
    user_email: userEmail,
    action: String(action).toUpperCase(),
    entity: String(entity),
    entity_id: entityId ?? null,
    diff: diff ?? null,
    app_version: APP_VERSION,
    ts: new Date().toISOString(),
  };

  // Fire-and-forget: errors should not block UI
  fetch(`${baseUrl}/rest/v1/audit_log`, {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Prefer: "return=minimal",
    },
    body: JSON.stringify(entry),
  }).catch((err) => {
    console.error("[audit] Write failed:", err);
  });
}

/**
 * High-level helper that maps permission-model actions to audit entries.
 *
 * @param {string} permission  "resource:action" string from roles.js
 * @param {string} entityId    ID of the affected record (empty string for bulk)
 * @param {{ before?: unknown, after?: unknown } | null} [diff]
 */
export function logAdminAction(permission, entityId, diff = null) {
  const [entity = "unknown", action = "unknown"] = permission.split(":");
  audit(action.toUpperCase(), entity, entityId, diff);
}

/**
 * Log a client-side error to the `error_log` Supabase table (migration 005).
 * @param {Error | unknown} err
 * @param {{ context?: string, url?: string }} [opts]
 */
export function logError(err, opts = {}) {
  if (getBackendTypeConfig() !== "supabase") return;
  const baseUrl = _url();
  const key = _key();
  if (!baseUrl || !key) return;

  const sessionId = _getSessionId();
  const msg = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? (err.stack ?? "") : "";

  const entry = {
    level: "error",
    message: msg,
    stack,
    url: opts.url ?? (typeof location !== "undefined" ? location.href : ""),
    context: opts.context ?? null,
    session_id: sessionId,
    app_version: APP_VERSION,
  };

  fetch(`${baseUrl}/rest/v1/error_log`, {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(entry),
  }).catch(() => {}); // Swallow silently — logging must not cause cascading errors
}

// ── Session ID (anonymous, per-tab) ──────────────────────────────────

let _sessionId = "";
function _getSessionId() {
  if (!_sessionId) {
    _sessionId = readSessionStorage(STORAGE_KEYS.ERROR_SESSION_ID, "") ?? "";
    if (!_sessionId) {
      try {
        _sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        writeSessionStorage(STORAGE_KEYS.ERROR_SESSION_ID, _sessionId);
      } catch {
        _sessionId = `${Date.now()}`;
      }
    }
    if (!_sessionId) {
      _sessionId = `${Date.now()}`;
    }
  }
  return _sessionId;
}

// ══════════════════════════════════════════════════════════════════════════
// §5 — Audit pipeline (batched Supabase writer)
// ══════════════════════════════════════════════════════════════════════════

/**
 * @typedef {"low"|"medium"|"high"|"critical"} Severity
 *
 * @typedef {{
 *   action: string,
 *   entityType?: string,
 *   entityId?: string,
 *   userId?: string,
 *   severity?: Severity,
 *   metadata?: Record<string, unknown>
 * }} AuditEvent
 *
 * @typedef {{
 *   log(event: AuditEvent): void,
 *   flush(): Promise<void>,
 *   pending(): number,
 *   destroy(): void
 * }} AuditPipeline
 */

const PIPELINE_BATCH_SIZE = 20;
const PIPELINE_FLUSH_MS = 5_000;

const HIGH_SEVERITY_ACTIONS = new Set([
  "guest.delete",
  "guest.erase",
  "user.ban",
  "settings.change",
  "admin.login",
  "admin.logout",
]);

/**
 * Resolve severity — caller hint is respected but certain actions are elevated.
 * @param {string} action
 * @param {Severity} [hint]
 * @returns {Severity}
 */
function resolveSeverity(action, hint) {
  if (HIGH_SEVERITY_ACTIONS.has(action)) {
    const levels = ["low", "medium", "high", "critical"];
    const hintIdx = hint ? levels.indexOf(hint) : -1;
    return hintIdx >= 2 ? /** @type {Severity} */ (hint) : "high";
  }
  return hint ?? "low";
}

/**
 * Create a batched audit pipeline.
 *
 * @param {SupabaseClient | null} supabase  Pass null for offline / test mode.
 * @param {{ batchSize?: number, flushMs?: number }} [opts]
 * @returns {AuditPipeline}
 */
export function createAuditPipeline(supabase, opts = {}) {
  const batchSize = opts.batchSize ?? PIPELINE_BATCH_SIZE;
  const flushMs = opts.flushMs ?? PIPELINE_FLUSH_MS;

  /** @type {AuditEvent[]} */
  const queue = [];
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null;
  let destroyed = false;

  function scheduleFlush() {
    if (timer || destroyed) return;
    timer = setTimeout(() => {
      timer = null;
      flushQueue();
    }, flushMs);
  }

  async function flushQueue() {
    if (queue.length === 0) return;
    const batch = queue.splice(0, batchSize);
    if (!supabase) {
      for (const e of batch) {
        console.warn("[audit]", e.action, e.severity, e.entityType, e.entityId);
      }
      return;
    }
    try {
      await supabase.from("audit_log").insert(batch);
    } catch {
      queue.unshift(...batch);
    }
  }

  return {
    log(event) {
      if (destroyed) return;
      const enriched = {
        ...event,
        severity: resolveSeverity(event.action, event.severity),
        logged_at: new Date().toISOString(),
      };
      queue.push(enriched);
      if (queue.length >= batchSize) {
        flushQueue();
      } else {
        scheduleFlush();
      }
    },
    async flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      await flushQueue();
    },
    pending() {
      return queue.length;
    },
    destroy() {
      destroyed = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
