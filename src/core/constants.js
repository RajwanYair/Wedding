/**
 * src/core/constants.js — Single source of truth for section/modal names (F1.1)
 *
 * All section lists, modal IDs, public section sets, domain enums, storage keys,
 * and category lists are defined here.
 * Import from this file instead of duplicating arrays across modules.
 */

/**
 * Ordered list of navigable section names.
 * Used by nav.js for swipe/keyboard, template-loader, and main.js SECTIONS map.
 * @type {readonly string[]}
 */
export const SECTION_LIST = /** @type {const} */ ([
  "landing",
  "dashboard",
  "guests",
  "tables",
  "invitation",
  "whatsapp",
  "rsvp",
  "budget",
  "analytics",
  "timeline",
  "gallery",
  "checkin",
  "settings",
  "changelog",
]);

/**
 * Additional section names that exist but are not in the main nav order
 * (e.g. sub-sections, embedded sections).
 * @type {readonly string[]}
 */
export const EXTRA_SECTIONS = /** @type {const} */ ([
  "vendors",
  "expenses",
  "contact-form",
  "registry",
  "guest-landing",
]);

/**
 * All valid section names (navigable + extra).
 * @type {readonly string[]}
 */
export const ALL_SECTIONS = /** @type {const} */ ([
  ...SECTION_LIST,
  ...EXTRA_SECTIONS,
]);

/**
 * Sections accessible without admin authentication.
 * @type {ReadonlySet<string>}
 */
export const PUBLIC_SECTIONS = new Set([
  "rsvp",
  "landing",
  "contact-form",
  "registry",
  "guest-landing",
  "changelog",
]);

/**
 * Valid guest status values.
 * @type {readonly string[]}
 */
export const GUEST_STATUSES = /** @type {const} */ ([
  "pending",
  "confirmed",
  "declined",
  "maybe",
]);

/**
 * Valid guest side values.
 * @type {readonly string[]}
 */
export const GUEST_SIDES = /** @type {const} */ (["groom", "bride", "mutual"]);

/**
 * Valid guest group values.
 * @type {readonly string[]}
 */
export const GUEST_GROUPS = /** @type {const} */ ([
  "family",
  "friends",
  "work",
  "neighbors",
  "other",
]);

/**
 * Valid meal type values.
 * @type {readonly string[]}
 */
export const MEAL_TYPES = /** @type {const} */ ([
  "regular",
  "vegetarian",
  "vegan",
  "gluten_free",
  "kosher",
]);

/**
 * Valid table shape values.
 * @type {readonly string[]}
 */
export const TABLE_SHAPES = /** @type {const} */ (["round", "rect"]);

/**
 * Vendor category keys (map to i18n keys via `vendor_cat_${key}`).
 * @type {readonly string[]}
 */
export const VENDOR_CATEGORIES = /** @type {const} */ ([
  "venue",
  "catering",
  "photography",
  "video",
  "flowers",
  "music",
  "cake",
  "attire",
  "transport",
  "other",
]);

/**
 * Expense category keys (map to i18n keys via `expense_cat_${key}`).
 * @type {readonly string[]}
 */
export const EXPENSE_CATEGORIES = /** @type {const} */ ([
  "venue",
  "catering",
  "photography",
  "flowers",
  "music",
  "transport",
  "clothing",
  "misc",
]);

/**
 * Modal element IDs used throughout the app.
 * @type {Readonly<Record<string, string>>}
 */
export const MODALS = /** @type {const} */ ({
  GUEST: "guestModal",
  TABLE: "tableModal",
  VENDOR: "vendorModal",
  EXPENSE: "expenseModal",
  TIMELINE: "timelineModal",
  CONFLICT: "conflictModal",
  AUTH: "authOverlay",
  GALLERY_LB: "galleryLightbox",
  SHORTCUTS: "shortcutsModal",
});

/**
 * Non-domain localStorage keys used outside the reactive store.
 * All keys are prefixed with `wedding_v1_` at runtime.
 * Use these constants instead of hardcoding magic strings.
 * @type {Readonly<Record<string, string>>}
 */
