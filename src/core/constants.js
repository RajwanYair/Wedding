/**
 * src/core/constants.js — Single source of truth for section/modal names (F1.1)
 *
 * All section lists, modal IDs, and public section sets are defined here.
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
