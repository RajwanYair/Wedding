/**
 * src/core/config.js — App constants (S0 named-export module)
 *
 * Mirrors js/config.js constants. Values may be overridden by
 * scripts/inject-config.mjs at build time for production credentials.
 * No window.* side effects.
 */

// ── Version ───────────────────────────────────────────────────────────────
export const APP_VERSION = "11.12.0";

// ── LocalStorage ─────────────────────────────────────────────────────────
export const STORAGE_PREFIX = "wedding_v1_";

// ── Sheets ───────────────────────────────────────────────────────────────
export const SHEETS_WEBAPP_URL = "";
export const SPREADSHEET_ID = "";
export const SHEETS_GUESTS_TAB = "Attendees";
export const SHEETS_TABLES_TAB = "Tables";
export const SHEETS_CONFIG_TAB = "Config";
export const SHEETS_VENDORS_TAB = "Vendors";
export const SHEETS_EXPENSES_TAB = "Expenses";
export const SHEETS_RSVP_LOG_TAB = "RSVP_Log";

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
export const ADMIN_EMAILS = [];

/** Session rotation interval: 2 hours (S4.1) */
export const AUTH_SESSION_DURATION_MS = 2 * 60 * 60 * 1000;

// ── UI ────────────────────────────────────────────────────────────────────
export const TOAST_DURATION_MS = 3000;
export const DEBOUNCE_MS = 1500;
export const MAX_RETRIES = 4;
export const BACKOFF_BASE_MS = 2000;

// ── Domain enums ──────────────────────────────────────────────────────────
// Centralised in src/core/constants.js — import from there.
