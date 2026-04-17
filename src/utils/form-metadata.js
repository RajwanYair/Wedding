/**
 * src/utils/form-metadata.js — Consolidated form field metadata (Sprint 55)
 *
 * Single source of truth for field names, types, required flags, and select
 * options for the four core entity forms: Guest, Table, Vendor, Expense.
 *
 * Usage:
 *   import { GUEST_FIELDS, getFieldMeta } from "../utils/form-metadata.js";
 *   const meta = getFieldMeta("guest", "status"); // → { label, type, required, options }
 */

import {
  GUEST_STATUS_OPTIONS,
  GUEST_SIDE_OPTIONS,
  GUEST_GROUP_OPTIONS,
  MEAL_OPTIONS,
  TABLE_SHAPE_OPTIONS,
  VENDOR_CATEGORY_OPTIONS,
  EXPENSE_CATEGORY_OPTIONS,
} from "../core/domain-enums.js";

/**
 * @typedef {{
 *   name: string,
 *   labelKey: string,
 *   type: "text"|"number"|"tel"|"email"|"select"|"textarea"|"checkbox",
 *   required?: boolean,
 *   options?: readonly import("../core/domain-enums.js").EnumOption[]
 * }} FieldMeta
 */

// ── Guest fields ──────────────────────────────────────────────────────────

/** @type {readonly FieldMeta[]} */
export const GUEST_FIELDS = /** @type {const} */ ([
  { name: "firstName", labelKey: "field_first_name", type: "text",     required: true },
  { name: "lastName",  labelKey: "field_last_name",  type: "text",     required: true },
  { name: "phone",     labelKey: "field_phone",      type: "tel" },
  { name: "email",     labelKey: "field_email",      type: "email" },
  { name: "count",     labelKey: "field_count",      type: "number" },
  { name: "children",  labelKey: "field_children",   type: "number" },
  { name: "status",    labelKey: "field_status",     type: "select",   options: GUEST_STATUS_OPTIONS },
  { name: "side",      labelKey: "field_side",       type: "select",   options: GUEST_SIDE_OPTIONS },
  { name: "group",     labelKey: "field_group",      type: "select",   options: GUEST_GROUP_OPTIONS },
  { name: "meal",      labelKey: "field_meal",       type: "select",   options: MEAL_OPTIONS },
  { name: "mealNotes", labelKey: "field_meal_notes", type: "text" },
  { name: "notes",     labelKey: "field_notes",      type: "textarea" },
  { name: "gift",      labelKey: "field_gift",       type: "number" },
  { name: "tableId",   labelKey: "field_table",      type: "text" },
]);

// ── Table fields ─────────────────────────────────────────────────────────

/** @type {readonly FieldMeta[]} */
export const TABLE_FIELDS = /** @type {const} */ ([
  { name: "name",     labelKey: "field_table_name",     type: "text",   required: true },
  { name: "capacity", labelKey: "field_table_capacity", type: "number", required: true },
  { name: "shape",    labelKey: "field_table_shape",    type: "select", options: TABLE_SHAPE_OPTIONS },
]);

// ── Vendor fields ─────────────────────────────────────────────────────────

/** @type {readonly FieldMeta[]} */
export const VENDOR_FIELDS = /** @type {const} */ ([
  { name: "name",     labelKey: "field_vendor_name",     type: "text",   required: true },
  { name: "category", labelKey: "field_vendor_category", type: "select", options: VENDOR_CATEGORY_OPTIONS },
  { name: "contact",  labelKey: "field_vendor_contact",  type: "text" },
  { name: "phone",    labelKey: "field_vendor_phone",    type: "tel" },
  { name: "price",    labelKey: "field_vendor_price",    type: "number" },
  { name: "paid",     labelKey: "field_vendor_paid",     type: "number" },
  { name: "notes",    labelKey: "field_vendor_notes",    type: "textarea" },
]);

// ── Expense fields ────────────────────────────────────────────────────────

/** @type {readonly FieldMeta[]} */
export const EXPENSE_FIELDS = /** @type {const} */ ([
  { name: "description", labelKey: "field_expense_desc",     type: "text",   required: true },
  { name: "category",    labelKey: "field_expense_category", type: "select", options: EXPENSE_CATEGORY_OPTIONS },
  { name: "amount",      labelKey: "field_expense_amount",   type: "number", required: true },
  { name: "date",        labelKey: "field_expense_date",     type: "text" },
]);

// ── Registry ──────────────────────────────────────────────────────────────

/** @type {Record<string, readonly FieldMeta[]>} */
const DOMAIN_FIELDS = {
  guest:   GUEST_FIELDS,
  table:   TABLE_FIELDS,
  vendor:  VENDOR_FIELDS,
  expense: EXPENSE_FIELDS,
};

/**
 * Look up field metadata for a given domain + field name.
 * @param {"guest"|"table"|"vendor"|"expense"} domain
 * @param {string} fieldName
 * @returns {FieldMeta | undefined}
 */
export function getFieldMeta(domain, fieldName) {
  return DOMAIN_FIELDS[domain]?.find((f) => f.name === fieldName);
}

/**
 * List all field names for a domain.
 * @param {"guest"|"table"|"vendor"|"expense"} domain
 * @returns {string[]}
 */
export function listFieldNames(domain) {
  return (DOMAIN_FIELDS[domain] ?? []).map((f) => f.name);
}

/**
 * Return all required fields for a domain.
 * @param {"guest"|"table"|"vendor"|"expense"} domain
 * @returns {FieldMeta[]}
 */
export function getRequiredFields(domain) {
  return (DOMAIN_FIELDS[domain] ?? []).filter((f) => f.required === true);
}
