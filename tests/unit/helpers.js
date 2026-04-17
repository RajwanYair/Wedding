/**
 * tests/unit/helpers.js — Shared test factory functions
 *
 * Single source of truth for test fixtures used across unit/integration tests.
 * All factory functions accept an `overrides` object so callers can specialise
 * only the fields that matter for a given test.
 *
 * Usage:
 *   import { makeGuest, makeTable, makeVendor, makeExpense } from "./helpers.js";
 */

// ── Guest ─────────────────────────────────────────────────────────────────────

/**
 * Build a canonical Guest fixture.  Includes every field defined in the
 * Guest data model so tests that inspect individual properties always have a
 * safe default to fall back on.
 *
 * @param {Record<string, unknown>} [overrides]
 * @returns {import("../../src/types.d.ts").Guest}
 */
export function makeGuest(overrides = {}) {
  return {
    id: `g_${Math.random().toString(36).slice(2)}`,
    firstName: "Test",
    lastName: "Guest",
    phone: "",
    email: "",
    count: 1,
    children: 0,
    status: "pending",
    side: "groom",
    group: "friends",
    meal: "regular",
    mealNotes: "",
    accessibility: false,
    tableId: null,
    gift: "",
    notes: "",
    sent: false,
    checkedIn: false,
    rsvpDate: null,
    vip: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Table ─────────────────────────────────────────────────────────────────────

/**
 * Build a canonical Table fixture.
 *
 * @param {Record<string, unknown>} [overrides]
 * @returns {{ id: string, name: string, capacity: number, shape: string }}
 */
export function makeTable(overrides = {}) {
  return {
    id: `t_${Math.random().toString(36).slice(2)}`,
    name: "Table 1",
    capacity: 8,
    shape: "round",
    ...overrides,
  };
}

// ── Vendor ────────────────────────────────────────────────────────────────────

/**
 * Build a canonical Vendor fixture.
 *
 * @param {Record<string, unknown>} [overrides]
 * @returns {{ category: string, name: string, contact: string, phone: string, price: number, paid: number, notes: string }}
 */
export function makeVendor(overrides = {}) {
  return {
    category: "Photography",
    name: "Dan Photography",
    contact: "",
    phone: "",
    price: 5000,
    paid: 0,
    notes: "",
    ...overrides,
  };
}

// ── Expense ───────────────────────────────────────────────────────────────────

/**
 * Build a canonical Expense fixture.
 *
 * @param {Record<string, unknown>} [overrides]
 * @returns {{ category: string, description: string, amount: number, date: string }}
 */
export function makeExpense(overrides = {}) {
  return {
    category: "Catering",
    description: "Wedding dinner",
    amount: 10000,
    date: "2024-06-01",
    ...overrides,
  };
}
