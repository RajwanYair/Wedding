/**
 * src/core/action-registry.js — Typed action constants (Phase 6.5)
 *
 * Single source of truth for all `data-action` values used across
 * templates, modals, and index.html. Prevents typos and enables
 * compile-time validation.
 *
 * Usage:
 *   import { ACTIONS } from "./core/action-registry.js";
 *   on(ACTIONS.SHOW_SECTION, handler);
 *
 * Pre-build validation: `npm run validate` checks that every ACTIONS value
 * has a registered handler and every template data-action is in ACTIONS.
 */

/** @enum {string} All registered data-action values */
export const ACTIONS = /** @type {const} */ ({
  // ── Navigation ─────────────────────────────────────────────────────────
  SHOW_SECTION: "showSection",

  // ── Auth ───────────────────────────────────────────────────────────────
  SUBMIT_EMAIL_LOGIN: "submitEmailLogin",
  LOGIN_FACEBOOK: "loginFacebook",
  LOGIN_APPLE: "loginApple",
  SIGN_OUT: "signOut",
  SHOW_AUTH_OVERLAY: "showAuthOverlay",
  HIDE_AUTH_OVERLAY: "hideAuthOverlay",

  // ── Theme / UI ─────────────────────────────────────────────────────────
  CYCLE_THEME: "cycleTheme",
  TOGGLE_LIGHT_MODE: "toggleLightMode",
  TOGGLE_MOBILE_NAV: "toggleMobileNav",

  // ── Modals ─────────────────────────────────────────────────────────────
  CLOSE_MODAL: "closeModal",
  CLOSE_GALLERY_LIGHTBOX: "closeGalleryLightbox",
  OPEN_ADD_GUEST_MODAL: "openAddGuestModal",
  OPEN_ADD_TABLE_MODAL: "openAddTableModal",
  OPEN_ADD_VENDOR_MODAL: "openAddVendorModal",
  OPEN_ADD_EXPENSE_MODAL: "openAddExpenseModal",
  OPEN_ADD_TIMELINE_MODAL: "openAddTimelineModal",

  // ── Events ─────────────────────────────────────────────────────────────
  SWITCH_EVENT: "switchEvent",
  ADD_NEW_EVENT: "addNewEvent",
  DELETE_EVENT: "deleteEvent",

  // ── Guests ─────────────────────────────────────────────────────────────
  SAVE_GUEST: "saveGuest",
  ADD_GUEST_NOTE: "addGuestNote",
  ADD_GUEST_TAG: "addGuestTag",
  SET_FILTER: "setFilter",
  SET_SIDE_FILTER: "setSideFilter",
  TOGGLE_DECLINED_FILTER: "toggleDeclinedFilter",
  TOGGLE_UNSENT_FILTER: "toggleUnsentFilter",
  TOGGLE_VIP_FILTER: "toggleVipFilter",
  TOGGLE_ACCESSIBILITY_FILTER: "toggleAccessibilityFilter",
  TOGGLE_GIFT_MODE: "toggleGiftMode",
  TOGGLE_SELECT_ALL: "toggleSelectAll",
  BATCH_SET_STATUS: "batchSetStatus",
  BATCH_SET_MEAL: "batchSetMeal",
  BATCH_MARK_UNSENT: "batchMarkUnsent",
  BATCH_DELETE_GUESTS: "batchDeleteGuests",
  SORT_GUESTS_BY: "sortGuestsBy",
  SCAN_DUPLICATES: "scanDuplicates",
  EXPORT_GUESTS_CSV: "exportGuestsCSV",
  EXPORT_GIFTS_CSV: "exportGiftsCSV",
  EXPORT_TRANSPORT_CSV: "exportTransportCSV",
  EXPORT_MEAL_PER_TABLE_CSV: "exportMealPerTableCSV",
  EXPORT_CSV_TEMPLATE: "downloadCSVTemplate",
  EXPORT_JSON: "exportJSON",
  FIND_TABLE: "findTable",
  COPY_RSVP_LINK: "copyRsvpLink",
  DOWNLOAD_CALENDAR_INVITE: "downloadCalendarInvite",

  // ── Tables / Seating ───────────────────────────────────────────────────
  SAVE_TABLE: "saveTable",
  AUTO_ASSIGN_TABLES: "autoAssignTables",
  SMART_AUTO_ASSIGN: "smartAutoAssign",
  PRINT_SEATING_CHART: "printSeatingChart",
  PRINT_PLACE_CARDS: "printPlaceCards",
  PRINT_TABLE_SIGNS: "printTableSigns",
  PRINT_MEAL_PER_TABLE: "printMealPerTable",
  // EXPORT_MEAL_PER_TABLE alias removed — use EXPORT_MEAL_PER_TABLE_CSV

  // ── Check-in ───────────────────────────────────────────────────────────
  START_QR_SCAN: "startQrScan",
  STOP_QR_SCAN: "stopQrScan",
  PRINT_RSVP_QR: "printRsvpQr",
  PRINT_GUEST_BADGES: "printGuestBadges",
  PRINT_GUESTS: "printGuests",
  PRINT_GUESTS_BY_TABLE: "printGuestsByTable",
  EXPORT_CHECKIN_REPORT: "exportCheckinReport",

  // ── Vendors / Expenses ─────────────────────────────────────────────────
  SAVE_VENDOR: "saveVendor",
  SAVE_EXPENSE: "saveExpense",
  EXPORT_VENDOR_PAYMENTS_CSV: "exportVendorPaymentsCSV",

  // ── Budget ─────────────────────────────────────────────────────────────
  SAVE_BUDGET_TARGET: "saveBudgetTarget",

  // ── Analytics ──────────────────────────────────────────────────────────
  EXPORT_ANALYTICS_CSV: "exportAnalyticsCSV",
  EXPORT_ANALYTICS_PDF: "exportAnalyticsPDF",
  EXPORT_EVENT_SUMMARY: "exportEventSummary",

  // ── RSVP ───────────────────────────────────────────────────────────────
  SUBMIT_RSVP: "submitRSVP",
  SUBMIT_CONTACT_FORM: "submitContactForm",
  COPY_CONTACT_LINK: "copyContactLink",
  ADD_REGISTRY_LINK: "addRegistryLink",

  // ── WhatsApp ───────────────────────────────────────────────────────────
  SEND_WHATSAPP_ALL: "sendWhatsAppAll",
  SEND_WHATSAPP_ALL_VIA_API: "sendWhatsAppAllViaApi",
  SEND_WHATSAPP_REMINDER: "sendWhatsAppReminder",
  SCHEDULE_WA_REMINDERS: "scheduleWaReminders",
  CANCEL_SCHEDULED_WA: "cancelScheduledWa",
  CANCEL_SCHEDULED_WA_CAP: "cancelScheduledWA",
  SEND_THANK_YOU_MESSAGES: "sendThankYouMessages",
  INSERT_WA_VAR: "insertWaVar",
  CHECK_GREEN_API: "checkGreenApiConnection",
  SAVE_GREEN_API_CONFIG: "saveGreenApiConfig",

  // ── Timeline ───────────────────────────────────────────────────────────
  SAVE_TIMELINE_ITEM: "saveTimelineItem",
  PRINT_TIMELINE: "printTimeline",
  PRINT_DIETARY_CARDS: "printDietaryCards",
  PRINT_TRANSPORT_MANIFEST: "printTransportManifest",

  // ── Settings / Sync ────────────────────────────────────────────────────
  SYNC_SHEETS_NOW: "syncSheetsNow",
  PUSH_ALL_TO_SHEETS: "pushAllToSheets",
  PULL_FROM_SHEETS: "pullFromSheets",
  SHEETS_CHECK_CONNECTION: "sheetsCheckConnection",
  CREATE_MISSING_SHEET_TABS: "createMissingSheetTabs",
  CLEAN_CONFIG_DUPLICATES: "cleanConfigDuplicates",
  TOGGLE_LIVE_SYNC: "toggleLiveSync",
  TOGGLE_SHEETS_MIRROR: "toggleSheetsMirror",
  SAVE_WA_CLOUD_SETTINGS: "saveWaCloudSettings",
  COMM_ADD_SAMPLE: "commAddSample",
  CLEAR_COMM_LOG: "clearCommLog",
  SAVE_WEB_APP_URL: "saveWebAppUrl",
  SAVE_BACKEND_TYPE: "saveBackendType",
  SAVE_SUPABASE_CONFIG: "saveSupabaseConfig",
  SUPABASE_CHECK_CONNECTION: "supabaseCheckConnection",
  SAVE_TRANSPORT_SETTINGS: "saveTransportSettings",
  ADD_APPROVED_EMAIL: "addApprovedEmail",
  CLEAR_ALL_DATA: "clearAllData",
  CLEAR_AUDIT_LOG: "clearAuditLog",
  REFRESH_AUDIT_LOG: "refreshAuditLog",
  CLEAR_ERROR_LOG: "clearErrorLog",
  // EXPORT_ANALYSIS_PDF alias removed — use EXPORT_ANALYTICS_PDF

  // ── Conflict resolution ─────────────────────────────────────────────────
  CONFLICT_ACCEPT_ALL_LOCAL: "conflictAcceptAllLocal",
  CONFLICT_ACCEPT_ALL_REMOTE: "conflictAcceptAllRemote",
  CONFLICT_APPLY_SELECTED: "conflictApplySelected",

  // ── i18n ───────────────────────────────────────────────────────────────
  TOGGLE_LANGUAGE: "toggleLanguage",

  // ── Backup ─────────────────────────────────────────────────────────────
  START_AUTO_BACKUP: "startAutoBackup",
  STOP_AUTO_BACKUP: "stopAutoBackup",
  DOWNLOAD_AUTO_BACKUP: "downloadAutoBackup",
  RESTORE_AUTO_BACKUP: "restoreAutoBackup",
});

