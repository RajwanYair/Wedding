/**
 * src/core/domain-enums.js — Rich typed domain enum objects (Sprint 51)
 *
 * Provides structured option lists for every domain enumeration.
 * Each enum item includes:
 *   - `value`    — the raw stored value
 *   - `labelKey` — i18n translation key
 *   - `color`    — optional semantic colour token
 *   - `icon`     — optional emoji / icon hint
 *
 * All flat array counterparts remain in `constants.js`.
 * Import from here when you need labels, colours, or icons alongside values.
 *
 * Usage:
 *   import { GUEST_STATUS_OPTIONS, MEAL_OPTIONS } from "../core/domain-enums.js";
 *   const label = GUEST_STATUS_OPTIONS.find(o => o.value === guest.status)?.labelKey;
 */

// ── Guest status ──────────────────────────────────────────────────────────

/**
 * @typedef {{ value: string, labelKey: string, color: string, icon: string }} EnumOption
 */

/** @type {readonly EnumOption[]} */
export const GUEST_STATUS_OPTIONS = /** @type {const} */ ([
  { value: "pending", labelKey: "status_pending", color: "var(--color-warning)", icon: "⏳" },
  { value: "confirmed", labelKey: "status_confirmed", color: "var(--color-success)", icon: "✅" },
  { value: "declined", labelKey: "status_declined", color: "var(--color-danger)", icon: "❌" },
  { value: "maybe", labelKey: "status_maybe", color: "var(--color-info)", icon: "🤔" },
]);

/** Set of valid guest status values. */
export const GUEST_STATUS_VALUES = new Set(GUEST_STATUS_OPTIONS.map((o) => o.value));

// ── Guest side ────────────────────────────────────────────────────────────

/** @type {readonly EnumOption[]} */
export const GUEST_SIDE_OPTIONS = /** @type {const} */ ([
  { value: "groom", labelKey: "side_groom", color: "var(--color-primary)", icon: "🤵" },
  { value: "bride", labelKey: "side_bride", color: "var(--color-secondary)", icon: "👰" },
  { value: "mutual", labelKey: "side_mutual", color: "var(--color-neutral)", icon: "💑" },
]);

export const GUEST_SIDE_VALUES = new Set(GUEST_SIDE_OPTIONS.map((o) => o.value));

// ── Guest group ────────────────────────────────────────────────────────────

/** @type {readonly EnumOption[]} */
export const GUEST_GROUP_OPTIONS = /** @type {const} */ ([
  {
    value: "family",
    labelKey: "group_family",
    color: "var(--color-rose)",
    icon: "👨‍👩‍👧‍👦",
  },
  {
    value: "friends",
    labelKey: "group_friends",
    color: "var(--color-blue)",
    icon: "👥",
  },
  {
    value: "work",
    labelKey: "group_work",
    color: "var(--color-purple)",
    icon: "💼",
  },
  {
    value: "neighbors",
    labelKey: "group_neighbors",
    color: "var(--color-green)",
    icon: "🏠",
  },
  {
    value: "other",
    labelKey: "group_other",
    color: "var(--color-neutral)",
    icon: "🔖",
  },
]);

export const GUEST_GROUP_VALUES = new Set(GUEST_GROUP_OPTIONS.map((o) => o.value));

// ── Meal types ─────────────────────────────────────────────────────────────

/** @type {readonly EnumOption[]} */
export const MEAL_OPTIONS = /** @type {const} */ ([
  { value: "regular", labelKey: "meal_regular", color: "var(--color-neutral)", icon: "🍽️" },
  { value: "vegetarian", labelKey: "meal_vegetarian", color: "var(--color-green)", icon: "🥗" },
  { value: "vegan", labelKey: "meal_vegan", color: "var(--color-green)", icon: "🌱" },
  { value: "gluten_free", labelKey: "meal_gluten_free", color: "var(--color-yellow)", icon: "🌾" },
  { value: "kosher", labelKey: "meal_kosher", color: "var(--color-blue)", icon: "✡️" },
]);

export const MEAL_VALUES = new Set(MEAL_OPTIONS.map((o) => o.value));

// ── Table shapes ─────────────────────────────────────────────────────────

/** @type {readonly EnumOption[]} */
export const TABLE_SHAPE_OPTIONS = /** @type {const} */ ([
  { value: "round", labelKey: "table_shape_round", color: "var(--color-neutral)", icon: "⭕" },
  { value: "rect", labelKey: "table_shape_rect", color: "var(--color-neutral)", icon: "▬" },
]);

export const TABLE_SHAPE_VALUES = new Set(TABLE_SHAPE_OPTIONS.map((o) => o.value));

// ── Vendor categories ────────────────────────────────────────────────────

/** @type {readonly EnumOption[]} */
export const VENDOR_CATEGORY_OPTIONS = /** @type {const} */ ([
  { value: "venue", labelKey: "vendor_cat_venue", color: "var(--color-neutral)", icon: "🏛️" },
  { value: "catering", labelKey: "vendor_cat_catering", color: "var(--color-neutral)", icon: "🍴" },
  {
    value: "photography",
    labelKey: "vendor_cat_photography",
    color: "var(--color-neutral)",
    icon: "📷",
  },
  { value: "video", labelKey: "vendor_cat_video", color: "var(--color-neutral)", icon: "🎥" },
  { value: "flowers", labelKey: "vendor_cat_flowers", color: "var(--color-rose)", icon: "💐" },
  { value: "music", labelKey: "vendor_cat_music", color: "var(--color-purple)", icon: "🎵" },
  { value: "cake", labelKey: "vendor_cat_cake", color: "var(--color-yellow)", icon: "🎂" },
  { value: "attire", labelKey: "vendor_cat_attire", color: "var(--color-blue)", icon: "👗" },
  {
    value: "transport",
    labelKey: "vendor_cat_transport",
    color: "var(--color-neutral)",
    icon: "🚌",
  },
  { value: "other", labelKey: "vendor_cat_other", color: "var(--color-neutral)", icon: "📦" },
]);

