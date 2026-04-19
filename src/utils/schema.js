/**
 * src/utils/schema.js — Valibot-based schema validation (S20b)
 *
 * Replaces the coercion logic in `sanitize.js` for key data models.
 * Valibot is 3 KB gzip, tree-shakeable, and type-safe.
 *
 * Each domain model (Guest, Table, Vendor, Expense) has a parse schema
 * that: validates types, trims strings, clamps lengths, enforces enums,
 * and returns typed output.
 *
 * Usage:
 *   import { parseGuest, parseTable } from "../utils/schema.js";
 *   const result = parseGuest(rawInput);
 *   if (result.success) { ... result.output ... }
 *   else { ... result.issues ... }
 */

import * as v from "valibot";

// ── Re-usable primitives ───────────────────────────────────────────────────

/** Short string — trimmed, max 100 chars */
const _shortStr = v.pipe(v.string(), v.trim(), v.maxLength(100));
/** Long string — trimmed, max 1000 chars */
const _longStr = v.pipe(v.string(), v.trim(), v.maxLength(1000));
/** Optional short string */
const _optStr = v.optional(v.pipe(v.string(), v.trim(), v.maxLength(100)), "");
/** Non-negative number */
const _count = v.pipe(v.number(), v.minValue(0));
/** Optional non-negative number */
const _optCount = v.optional(v.pipe(v.number(), v.minValue(0)), 0);
/** HTTPS URL or empty string */
const _url = v.optional(
  v.union([
    v.literal(""),
    v.pipe(v.string(), v.url(), v.startsWith("https://")),
  ]),
  ""
);

// ── Phone ──────────────────────────────────────────────────────────────────

export const PhoneSchema = v.optional(
  v.pipe(v.string(), v.trim(), v.maxLength(20)),
  ""
);

// ── Guest ──────────────────────────────────────────────────────────────────

export const GuestStatusSchema = v.picklist([
  "pending", "confirmed", "declined", "maybe",
]);
export const GuestSideSchema = v.picklist([
  "groom", "bride", "mutual",
]);
export const GuestGroupSchema = v.picklist([
  "family", "friends", "work", "neighbors", "other",
]);
export const GuestMealSchema = v.picklist([
  "regular", "vegetarian", "vegan", "gluten_free", "kosher",
]);

export const GuestSchema = v.object({
  id:            v.optional(_shortStr, ""),
  firstName:     _shortStr,
  lastName:      _optStr,
  phone:         PhoneSchema,
  email:         v.optional(v.pipe(v.string(), v.trim(), v.maxLength(200)), ""),
  count:         v.optional(_count, 1),
  children:      _optCount,
  status:        v.optional(GuestStatusSchema, "pending"),
  side:          v.optional(GuestSideSchema, "mutual"),
  group:         v.optional(GuestGroupSchema, "other"),
  meal:          v.optional(GuestMealSchema, "regular"),
  mealNotes:     _optStr,
  accessibility: _optStr,
  tableId:       _optStr,
  gift:          v.optional(v.pipe(v.number(), v.minValue(0)), 0),
  notes:         v.optional(_longStr, ""),
  sent:          v.optional(v.boolean(), false),
  checkedIn:     v.optional(v.boolean(), false),
  rsvpDate:      _optStr,
  createdAt:     _optStr,
  updatedAt:     _optStr,
});

/** @typedef {v.InferOutput<typeof GuestSchema>} Guest */

// ── Table ──────────────────────────────────────────────────────────────────

export const TableShapeSchema = v.picklist(["round", "rect"]);

export const TableSchema = v.object({
  id:       v.optional(_shortStr, ""),
  name:     _shortStr,
  capacity: v.pipe(v.number(), v.minValue(1), v.maxValue(100)),
  shape:    v.optional(TableShapeSchema, "round"),
});

/** @typedef {v.InferOutput<typeof TableSchema>} Table */

// ── Vendor ─────────────────────────────────────────────────────────────────

export const VendorSchema = v.object({
  id:        v.optional(_shortStr, ""),
  category:  _optStr,
  name:      _shortStr,
  contact:   _optStr,
  phone:     PhoneSchema,
  price:     v.optional(v.pipe(v.number(), v.minValue(0)), 0),
  paid:      v.optional(v.pipe(v.number(), v.minValue(0)), 0),
  notes:     v.optional(_longStr, ""),
  updatedAt: _optStr,
  createdAt: _optStr,
});

/** @typedef {v.InferOutput<typeof VendorSchema>} Vendor */

// ── Expense ────────────────────────────────────────────────────────────────

export const ExpenseSchema = v.object({
  id:          v.optional(_shortStr, ""),
  category:    _optStr,
  description: _shortStr,
  amount:      v.pipe(v.number(), v.minValue(0)),
  date:        v.optional(_shortStr, ""),
  createdAt:   _optStr,
});

/** @typedef {v.InferOutput<typeof ExpenseSchema>} Expense */

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Safe parse — never throws. Returns success/failure shape.
 * @template T
 * @param {v.BaseSchema<unknown, T, v.BaseIssue<unknown>>} schema
 * @param {unknown} data
 * @returns {{ success: true, output: T } | { success: false, issues: v.BaseIssue<unknown>[] }}
 */
export function safeParse(schema, data) {
  const result = v.safeParse(schema, data);
  if (result.success) return { success: true, output: result.output };
  return { success: false, issues: result.issues };
}

/**
 * Parse a guest object. Coerces, trims, applies defaults.
 * @param {unknown} raw
 * @returns {{ success: true, output: Guest } | { success: false, issues: v.BaseIssue<unknown>[] }}
 */
export function parseGuest(raw) {
  return /** @type {any} */ (safeParse(GuestSchema, raw));
}

/**
 * Parse a table object.
 * @param {unknown} raw
 * @returns {{ success: true, output: Table } | { success: false, issues: v.BaseIssue<unknown>[] }}
 */
export function parseTable(raw) {
  return /** @type {any} */ (safeParse(TableSchema, raw));
}

/**
 * Parse a vendor object.
 * @param {unknown} raw
 * @returns {{ success: true, output: Vendor } | { success: false, issues: v.BaseIssue<unknown>[] }}
 */
export function parseVendor(raw) {
  return /** @type {any} */ (safeParse(VendorSchema, raw));
}

/**
 * Parse an expense object.
 * @param {unknown} raw
 * @returns {{ success: true, output: Expense } | { success: false, issues: v.BaseIssue<unknown>[] }}
 */
export function parseExpense(raw) {
  return /** @type {any} */ (safeParse(ExpenseSchema, raw));
}
