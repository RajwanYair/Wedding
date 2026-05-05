/**
 * src/core/constants.ts — Single source of truth for section/modal names (F1.1)
 *
 * All section lists, modal IDs, public section sets, domain enums, storage keys,
 * and category lists are defined here.  Import from this file instead of
 * duplicating arrays across modules.
 *
 * TypeScript discriminated union types are derived from the `as const` arrays.
 * Import type-only: `import type { SectionId, GuestStatus } from './constants.js';`
 */

// ── Navigable sections ────────────────────────────────────────────────────

/** Ordered list of navigable section names. */
export const SECTION_LIST = [
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
] as const;

/** Union of all navigable section name strings. */
export type SectionId = (typeof SECTION_LIST)[number];

/** Additional section names outside the main nav order. */
export const EXTRA_SECTIONS = [
  "vendors",
  "expenses",
  "contact-form",
  "registry",
  "guest-landing",
  "website-builder",
  "run-of-show",
  "onboarding",
  "audit-log",
] as const;

/** Union of all extra section name strings. */
export type ExtraSectionId = (typeof EXTRA_SECTIONS)[number];

/** All valid section names (navigable + extra). */
export const ALL_SECTIONS = [...SECTION_LIST, ...EXTRA_SECTIONS] as const;

/** Union of ALL section name strings. */
export type AnySectionId = SectionId | ExtraSectionId;

/** Sections accessible without admin authentication. */
export const PUBLIC_SECTIONS: ReadonlySet<string> = new Set([
  "rsvp",
  "landing",
  "contact-form",
  "registry",
  "guest-landing",
  "changelog",
]);

// ── Guest domain enums ────────────────────────────────────────────────────

/** Valid guest status values. */
export const GUEST_STATUSES = ["pending", "confirmed", "declined", "maybe"] as const;
/** Discriminated union for guest status. */
export type GuestStatus = (typeof GUEST_STATUSES)[number];

/** Statuses representing an explicit RSVP response (non-pending). */
export const RSVP_RESPONSE_STATUSES: readonly string[] = GUEST_STATUSES.filter(
  (s) => s !== "pending",
);

/** Valid guest side values. */
export const GUEST_SIDES = ["groom", "bride", "mutual"] as const;
/** Discriminated union for guest side. */
export type GuestSide = (typeof GUEST_SIDES)[number];

/** Valid guest group values. */
export const GUEST_GROUPS = ["family", "friends", "work", "neighbors", "other"] as const;
/** Discriminated union for guest group. */
export type GuestGroup = (typeof GUEST_GROUPS)[number];

/** Valid meal type values. */
export const MEAL_TYPES = ["regular", "vegetarian", "vegan", "gluten_free", "kosher"] as const;
/** Discriminated union for meal type. */
export type MealType = (typeof MEAL_TYPES)[number];

/** Valid table shape values. */
export const TABLE_SHAPES = ["round", "rect"] as const;
/** Discriminated union for table shape. */
export type TableShape = (typeof TABLE_SHAPES)[number];

// ── Vendor / expense enums ────────────────────────────────────────────────

/** Vendor category keys (map to i18n keys via `vendor_cat_${key}`). */
export const VENDOR_CATEGORIES = [
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
] as const;
/** Discriminated union for vendor category. */
export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];

/** Expense category keys (map to i18n keys via `expense_cat_${key}`). */
export const EXPENSE_CATEGORIES = [
  "venue",
  "catering",
  "photography",
  "flowers",
  "music",
  "transport",
  "clothing",
  "misc",
] as const;
/** Discriminated union for expense category. */
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

// ── Modal IDs ─────────────────────────────────────────────────────────────

/** Modal element IDs used throughout the app. */
export const MODALS = {
  GUEST: "guestModal",
  TABLE: "tableModal",
  VENDOR: "vendorModal",
  EXPENSE: "expenseModal",
  TIMELINE: "timelineModal",
  CONFLICT: "conflictModal",
  AUTH: "authOverlay",
  GALLERY_LB: "galleryLightbox",
  SHORTCUTS: "shortcutsModal",
  PRINT_PREVIEW: "printPreviewModal",
} as const;

/** Union of all modal IDs. */
export type ModalId = (typeof MODALS)[keyof typeof MODALS];

// ── Storage keys ──────────────────────────────────────────────────────────

/** Non-domain localStorage keys used outside the reactive store. */
export const STORAGE_KEYS = {
  LANG: "lang",
  SESSION: "session",
  EVENTS: "events",
  ACTIVE_EVENT_ID: "activeEventId",
  SHEETS_MIRROR: "wedding_v1_sheets_mirror",
  WA_PHONE_NUMBER_ID: "wedding_v1_wa_phone_number_id",
  SUPABASE_SESSION: "wedding_v1_supabase_session",
  SUPABASE_AUTH: "wedding_v1_supabase_auth",
  LAST_SEEN_VERSION: "wedding_v1_lastSeenVersion",
  IDB_MIGRATED: "wedding_v1_idb_migrated",
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
} as const;

/** Union of STORAGE_KEYS value strings. */
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

// ── Data classification ───────────────────────────────────────────────────

/** Canonical data sensitivity values. */
export const DATA_CLASS = Object.freeze({
  PUBLIC: "public",
  GUEST_PRIVATE: "guest-private",
  ADMIN_SENSITIVE: "admin-sensitive",
  OPERATIONAL: "operational",
} as const);

/** Data sensitivity class union. */
export type DataClass = (typeof DATA_CLASS)[keyof typeof DATA_CLASS];

/** Data sensitivity classification for each store domain key. */
export const STORE_DATA_CLASS: Readonly<Record<string, DataClass>> = Object.freeze({
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
