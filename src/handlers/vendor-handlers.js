/**
 * src/handlers/vendor-handlers.js — Vendor + Expense event handler registrations (F1.1)
 *
 * Extracted from main.js _registerHandlers().
 */

import { on } from "../core/events.js";
import { showToast, openModal, closeModal, showConfirmDialog } from "../core/ui.js";
import { t } from "../core/i18n.js";
import { getVal } from "../utils/form-helpers.js";
import {
  saveVendor,
  deleteVendor,
  exportVendorsCSV,
  filterVendorsByCategory,
  openVendorForEdit,
  exportVendorPaymentsCSV,
} from "../sections/vendors.js";
import {
  saveExpense,
  deleteExpense,
  exportExpensesCSV,
  filterExpensesByCategory,
  setExpenseCategoryFilter,
  openExpenseForEdit,
} from "../sections/expenses.js";

/**
 * Register all vendor + expense event handlers.
 */
export function registerVendorHandlers() {
  on("saveVendor", () => {
    const data = {
      category: getVal("vendorCategory"),
      name: getVal("vendorName"),
      contact: getVal("vendorContact"),
      phone: getVal("vendorPhone"),
      price: getVal("vendorPrice") || "0",
      paid: getVal("vendorPaid") || "0",
      dueDate: getVal("vendorDueDate") || "",
      notes: getVal("vendorNotes"),
      contractUrl: getVal("vendorContractUrl") || "",
    };
    const id = getVal("vendorModalId") || null;
    const result = saveVendor(data, id);
    if (result.ok) {
      closeModal("vendorModal");
      showToast(t("vendor_saved"), "success");
    } else showToast(result.errors?.join(", ") ?? t("error_save"), "error");
  });
  on("deleteVendor", (el) =>
    showConfirmDialog(t("confirm_delete"), () =>
      deleteVendor(el.dataset.actionArg ?? ""),
    ),
  );
  on("exportVendorsCSV", () => exportVendorsCSV());
  on("exportVendorPaymentsCSV", () => exportVendorPaymentsCSV());
  on("filterVendorsByCategory", (el) =>
    filterVendorsByCategory(el.dataset.category ?? "all"),
  );
  on("openEditVendorModal", (el) => {
    openVendorForEdit(el.dataset.actionArg ?? "");
    openModal("vendorModal");
  });

  // ── Expenses ──
  on("saveExpense", () => {
    const data = {
      category: getVal("expenseCategory"),
      amount: getVal("expenseAmount") || "0",
      description: getVal("expenseDescription"),
      date: getVal("expenseDate"),
    };
    const id = getVal("expenseModalId") || null;
    const result = saveExpense(data, id);
    if (result.ok) {
      closeModal("expenseModal");
      showToast(t("expense_saved"), "success");
    } else showToast(result.errors?.join(", ") ?? t("error_save"), "error");
  });
  on("deleteExpense", (el) =>
    showConfirmDialog(t("confirm_delete"), () =>
      deleteExpense(el.dataset.actionArg ?? ""),
    ),
  );
  on("exportExpensesCSV", () => exportExpensesCSV());
  on("filterExpensesByCategory", (el) =>
    filterExpensesByCategory(el.dataset.category ?? "all"),
  );
  on("setExpenseCategoryFilter", (el) =>
    setExpenseCategoryFilter(el.dataset.actionArg ?? "all"),
  );
  on("openEditExpenseModal", (el) => {
    openExpenseForEdit(el.dataset.actionArg ?? "");
    openModal("expenseModal");
  });
}
