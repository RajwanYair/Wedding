/**
 * tests/unit/view-model.test.mjs — Sprint 153
 */

import { describe, it, expect } from "vitest";
import {
  toGuestViewModel,
  toTableViewModel,
  toVendorViewModel,
  toExpenseViewModel,
} from "../../src/utils/view-model.js";

// ── helpers ────────────────────────────────────────────────────────────────

function guest(overrides = {}) {
  return {
    id: "g1",
    firstName: "Moshe",
    lastName: "Cohen",
    phone: "0521234567",
    status: "confirmed",
    count: 2,
    children: 1,
    tableId: "t1",
    meal: "regular",
    ...overrides,
  };
}

function table(overrides = {}) {
  return { id: "t1", name: "Table 1", capacity: 8, shape: "round", ...overrides };
}

function vendor(overrides = {}) {
  return { id: "v1", name: "DJ Max", category: "music", price: 5000, paid: 2000, ...overrides };
}

function expense(overrides = {}) {
  return { id: "e1", category: "catering", description: "Appetizers", amount: 1200, date: "2025-09-01", ...overrides };
}

// ── GuestViewModel ─────────────────────────────────────────────────────────

describe("toGuestViewModel", () => {
  it("returns fullName from first + last name", () => {
    const vm = toGuestViewModel(guest());
    expect(vm.fullName).toContain("Moshe");
  });

  it("converts phone via cleanPhone", () => {
    const vm = toGuestViewModel(guest());
    expect(vm.displayPhone).toBe("972521234567");
  });

  it("returns empty displayPhone when no phone", () => {
    const vm = toGuestViewModel(guest({ phone: undefined }));
    expect(vm.displayPhone).toBe("");
  });

  it("sets statusLabel from status", () => {
    expect(toGuestViewModel(guest({ status: "declined" })).statusLabel).toBe("declined");
  });

  it("defaults statusLabel to pending for unknown", () => {
    expect(toGuestViewModel(guest({ status: "unknown_xyz" })).statusLabel).toBe("unknown_xyz");
  });

  it("computes totalPeople = count + children", () => {
    expect(toGuestViewModel(guest({ count: 2, children: 1 })).totalPeople).toBe(3);
  });

  it("sets isConfirmed true for confirmed status", () => {
    expect(toGuestViewModel(guest()).isConfirmed).toBe(true);
    expect(toGuestViewModel(guest({ status: "pending" })).isConfirmed).toBe(false);
  });

  it("sets isDeclined true for declined status", () => {
    expect(toGuestViewModel(guest({ status: "declined" })).isDeclined).toBe(true);
  });

  it("sets seatLabel to table string when tableId set", () => {
    expect(toGuestViewModel(guest({ tableId: "t3" })).seatLabel).toContain("t3");
  });

  it("seatLabel is Unseated when no tableId", () => {
    expect(toGuestViewModel(guest({ tableId: undefined })).seatLabel).toBe("Unseated");
  });

  it("hasDietaryNeeds is true for non-regular meal", () => {
    expect(toGuestViewModel(guest({ meal: "vegan" })).hasDietaryNeeds).toBe(true);
  });

  it("hasDietaryNeeds is false for regular meal without notes", () => {
    expect(toGuestViewModel(guest({ meal: "regular", mealNotes: "" })).hasDietaryNeeds).toBe(false);
  });

  it("preserves rawGuest reference", () => {
    const g = guest();
    expect(toGuestViewModel(g).rawGuest).toBe(g);
  });
});

// ── TableViewModel ─────────────────────────────────────────────────────────

describe("toTableViewModel", () => {
  it("computes seatedCount from guests at this table", () => {
    const guests = [
      guest({ tableId: "t1", count: 2, children: 0 }),
      guest({ id: "g2", tableId: "t1", count: 1, children: 0 }),
    ];
    const vm = toTableViewModel(table(), guests);
    expect(vm.seatedCount).toBe(3);
  });

  it("excludes declined guests from seatedCount", () => {
    const guests = [
      guest({ tableId: "t1", status: "confirmed", count: 2, children: 0 }),
      guest({ id: "g2", tableId: "t1", status: "declined", count: 1, children: 0 }),
    ];
    const vm = toTableViewModel(table(), guests);
    expect(vm.seatedCount).toBe(2);
  });

  it("returns 0 seatedCount with no guests", () => {
    const vm = toTableViewModel(table(), []);
    expect(vm.seatedCount).toBe(0);
  });

  it("computes availableSeats correctly", () => {
    const guests = [guest({ tableId: "t1", count: 3, children: 0 })];
    const vm = toTableViewModel(table({ capacity: 8 }), guests);
    expect(vm.availableSeats).toBe(5);
  });

  it("isFull is true when seatedCount >= capacity", () => {
    const guests = [guest({ tableId: "t1", count: 8, children: 0 })];
    const vm = toTableViewModel(table({ capacity: 8 }), guests);
    expect(vm.isFull).toBe(true);
  });

  it("shapeLabel = Round for round table", () => {
    expect(toTableViewModel(table({ shape: "round" })).shapeLabel).toBe("Round");
  });

  it("shapeLabel = Rectangular for rect table", () => {
    expect(toTableViewModel(table({ shape: "rect" })).shapeLabel).toBe("Rectangular");
  });
});

// ── VendorViewModel ────────────────────────────────────────────────────────

describe("toVendorViewModel", () => {
  it("formats price with shekel sign", () => {
    const vm = toVendorViewModel(vendor());
    expect(vm.priceFormatted).toMatch(/₪/);
  });

  it("computes balance correctly", () => {
    const vm = toVendorViewModel(vendor({ price: 5000, paid: 2000 }));
    expect(vm.balanceFormatted).toContain("3,000");
  });

  it("isPaid is true when paid equals price", () => {
    expect(toVendorViewModel(vendor({ price: 1000, paid: 1000 })).isPaid).toBe(true);
  });

  it("isPaid is false when balance remains", () => {
    expect(toVendorViewModel(vendor({ price: 1000, paid: 500 })).isPaid).toBe(false);
  });

  it("paymentPercent is correct", () => {
    expect(toVendorViewModel(vendor({ price: 1000, paid: 250 })).paymentPercent).toBe(25);
  });

  it("paymentPercent is 0 when price is 0", () => {
    expect(toVendorViewModel(vendor({ price: 0, paid: 0 })).paymentPercent).toBe(0);
  });
});

// ── ExpenseViewModel ───────────────────────────────────────────────────────

describe("toExpenseViewModel", () => {
  it("returns categoryLabel", () => {
    expect(toExpenseViewModel(expense()).categoryLabel).toBe("catering");
  });

  it("formats amount with shekel sign", () => {
    expect(toExpenseViewModel(expense()).amountFormatted).toMatch(/₪/);
  });

  it("defaults category to Uncategorized", () => {
    expect(toExpenseViewModel(expense({ category: undefined })).categoryLabel).toBe("Uncategorized");
  });

  it("shows em-dash when no date", () => {
    expect(toExpenseViewModel(expense({ date: undefined })).dateDisplay).toBe("—");
  });

  it("preserves rawExpense reference", () => {
    const e = expense();
    expect(toExpenseViewModel(e).rawExpense).toBe(e);
  });
});
