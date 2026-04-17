/**
 * tests/unit/vendor-handlers.test.mjs — Sprint 192
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/core/events.js", () => ({ on: vi.fn() }));
vi.mock("../../src/core/ui.js", () => ({
  showToast: vi.fn(), openModal: vi.fn(), closeModal: vi.fn(), showConfirmDialog: vi.fn(),
}));
vi.mock("../../src/core/i18n.js", () => ({ t: vi.fn((k) => k) }));
vi.mock("../../src/utils/form-helpers.js", () => ({ getVal: vi.fn(() => "") }));
vi.mock("../../src/sections/vendors.js", () => ({
  saveVendor: vi.fn(), deleteVendor: vi.fn(), exportVendorsCSV: vi.fn(),
  filterVendorsByCategory: vi.fn(), openVendorForEdit: vi.fn(),
  exportVendorPaymentsCSV: vi.fn(), setVendorPaymentFilter: vi.fn(),
}));
vi.mock("../../src/sections/expenses.js", () => ({
  saveExpense: vi.fn(), deleteExpense: vi.fn(), exportExpensesCSV: vi.fn(),
  filterExpensesByCategory: vi.fn(), setExpenseCategoryFilter: vi.fn(), openExpenseForEdit: vi.fn(),
}));

import { registerVendorHandlers } from "../../src/handlers/vendor-handlers.js";
import { on } from "../../src/core/events.js";

describe("registerVendorHandlers", () => {
  it("is a function", () => {
    expect(typeof registerVendorHandlers).toBe("function");
  });

  it("registers handlers via on()", () => {
    vi.mocked(on).mockClear();
    registerVendorHandlers();
    expect(vi.mocked(on).mock.calls.length).toBeGreaterThan(0);
  });

  it("does not throw", () => {
    expect(() => registerVendorHandlers()).not.toThrow();
  });

  it("registers saveVendor handler", () => {
    vi.mocked(on).mockClear();
    registerVendorHandlers();
    const actions = vi.mocked(on).mock.calls.map((c) => c[0]);
    expect(actions).toContain("saveVendor");
  });

  it("registers saveExpense handler", () => {
    vi.mocked(on).mockClear();
    registerVendorHandlers();
    const actions = vi.mocked(on).mock.calls.map((c) => c[0]);
    expect(actions).toContain("saveExpense");
  });
});
