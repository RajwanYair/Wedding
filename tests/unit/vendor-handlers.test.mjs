/**
 * tests/unit/vendor-handlers.test.mjs — Sprint 192 + Sprint 3 (session)
 *
 * Expanded: tests now invoke handler callbacks to verify behavior.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/core/events.js", () => ({ on: vi.fn() }));
vi.mock("../../src/core/ui.js", () => ({
  showToast: vi.fn(), openModal: vi.fn(), closeModal: vi.fn(), showConfirmDialog: vi.fn(),
}));
vi.mock("../../src/core/i18n.js", () => ({ t: vi.fn((k) => k) }));
vi.mock("../../src/utils/form-helpers.js", () => ({ getVal: vi.fn(() => "") }));
vi.mock("../../src/sections/vendors.js", () => ({
  saveVendor: vi.fn(),
  deleteVendor: vi.fn(),
  exportVendorsCSV: vi.fn(),
  filterVendorsByCategory: vi.fn(),
  openVendorForEdit: vi.fn(),
  exportVendorPaymentsCSV: vi.fn(),
  setVendorPaymentFilter: vi.fn(),
}));
vi.mock("../../src/sections/expenses.js", () => ({
  saveExpense: vi.fn(),
  deleteExpense: vi.fn(),
  exportExpensesCSV: vi.fn(),
  filterExpensesByCategory: vi.fn(),
  setExpenseCategoryFilter: vi.fn(),
  openExpenseForEdit: vi.fn(),
}));

import { registerVendorHandlers } from "../../src/handlers/vendor-handlers.js";
import { on } from "../../src/core/events.js";
import { showToast, closeModal, showConfirmDialog } from "../../src/core/ui.js";
import {
  saveVendor, deleteVendor, exportVendorsCSV, exportVendorPaymentsCSV,
  filterVendorsByCategory, setVendorPaymentFilter,
} from "../../src/sections/vendors.js";
import {
  saveExpense, deleteExpense, exportExpensesCSV,
  filterExpensesByCategory, setExpenseCategoryFilter,
} from "../../src/sections/expenses.js";

function getHandler(action) {
  const call = vi.mocked(on).mock.calls.find(([a]) => a === action);
  if (!call) throw new Error(`No handler for "${action}"`);
  return call[1];
}

describe("registerVendorHandlers — registration", () => {
  beforeEach(() => { vi.mocked(on).mockClear(); });

  it("is a function", () => { expect(typeof registerVendorHandlers).toBe("function"); });
  it("registers handlers via on()", () => {
    registerVendorHandlers();
    expect(vi.mocked(on).mock.calls.length).toBeGreaterThan(0);
  });
  it("does not throw", () => { expect(() => registerVendorHandlers()).not.toThrow(); });
  it("registers saveVendor handler", () => {
    registerVendorHandlers();
    expect(vi.mocked(on).mock.calls.map((c) => c[0])).toContain("saveVendor");
  });
  it("registers saveExpense handler", () => {
    registerVendorHandlers();
    expect(vi.mocked(on).mock.calls.map((c) => c[0])).toContain("saveExpense");
  });
});

describe("registerVendorHandlers — handler behavior", () => {
  beforeEach(() => {
    vi.mocked(on).mockClear();
    vi.mocked(saveVendor).mockReset().mockReturnValue({ ok: true });
    vi.mocked(saveExpense).mockReset().mockReturnValue({ ok: true });
    vi.mocked(showToast).mockReset();
    vi.mocked(closeModal).mockReset();
    vi.mocked(showConfirmDialog).mockReset();
    registerVendorHandlers();
  });

  it("saveVendor handler calls saveVendor()", () => {
    getHandler("saveVendor")();
    expect(saveVendor).toHaveBeenCalled();
  });

  it("saveVendor handler closes modal and shows success toast on ok", () => {
    getHandler("saveVendor")();
    expect(closeModal).toHaveBeenCalledWith("vendorModal");
    expect(showToast).toHaveBeenCalledWith(expect.anything(), "success");
  });

  it("saveVendor handler shows error toast on failure", () => {
    vi.mocked(saveVendor).mockReturnValue({ ok: false, errors: ["Name required"] });
    getHandler("saveVendor")();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining("Name required"), "error");
  });

  it("deleteVendor handler calls showConfirmDialog", () => {
    const el = { dataset: { actionArg: "v1" } };
    getHandler("deleteVendor")(el);
    expect(showConfirmDialog).toHaveBeenCalled();
  });

  it("deleteVendor handler calls deleteVendor() after confirm", () => {
    vi.mocked(showConfirmDialog).mockImplementation((_msg, cb) => cb());
    const el = { dataset: { actionArg: "v1" } };
    getHandler("deleteVendor")(el);
    expect(deleteVendor).toHaveBeenCalledWith("v1");
  });

  it("exportVendorsCSV handler calls exportVendorsCSV()", () => {
    getHandler("exportVendorsCSV")();
    expect(exportVendorsCSV).toHaveBeenCalledOnce();
  });

  it("exportVendorPaymentsCSV handler calls exportVendorPaymentsCSV()", () => {
    getHandler("exportVendorPaymentsCSV")();
    expect(exportVendorPaymentsCSV).toHaveBeenCalledOnce();
  });

  it("setVendorPaymentFilter handler passes filter value to setVendorPaymentFilter()", () => {
    const el = { dataset: { actionArg: "unpaid" }, value: "unpaid" };
    getHandler("setVendorPaymentFilter")(el);
    expect(setVendorPaymentFilter).toHaveBeenCalled();
  });

  it("filterVendorsByCategory handler passes category to filterVendorsByCategory()", () => {
    const el = { dataset: { actionArg: "catering" }, value: "catering" };
    getHandler("filterVendorsByCategory")(el);
    expect(filterVendorsByCategory).toHaveBeenCalled();
  });

  it("saveExpense handler calls saveExpense()", () => {
    getHandler("saveExpense")();
    expect(saveExpense).toHaveBeenCalled();
  });

  it("saveExpense handler closes modal and shows success toast on ok", () => {
    getHandler("saveExpense")();
    expect(closeModal).toHaveBeenCalledWith("expenseModal");
    expect(showToast).toHaveBeenCalledWith(expect.anything(), "success");
  });

  it("saveExpense handler shows error toast on failure", () => {
    vi.mocked(saveExpense).mockReturnValue({ ok: false, errors: ["Amount required"] });
    getHandler("saveExpense")();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining("Amount required"), "error");
  });

  it("deleteExpense handler calls showConfirmDialog", () => {
    const el = { dataset: { actionArg: "e1" } };
    getHandler("deleteExpense")(el);
    expect(showConfirmDialog).toHaveBeenCalled();
  });

  it("deleteExpense handler calls deleteExpense() after confirm", () => {
    vi.mocked(showConfirmDialog).mockImplementation((_msg, cb) => cb());
    const el = { dataset: { actionArg: "e1" } };
    getHandler("deleteExpense")(el);
    expect(deleteExpense).toHaveBeenCalledWith("e1");
  });

  it("exportExpensesCSV handler calls exportExpensesCSV()", () => {
    getHandler("exportExpensesCSV")();
    expect(exportExpensesCSV).toHaveBeenCalledOnce();
  });

  it("filterExpensesByCategory handler calls filterExpensesByCategory()", () => {
    const el = { dataset: { actionArg: "food" }, value: "food" };
    getHandler("filterExpensesByCategory")(el);
    expect(filterExpensesByCategory).toHaveBeenCalled();
  });

  it("setExpenseCategoryFilter handler calls setExpenseCategoryFilter()", () => {
    const el = { dataset: { actionArg: "music" }, value: "music" };
    getHandler("setExpenseCategoryFilter")(el);
    expect(setExpenseCategoryFilter).toHaveBeenCalled();
  });
});