/** @typedef {typeof ACTIONS[keyof typeof ACTIONS]} Action */

/**
 * Reverse-map: string value → constant name.
 * Useful for debug output and validation scripts.
 * @type {Map<string, string>}
 */
export const ACTION_NAMES = new Map(Object.entries(ACTIONS).map(([k, v]) => [v, k]));

/** Set of all registered action string values. */
export const ACTION_VALUES = new Set(Object.values(ACTIONS));

/**
 * Check whether a string is a registered action value.
 * @param {unknown} value
 * @returns {boolean}
 */
export function validateAction(value) {
  return typeof value === "string" && ACTION_VALUES.has(value);
}

/**
 * Return a sorted array of all registered action string values.
 * @returns {string[]}
 */
export function listActions() {
  return [...ACTION_VALUES].sort();
}

/**
 * @typedef {{ actions: string[], count: number, registered: Record<string, string> }} ActionReport
 */

/**
 * Build a diagnostic report of all registered actions.
 * @returns {ActionReport}
 */
export function buildActionReport() {
  /** @type {Record<string, string>} */
  const registered = Object.fromEntries(ACTION_NAMES);
  return { actions: listActions(), count: ACTION_VALUES.size, registered };
}

// ──────────────────────────────────────────────────────────────────────────
// Namespacing helpers (Phase A — incremental migration aid)
//
// Existing actions are flat camelCase strings ("saveGuest"). New code may
// opt into namespaced form "guests:save" without breaking the registry.
// `parseAction()` accepts both styles.
// ──────────────────────────────────────────────────────────────────────────