export const VENDOR_CATEGORY_VALUES = new Set(VENDOR_CATEGORY_OPTIONS.map((o) => o.value));

// ── Expense categories ───────────────────────────────────────────────────

/** @type {readonly EnumOption[]} */
export const EXPENSE_CATEGORY_OPTIONS = /** @type {const} */ ([
  { value: "venue", labelKey: "expense_cat_venue", color: "var(--color-neutral)", icon: "🏛️" },
  {
    value: "catering",
    labelKey: "expense_cat_catering",
    color: "var(--color-neutral)",
    icon: "🍴",
  },
  {
    value: "photography",
    labelKey: "expense_cat_photography",
    color: "var(--color-neutral)",
    icon: "📷",
  },
  { value: "flowers", labelKey: "expense_cat_flowers", color: "var(--color-rose)", icon: "💐" },
  { value: "music", labelKey: "expense_cat_music", color: "var(--color-purple)", icon: "🎵" },
  {
    value: "transport",
    labelKey: "expense_cat_transport",
    color: "var(--color-neutral)",
    icon: "🚌",
  },
  { value: "clothing", labelKey: "expense_cat_clothing", color: "var(--color-blue)", icon: "👗" },
  { value: "misc", labelKey: "expense_cat_misc", color: "var(--color-neutral)", icon: "📦" },
]);

export const EXPENSE_CATEGORY_VALUES = new Set(EXPENSE_CATEGORY_OPTIONS.map((o) => o.value));

// ── Timeline categories ──────────────────────────────────────────────────

/** @type {readonly EnumOption[]} */
export const TIMELINE_CATEGORY_OPTIONS = /** @type {const} */ ([
  { value: "ceremony", labelKey: "timeline_cat_ceremony", color: "var(--color-rose)", icon: "💒" },
  {
    value: "reception",
    labelKey: "timeline_cat_reception",
    color: "var(--color-gold)",
    icon: "🥂",
  },
  {
    value: "preparation",
    labelKey: "timeline_cat_preparation",
    color: "var(--color-blue)",
    icon: "💄",
  },
  {
    value: "transport",
    labelKey: "timeline_cat_transport",
    color: "var(--color-neutral)",
    icon: "🚐",
  },
  { value: "meal", labelKey: "timeline_cat_meal", color: "var(--color-green)", icon: "🍽️" },
  {
    value: "photography",
    labelKey: "timeline_cat_photography",
    color: "var(--color-purple)",
    icon: "📷",
  },
  { value: "music", labelKey: "timeline_cat_music", color: "var(--color-purple)", icon: "🎵" },
  { value: "other", labelKey: "timeline_cat_other", color: "var(--color-neutral)", icon: "📌" },
]);

export const TIMELINE_CATEGORY_VALUES = new Set(TIMELINE_CATEGORY_OPTIONS.map((o) => o.value));

// ── Campaign types ────────────────────────────────────────────────────────

/** @type {readonly EnumOption[]} */
export const CAMPAIGN_TYPE_OPTIONS = /** @type {const} */ ([
  {
    value: "whatsapp",
    labelKey: "campaign_type_whatsapp",
    color: "var(--color-green)",
    icon: "💬",
  },
  { value: "email", labelKey: "campaign_type_email", color: "var(--color-blue)", icon: "📧" },
  { value: "sms", labelKey: "campaign_type_sms", color: "var(--color-neutral)", icon: "📱" },
]);

export const CAMPAIGN_TYPE_VALUES = new Set(CAMPAIGN_TYPE_OPTIONS.map((o) => o.value));

// ── Delivery statuses ─────────────────────────────────────────────────────

/** @type {readonly EnumOption[]} */
export const DELIVERY_STATUS_OPTIONS = /** @type {const} */ ([
  { value: "sent", labelKey: "delivery_status_sent", color: "var(--color-info)", icon: "📤" },
  {
    value: "delivered",
    labelKey: "delivery_status_delivered",
    color: "var(--color-success)",
    icon: "✅",
  },
  { value: "read", labelKey: "delivery_status_read", color: "var(--color-success)", icon: "👁️" },
  { value: "failed", labelKey: "delivery_status_failed", color: "var(--color-danger)", icon: "❌" },
  {
    value: "bounced",
    labelKey: "delivery_status_bounced",
    color: "var(--color-warning)",
    icon: "↩️",
  },
]);

export const DELIVERY_STATUS_VALUES = new Set(DELIVERY_STATUS_OPTIONS.map((o) => o.value));

// ── Generic helpers ───────────────────────────────────────────────────────

/**
 * Find an enum option by value and return the full option object.
 *
 * @template {EnumOption} T
 * @param {readonly T[]} options
 * @param {string} value
 * @returns {T|undefined}
 */
export function findOption(options, value) {
  return options.find((o) => o.value === value);
}

/**
 * Check whether a value is a valid member of an option list.
 *
 * @param {ReadonlySet<string>} valueSet
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidEnumValue(valueSet, value) {
  return typeof value === "string" && valueSet.has(value);
}
