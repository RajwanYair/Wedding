/**
 * src/core/app-config.js — runtime/build config resolvers
 *
 * Provides a single place for modules to read deployment-sensitive config.
 * Priority order is runtime storage → build-injected config.js constant.
 */

import {
  ADMIN_EMAILS,
  BACKEND_TYPE,
  SHEETS_WEBAPP_URL,
  SPREADSHEET_ID,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "./config.js";
import { load } from "./state.js";

/**
 * @param {string} storageKey
 * @returns {string}
 */
function readStoredString(storageKey) {
  const stored = load(storageKey, "");
  return typeof stored === "string" ? stored.trim() : "";
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function normalizeEmailList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry).trim().toLowerCase()).filter(Boolean);
}

/** @returns {string} */
export function getSheetsWebAppUrl() {
  return readStoredString("sheetsWebAppUrl") || SHEETS_WEBAPP_URL || "";
}

/** @returns {string} */
export function getSpreadsheetId() {
  return readStoredString("sheetsSpreadsheetId") || SPREADSHEET_ID || "";
}

/** @returns {string} */
export function getSupabaseUrl() {
  return readStoredString("supabaseUrl") || SUPABASE_URL || "";
}

/** @returns {string} */
export function getSupabaseAnonKey() {
  return readStoredString("supabaseAnonKey") || SUPABASE_ANON_KEY || "";
}

/** @returns {'sheets'|'supabase'|'both'|'none'} */
export function getBackendTypeConfig() {
  const configured = readStoredString("backendType") || BACKEND_TYPE || "sheets";
  if (configured === "supabase" || configured === "both" || configured === "none") {
    return configured;
  }
  return "sheets";
}

/** @returns {string[]} */
export function getApprovedAdminEmails() {
  const buildEmails = normalizeEmailList(ADMIN_EMAILS);
  const runtimeEmails = normalizeEmailList(load("approvedEmails", []));
  return [...new Set([...buildEmails, ...runtimeEmails])];
}