/** @typedef {{ namespace: string | null, name: string, raw: string }} ParsedAction */

const NAMESPACE_SEP = ":";

/**
 * Combine a namespace and local action name into a single token.
 *
 * @param {string} namespace e.g. "guests"
 * @param {string} name      e.g. "save"
 * @returns {string}         e.g. "guests:save"
 */
export function namespaced(namespace, name) {
  if (!namespace || !name) throw new TypeError("action-registry: namespace and name required");
  if (namespace.includes(NAMESPACE_SEP) || name.includes(NAMESPACE_SEP)) {
    throw new TypeError(`action-registry: namespace/name must not contain "${NAMESPACE_SEP}"`);
  }
  return `${namespace}${NAMESPACE_SEP}${name}`;
}

/**
 * Parse an action string into namespace + local name. Returns `namespace: null`
 * for legacy flat names.
 *
 * @param {string} value
 * @returns {ParsedAction}
 */
export function parseAction(value) {
  const raw = String(value);
  const idx = raw.indexOf(NAMESPACE_SEP);
  if (idx < 0) return { namespace: null, name: raw, raw };
  return {
    namespace: raw.slice(0, idx),
    name: raw.slice(idx + 1),
    raw,
  };
}

/**
 * Filter the registry by namespace. Returns an array of full action values.
 * Matches both `"<ns>:..."` and (case-insensitively) the camelCase prefix
 * of legacy flat names — e.g. namespace "guest" matches "saveGuest".
 *
 * @param {string} namespace
 * @returns {string[]}
 */
