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

import { getHandler, assertHandlerRegistration } from "./helpers.js";
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

describe("registerVendorHandlers — registration", () => {
  beforeEach(() => { vi.mocked(on).mockClear(); });

  it("registers all required handlers", () => {
    expect(assertHandlerRegistration({
      name: "registerVendorHandlers",
      register: registerVendorHandlers,
      on, vi,
      actions: ["saveVendor", "saveExpense"],
    })).toBe(true);
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
    getHandler(on, "saveVendor")();
    expect(saveVendor).toHaveBeenCalled();
  });

  it("saveVendor handler closes modal and shows success toast on ok", () => {
    getHandler(on, "saveVendor")();
    expect(closeModal).toHaveBeenCalledWith("vendorModal");
    expect(showToast).toHaveBeenCalledWith(expect.anything(), "success");
  });

  it("saveVendor handler shows error toast on failure", () => {
    vi.mocked(saveVendor).mockReturnValue({ ok: false, errors: ["Name required"] });
    getHandler(on, "saveVendor")();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining("Name required"), "error");
  });

  it("deleteVendor handler calls showConfirmDialog", () => {
    const el = { dataset: { actionArg: "v1" } };
    getHandler(on, "deleteVendor")(el);
    expect(showConfirmDialog).toHaveBeenCalled();
  });

  it("deleteVendor handler calls deleteVendor() after confirm", () => {
    vi.mocked(showConfirmDialog).mockImplementation((_msg, cb) => cb());
    const el = { dataset: { actionArg: "v1" } };
    getHandler(on, "deleteVendor")(el);
    expect(deleteVendor).toHaveBeenCalledWith("v1");
  });

  it("exportVendorsCSV handler calls exportVendorsCSV()", () => {
    getHandler(on, "exportVendorsCSV")();
    expect(exportVendorsCSV).toHaveBeenCalledOnce();
  });

  it("exportVendorPaymentsCSV handler calls exportVendorPaymentsCSV()", () => {
    getHandler(on, "exportVendorPaymentsCSV")();
    expect(exportVendorPaymentsCSV).toHaveBeenCalledOnce();
  });

  it("setVendorPaymentFilter handler passes filter value to setVendorPaymentFilter()", () => {
    const el = { dataset: { actionArg: "unpaid" }, value: "unpaid" };
    getHandler(on, "setVendorPaymentFilter")(el);
    expect(setVendorPaymentFilter).toHaveBeenCalled();
  });

  it("filterVendorsByCategory handler passes category to filterVendorsByCategory()", () => {
    const el = { dataset: { actionArg: "catering" }, value: "catering" };
    getHandler(on, "filterVendorsByCategory")(el);
    expect(filterVendorsByCategory).toHaveBeenCalled();
  });

  it("saveExpense handler calls saveExpense()", () => {
    getHandler(on, "saveExpense")();
    expect(saveExpense).toHaveBeenCalled();
  });

  it("saveExpense handler closes modal and shows success toast on ok", () => {
    getHandler(on, "saveExpense")();
    expect(closeModal).toHaveBeenCalledWith("expenseModal");
    expect(showToast).toHaveBeenCalledWith(expect.anything(), "success");
  });

  it("saveExpense handler shows error toast on failure", () => {
    vi.mocked(saveExpense).mockReturnValue({ ok: false, errors: ["Amount required"] });
    getHandler(on, "saveExpense")();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining("Amount required"), "error");
  });

  it("deleteExpense handler calls showConfirmDialog", () => {
    const el = { dataset: { actionArg: "e1" } };
    getHandler(on, "deleteExpense")(el);
    expect(showConfirmDialog).toHaveBeenCalled();
  });

  it("deleteExpense handler calls deleteExpense() after confirm", () => {
    vi.mocked(showConfirmDialog).mockImplementation((_msg, cb) => cb());
    const el = { dataset: { actionArg: "e1" } };
    getHandler(on, "deleteExpense")(el);
    expect(deleteExpense).toHaveBeenCalledWith("e1");
  });

  it("exportExpensesCSV handler calls exportExpensesCSV()", () => {
    getHandler(on, "exportExpensesCSV")();
    expect(exportExpensesCSV).toHaveBeenCalledOnce();
  });

  it("filterExpensesByCategory handler calls filterExpensesByCategory()", () => {
    const el = { dataset: { actionArg: "food" }, value: "food" };
    getHandler(on, "filterExpensesByCategory")(el);
    expect(filterExpensesByCategory).toHaveBeenCalled();
  });

  it("setExpenseCategoryFilter handler calls setExpenseCategoryFilter()", () => {
    const el = { dataset: { actionArg: "music" }, value: "music" };
    getHandler(on, "setExpenseCategoryFilter")(el);
    expect(setExpenseCategoryFilter).toHaveBeenCalled();
  });
});
