/**
 * src/core/config.js — App constants (S0 named-export module)
 *
 * Mirrors js/config.js constants. Values may be overridden by
 * scripts/inject-config.mjs at build time for production credentials.
 * No window.* side effects.
 */

// ── Version ───────────────────────────────────────────────────────────────
export const APP_VERSION = "7.2.0";

// ── LocalStorage ─────────────────────────────────────────────────────────
export const STORAGE_PREFIX = "wedding_v1_";

// ── Sheets ───────────────────────────────────────────────────────────────
export const SHEETS_WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbxGYuciHXLurYbZn9s-Gx8uMmBSn1dZ20xOFoZkk3JXg3RrzR741jz2tsIKgLtN8cHQ/exec";
export const SPREADSHEET_ID = "1hgAD078LFdzPEUKb3vgv8KXMd09n9EUlHR3ANP9SBMA";
export const SHEETS_GUESTS_TAB = "Attendees";
export const SHEETS_TABLES_TAB = "Tables";
export const SHEETS_CONFIG_TAB = "Config";
export const SHEETS_VENDORS_TAB = "Vendors";
export const SHEETS_EXPENSES_TAB = "Expenses";
export const SHEETS_RSVP_LOG_TAB = "RSVP_Log";
export const SHEETS_TIMELINE_TAB = "Timeline";

// ── Supabase ─────────────────────────────────────────────────────────────
export const SUPABASE_URL = "";
export const SUPABASE_ANON_KEY = "";

// ── Backend selection ────────────────────────────────────────────────────
/** @type {'sheets'|'supabase'|'none'} */
export const BACKEND_TYPE = "sheets";

// ── Auth ─────────────────────────────────────────────────────────────────
export const GOOGLE_CLIENT_ID = "";
export const FB_APP_ID = "";
export const APPLE_SERVICE_ID = "";

/** @type {string[]} */
export const ADMIN_EMAILS = [
  "yair.rajwan@gmail.com",
  "ylipman@gmail.com",
  "elior.rajwan@gmail.com",
  "anat.rajwan@gmail.com",
];

/** Session rotation interval: 2 hours (S4.1) */
export const AUTH_SESSION_DURATION_MS = 2 * 60 * 60 * 1000;

// ── UI ────────────────────────────────────────────────────────────────────
export const TOAST_DURATION_MS = 3000;
export const DEBOUNCE_MS = 1500;

// ── Retry / Backoff (F2.4.1 single source) ────────────────────────────────
/** Maximum retry attempts before marking sync as failed */
export const MAX_RETRIES = 4;
/** Base delay in ms for exponential backoff (delay = BASE × 2^attempt + jitter) */
export const BACKOFF_BASE_MS = 2000;

// ── RSVP deadlines ────────────────────────────────────────────────────────
export const RSVP_DEADLINE = "";

// ── Guest status options ──────────────────────────────────────────────────
/** @type {readonly string[]} */
export const GUEST_STATUSES = /** @type {const} */ ([
  "pending",
  "confirmed",
  "declined",
  "maybe",
]);

/** @type {readonly string[]} */
export const MEAL_TYPES = /** @type {const} */ ([
  "regular",
  "vegetarian",
  "vegan",
  "gluten_free",
  "kosher",
]);

// ── Sprint 9: App Health Check ────────────────────────────────────────────

/**
 * Quick health check — returns diagnostic info for debugging.
 * @returns {{ version: string, stores: string[], locale: string, sw: boolean, online: boolean }}
 */
export function getAppHealth() {
  const stores = ["guests", "tables", "vendors", "expenses", "timeline", "weddingInfo"]
    .filter((k) => { try { return localStorage.getItem(`wedding_v1_${k}`) !== null; } catch { return false; } });
  return {
    version: APP_VERSION,
    stores,
    locale: document.documentElement.lang || "he",
    sw: "serviceWorker" in navigator,
    online: navigator.onLine,
  };
}
