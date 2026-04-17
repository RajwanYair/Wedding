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
export const ACTION_NAMES = new Map(
  Object.entries(ACTIONS).map(([k, v]) => [v, k]),
);
