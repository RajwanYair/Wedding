/**
 * src/services/domain-validator.js — Domain entity validation service (Sprint 56)
 *
 * Pure functions that validate entity objects against required field rules
 * and enum constraints, returning a structured ValidationResult.
 *
 * No store dependencies — functions are side-effect free and easily testable.
 *
 * Usage:
 *   import { validateGuest } from "../services/domain-validator.js";
 *   const result = validateGuest({ firstName: "Alice", ... });
 *   if (!result.valid) console.log(result.errors);
 */

import {
  GUEST_STATUS_VALUES,
  GUEST_SIDE_VALUES,
  GUEST_GROUP_VALUES,
  MEAL_VALUES,
  TABLE_SHAPE_VALUES,
  VENDOR_CATEGORY_VALUES,
  EXPENSE_CATEGORY_VALUES,
} from "../core/domain-enums.js";

/**
 * @typedef {{
 *   valid: boolean,
 *   errors: Record<string, string>
 * }} ValidationResult
 */

/**
 * @param {Record<string, string>} errors
 * @returns {ValidationResult}
 */
function result(errors) {
  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validate a guest object.
 * @param {object} guest
 * @returns {ValidationResult}
 */
export function validateGuest(guest) {
  /** @type {Record<string, string>} */
  const errors = {};

  if (!guest || typeof guest !== "object")
    return { valid: false, errors: { _root: "not an object" } };

  const g = /** @type {Record<string, unknown>} */ (guest);

  if (!g.firstName || typeof g.firstName !== "string" || !g.firstName.trim()) {
    errors.firstName = "required";
  }
  if (!g.lastName || typeof g.lastName !== "string" || !g.lastName.trim()) {
    errors.lastName = "required";
  }
  if (g.phone !== undefined && g.phone !== null && g.phone !== "") {
    if (typeof g.phone !== "string") errors.phone = "must be string";
  }
  if (g.email !== undefined && g.email !== null && g.email !== "") {
    if (typeof g.email !== "string" || !g.email.includes("@")) {
      errors.email = "invalid email";
    }
  }
  if (g.count !== undefined && g.count !== null) {
    const n = Number(g.count);
    if (!Number.isInteger(n) || n < 1) errors.count = "must be positive integer";
  }
  if (g.children !== undefined && g.children !== null) {
    const n = Number(g.children);
    if (!Number.isInteger(n) || n < 0) errors.children = "must be non-negative integer";
  }
  if (g.status && !GUEST_STATUS_VALUES.has(String(g.status))) {
    errors.status = `must be one of: ${[...GUEST_STATUS_VALUES].join(", ")}`;
  }
  if (g.side && !GUEST_SIDE_VALUES.has(String(g.side))) {
    errors.side = `must be one of: ${[...GUEST_SIDE_VALUES].join(", ")}`;
  }
  if (g.group && !GUEST_GROUP_VALUES.has(String(g.group))) {
    errors.group = `must be one of: ${[...GUEST_GROUP_VALUES].join(", ")}`;
  }
  if (g.meal && !MEAL_VALUES.has(String(g.meal))) {
    errors.meal = `must be one of: ${[...MEAL_VALUES].join(", ")}`;
  }

  return result(errors);
}

/**
 * Validate a table object.
 * @param {object} table
 * @returns {ValidationResult}
 */
export function validateTable(table) {
  /** @type {Record<string, string>} */
  const errors = {};
  if (!table || typeof table !== "object")
    return { valid: false, errors: { _root: "not an object" } };

  const t = /** @type {Record<string, unknown>} */ (table);

  if (!t.name || typeof t.name !== "string" || !t.name.trim()) {
    errors.name = "required";
  }
  const cap = Number(t.capacity);
  if (!t.capacity || !Number.isInteger(cap) || cap < 1) {
    errors.capacity = "must be positive integer";
  }
  if (t.shape && !TABLE_SHAPE_VALUES.has(String(t.shape))) {
    errors.shape = `must be one of: ${[...TABLE_SHAPE_VALUES].join(", ")}`;
  }

  return result(errors);
}

/**
 * Validate a vendor object.
 * @param {object} vendor
 * @returns {ValidationResult}
 */
export function validateVendor(vendor) {
  /** @type {Record<string, string>} */
  const errors = {};
  if (!vendor || typeof vendor !== "object")
    return { valid: false, errors: { _root: "not an object" } };

  const v = /** @type {Record<string, unknown>} */ (vendor);

  if (!v.name || typeof v.name !== "string" || !v.name.trim()) {
    errors.name = "required";
  }
  if (v.category && !VENDOR_CATEGORY_VALUES.has(String(v.category))) {
    errors.category = `must be one of: ${[...VENDOR_CATEGORY_VALUES].join(", ")}`;
  }
  if (v.price !== undefined && v.price !== null) {
    const p = Number(v.price);
    if (Number.isNaN(p) || p < 0) errors.price = "must be non-negative number";
  }
  if (v.paid !== undefined && v.paid !== null) {
    const p = Number(v.paid);
    if (Number.isNaN(p) || p < 0) errors.paid = "must be non-negative number";
  }

  return result(errors);
}

/**
 * Validate an expense object.
 * @param {object} expense
 * @returns {ValidationResult}
 */
export function validateExpense(expense) {
  /** @type {Record<string, string>} */
  const errors = {};
  if (!expense || typeof expense !== "object")
    return { valid: false, errors: { _root: "not an object" } };

  const e = /** @type {Record<string, unknown>} */ (expense);

  if (!e.description || typeof e.description !== "string" || !e.description.trim()) {
    errors.description = "required";
  }
  const amount = Number(e.amount);
  if (e.amount === undefined || e.amount === null || Number.isNaN(amount) || amount < 0) {
    errors.amount = "must be non-negative number";
  }
  if (e.category && !EXPENSE_CATEGORY_VALUES.has(String(e.category))) {
    errors.category = `must be one of: ${[...EXPENSE_CATEGORY_VALUES].join(", ")}`;
  }

  return result(errors);
}