export const STORAGE_KEYS = /** @type {const} */ ({
  // App metadata (non-prefixed short keys used with state.js)
  LANG: "lang",
  SESSION: "session",
  EVENTS: "events",
  ACTIVE_EVENT_ID: "activeEventId",

  // Settings (used directly with localStorage, full key)
  SHEETS_MIRROR: "wedding_v1_sheets_mirror",
  WA_PHONE_NUMBER_ID: "wedding_v1_wa_phone_number_id",
  SUPABASE_SESSION: "wedding_v1_supabase_session",
  LAST_SEEN_VERSION: "wedding_v1_lastSeenVersion",
  ERRORS: "wedding_v1_errors",
  ERROR_SESSION_ID: "wedding_v1_error_session_id",
  THEME: "wedding_v1_theme",
  LIGHT_MODE: "wedding_v1_lightMode",
  INSTALL_DISMISSED_UNTIL: "wedding_v1_install_dismissed_until",
  RUNTIME_CONFIG: "wedding_v1_runtime_cfg",
  GREEN_API_INSTANCE_ID: "wedding_v1_greenApiInstanceId",
  GREEN_API_TOKEN: "wedding_v1_greenApiToken",
  REMINDER_QUEUE: "wedding_v1_reminderQueue",
  COLOR_SCHEME: "wedding_v1_colorScheme",
  PUSH_SUBSCRIPTION_CACHE: "wedding_v1_push_sub",
  REVOKED_TOKENS: "wedding_v1_revoked_tokens",
});

/**
 * Canonical data sensitivity values used across store/privacy helpers.
 * @type {Readonly<Record<"PUBLIC" | "GUEST_PRIVATE" | "ADMIN_SENSITIVE" | "OPERATIONAL", import("../types.js").DataClass>>}
 */
export const DATA_CLASS = Object.freeze({
  PUBLIC: "public",
  GUEST_PRIVATE: "guest-private",
  ADMIN_SENSITIVE: "admin-sensitive",
  OPERATIONAL: "operational",
});

/**
 * Data sensitivity classification for each store domain key.
 * Used to decide what may be safely persisted locally.
 *
 * - `public`          — safe to persist; no PII
 * - `guest-private`   — PII belonging to a single user (RSVP data)
 * - `admin-sensitive` — full guest list, vendor details, financials
 * - `operational`     — queues, draft state, non-PII metadata
 * @type {Readonly<Record<string, string>>}
 */
export const STORE_DATA_CLASS = /** @type {const} */ ({
  guests: DATA_CLASS.ADMIN_SENSITIVE,
  campaigns: DATA_CLASS.ADMIN_SENSITIVE,
  approvedEmails: DATA_CLASS.ADMIN_SENSITIVE,
  auditLog: DATA_CLASS.ADMIN_SENSITIVE,
  backendType: DATA_CLASS.OPERATIONAL,
  tables: DATA_CLASS.ADMIN_SENSITIVE,
  vendors: DATA_CLASS.ADMIN_SENSITIVE,
  expenses: DATA_CLASS.ADMIN_SENSITIVE,
  donationGoals: DATA_CLASS.ADMIN_SENSITIVE,
  donations: DATA_CLASS.ADMIN_SENSITIVE,
  appErrors: DATA_CLASS.OPERATIONAL,
  timeline: DATA_CLASS.PUBLIC,
  gallery: DATA_CLASS.PUBLIC,
  weddingInfo: DATA_CLASS.PUBLIC,
  budget: DATA_CLASS.ADMIN_SENSITIVE,
  budgetEnvelopes: DATA_CLASS.ADMIN_SENSITIVE,
  checkinSessions: DATA_CLASS.ADMIN_SENSITIVE,
  contacts: DATA_CLASS.GUEST_PRIVATE,
  deliveries: DATA_CLASS.ADMIN_SENSITIVE,
  issuedTokens: DATA_CLASS.ADMIN_SENSITIVE,
  notificationPreferences: DATA_CLASS.GUEST_PRIVATE,
  offline_queue: DATA_CLASS.GUEST_PRIVATE,
  push_subscriptions: DATA_CLASS.OPERATIONAL,
  rsvp_log: DATA_CLASS.ADMIN_SENSITIVE,
  seatingConstraints: DATA_CLASS.ADMIN_SENSITIVE,
  sheetsWebAppUrl: DATA_CLASS.OPERATIONAL,
  supabaseAnonKey: DATA_CLASS.OPERATIONAL,
  supabaseUrl: DATA_CLASS.OPERATIONAL,
  timelineDone: DATA_CLASS.OPERATIONAL,
  commLog: DATA_CLASS.ADMIN_SENSITIVE,
  webhookDeliveries: DATA_CLASS.ADMIN_SENSITIVE,
  webhooks: DATA_CLASS.ADMIN_SENSITIVE,
});