export function getActionsByNamespace(namespace) {
  if (!namespace) return [];
  const ns = namespace.toLowerCase();
  return listActions().filter((a) => {
    const parsed = parseAction(a);
    if (parsed.namespace) return parsed.namespace.toLowerCase() === ns;
    return a.toLowerCase().includes(ns);
  });
}

/**
 * Dev-time duplicate detector. Returns any action string that appears more
 * than once across the supplied registry object. Exposed for the validator
 * scripts and unit tests.
 *
 * @param {Record<string, string>} registry
 * @returns {string[]} duplicate values (empty array when registry is clean)
 */
export function findDuplicateActions(registry = ACTIONS) {
  /** @type {Map<string, number>} */
  const seen = new Map();
  for (const value of Object.values(registry)) {
    seen.set(value, (seen.get(value) ?? 0) + 1);
  }
  return [...seen.entries()].filter(([, count]) => count > 1).map(([v]) => v);
}

// ──────────────────────────────────────────────────────────────────────────
// Namespaced aliases (ADR-022 Phase 1 — modals)
//
// Maps the new `modal:<verb>` names to the existing legacy flat names. Both
// continue to work via `events.alias()`. Old names will be removed in
// v12.0.0; templates should adopt the new names incrementally.
// ──────────────────────────────────────────────────────────────────────────

/** @type {Readonly<Record<string, string>>} */
export const MODAL_ACTION_ALIASES = Object.freeze({
  "modal:close": ACTIONS.CLOSE_MODAL,
  "modal:close-gallery-lightbox": ACTIONS.CLOSE_GALLERY_LIGHTBOX,
  "modal:open-add-guest": ACTIONS.OPEN_ADD_GUEST_MODAL,
  "modal:open-add-table": ACTIONS.OPEN_ADD_TABLE_MODAL,
  "modal:open-add-vendor": ACTIONS.OPEN_ADD_VENDOR_MODAL,
  "modal:open-add-expense": ACTIONS.OPEN_ADD_EXPENSE_MODAL,
  "modal:open-add-timeline": ACTIONS.OPEN_ADD_TIMELINE_MODAL,
});

/**
 * Aggregate all namespaced action aliases shipped so far. Future ADR-022
 * batches (auth, guests, tables, …) extend this object.
 * @type {Readonly<Record<string, string>>}
 */
export const NAMESPACED_ACTION_ALIASES = Object.freeze({
  ...MODAL_ACTION_ALIASES,
});

/**
 * Wire all namespaced aliases into the supplied event hub. Idempotent.
 * @param {(newName: string, originalName: string) => void} aliasFn
 *        Typically `alias` from `core/events.js`.
 * @returns {number} count of aliases registered
 */
export function registerNamespacedActionAliases(aliasFn) {
  if (typeof aliasFn !== "function") {
    throw new TypeError("registerNamespacedActionAliases: aliasFn required");
  }
  let count = 0;
  for (const [newName, originalName] of Object.entries(NAMESPACED_ACTION_ALIASES)) {
    aliasFn(newName, originalName);
    count += 1;
  }
  return count;
}
