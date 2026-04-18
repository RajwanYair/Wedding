/**
 * src/utils/view-model.js — DTO / view-model transforms (Sprint 153)
 *
 * Converts raw domain objects (Guest, Table, Vendor, Expense) into
 * presentation-ready view models. Keeps UI layer decoupled from raw
 * storage shape, makes adding derived fields trivial, and provides a
 * single place to handle defaults, formatting, and masking.
 */

import { guestFullName } from "./misc.js";
import { cleanPhone } from "./phone.js";

// ── Guest ──────────────────────────────────────────────────────────────────

/**
 * @typedef {import('../types.d.ts').Guest} Guest
 * @typedef {import('../types.d.ts').Table} Table
 * @typedef {import('../types.d.ts').Vendor} Vendor
 * @typedef {import('../types.d.ts').Expense} Expense
 */

/**
 * @typedef {{
 *   id: string,
 *   fullName: string,
 *   displayPhone: string,
 *   statusLabel: string,
 *   seatLabel: string,
 *   totalPeople: number,
 *   isConfirmed: boolean,
 *   isPending: boolean,
 *   isDeclined: boolean,
 *   hasDietaryNeeds: boolean,
 *   rawGuest: Guest,
 * }} GuestViewModel
 */

/**
 * @param {Guest} guest
 * @returns {GuestViewModel}
 */
export function toGuestViewModel(guest) {
  const totalPeople = (guest.count ?? 1) + (guest.children ?? 0);
  return {
    id: guest.id,
    fullName: guestFullName(guest),
    displayPhone: guest.phone ? cleanPhone(guest.phone) : "",
    statusLabel: guest.status ?? "pending",
    seatLabel: guest.tableId ? `Table ${guest.tableId}` : "Unseated",
    totalPeople,
    isConfirmed: guest.status === "confirmed",
    isPending: guest.status === "pending" || !guest.status,
    isDeclined: guest.status === "declined",
    hasDietaryNeeds:
      Boolean(guest.meal && guest.meal !== "regular") ||
      Boolean(guest.mealNotes),
    rawGuest: guest,
  };
}

// ── Table ──────────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   capacityLabel: string,
 *   shapeLabel: string,
 *   seatedCount: number,
 *   availableSeats: number,
 *   isFull: boolean,
 *   rawTable: Table,
 * }} TableViewModel
 */

/**
 * @param {Table} table
 * @param {Guest[]} [guests]
 * @returns {TableViewModel}
 */
export function toTableViewModel(table, guests = []) {
  const seated = guests.filter((g) => g.tableId === table.id && g.status !== "declined");
  const seatedCount = seated.reduce((n, g) => n + (g.count ?? 1) + (g.children ?? 0), 0);
  const capacity = table.capacity ?? 0;
  return {
    id: table.id,
    name: table.name ?? `Table ${table.id}`,
    capacityLabel: `${seatedCount} / ${capacity}`,
    shapeLabel: table.shape === "rect" ? "Rectangular" : "Round",
    seatedCount,
    availableSeats: Math.max(0, capacity - seatedCount),
    isFull: seatedCount >= capacity,
    rawTable: table,
  };
}

// ── Vendor ─────────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   id: string,
 *   displayName: string,
 *   categoryLabel: string,
 *   priceFormatted: string,
 *   paidFormatted: string,
 *   balanceFormatted: string,
 *   isPaid: boolean,
 *   paymentPercent: number,
 *   rawVendor: Vendor,
 * }} VendorViewModel
 */

/**
 * @param {Vendor} vendor
 * @returns {VendorViewModel}
 */
export function toVendorViewModel(vendor) {
  const price = vendor.price ?? 0;
  const paid = vendor.paid ?? 0;
  const balance = Math.max(0, price - paid);
  const paymentPercent = price > 0 ? Math.round((paid / price) * 100) : 0;
  return {
    id: vendor.id,
    displayName: vendor.name ?? "Unnamed Vendor",
    categoryLabel: vendor.category ?? "Other",
    priceFormatted: `₪${price.toLocaleString()}`,
    paidFormatted: `₪${paid.toLocaleString()}`,
    balanceFormatted: `₪${balance.toLocaleString()}`,
    isPaid: balance === 0 && price > 0,
    paymentPercent,
    rawVendor: vendor,
  };
}

// ── Expense ────────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   id: string,
 *   categoryLabel: string,
 *   descriptionDisplay: string,
 *   amountFormatted: string,
 *   dateDisplay: string,
 *   rawExpense: Expense,
 * }} ExpenseViewModel
 */

/**
 * @param {Expense} expense
 * @returns {ExpenseViewModel}
 */
export function toExpenseViewModel(expense) {
  return {
    id: expense.id,
    categoryLabel: expense.category ?? "Uncategorized",
    descriptionDisplay: expense.description ?? "—",
    amountFormatted: `₪${(expense.amount ?? 0).toLocaleString()}`,
    dateDisplay: expense.date
      ? new Date(expense.date).toLocaleDateString("he-IL")
      : "—",
    rawExpense: expense,
  };
}
