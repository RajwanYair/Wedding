/**
 * src/handlers/vendor-handlers.js — Vendor, expense, budget, and analytics action handlers
 */

import { on } from "../core/events.js";
import { t } from "../core/i18n.js";
import { showToast, openModal, closeModal, showConfirmDialog } from "../core/ui.js";
import { storeGet, storeSet } from "../core/store.js";
import {
  saveVendor,
  deleteVendor,
  exportVendorsCSV,
  exportVendorPaymentsCSV,
  filterVendorsByCategory,
  openVendorForEdit,
  setVendorPaymentFilter,
} from "../sections/vendors.js";
import {
  saveExpense,
  deleteExpense,
  exportExpensesCSV,
  openExpenseForEdit,
} from "../sections/expenses.js";
import { deleteBudgetEntry, renderBudgetProgress } from "../sections/budget.js";
import {
  renderBudgetChart,
  exportAnalyticsPDF,
  exportAnalyticsCSV,
  exportMealPerTableCSV,
  printMealPerTable,
} from "../sections/analytics.js";

/**
 * Register `data-action` handlers for the vendors section.
 * Idempotent — call once at app boot.
 */
export function register() {
  // ── Vendors ──
  on("saveVendor", () => {
    const getVal = (/** @type {string} */ id) =>
      /** @type {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement|null} */ (
        document.getElementById(id)
      )?.value?.trim() ?? "";
    const data = {
      category: getVal("vendorCategory"),
      name: getVal("vendorName"),
      contact: getVal("vendorContact"),
      phone: getVal("vendorPhone"),
      price: getVal("vendorPrice") || "0",
      paid: getVal("vendorPaid") || "0",
      notes: getVal("vendorNotes"),
    };
    const id = getVal("vendorModalId") || null;
    const result = saveVendor(data, id);
    if (result.ok) {
      closeModal("vendorModal");
      showToast(t("vendor_saved"), "success");
    } else showToast(result.errors?.join(", ") ?? t("error_save"), "error");
  });
  on("deleteVendor", (el) =>
    showConfirmDialog(t("confirm_delete"), () => deleteVendor(el.dataset.actionArg ?? "")),
  );
  on("exportVendorsCSV", () => exportVendorsCSV());
  on("exportVendorPaymentsCSV", () => exportVendorPaymentsCSV());
  on("filterVendorsByCategory", (el) => filterVendorsByCategory(el.dataset.category ?? "all"));
  on("openEditVendorModal", (el) => {
    openVendorForEdit(el.dataset.actionArg ?? "");
    openModal("vendorModal");
  });

  // ── Expenses ──
  on("saveExpense", () => {
    const getVal = (/** @type {string} */ id) =>
      /** @type {HTMLInputElement|HTMLSelectElement|null} */ (
        document.getElementById(id)
      )?.value?.trim() ?? "";
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
    showConfirmDialog(t("confirm_delete"), () => deleteExpense(el.dataset.actionArg ?? "")),
  );
  on("exportExpensesCSV", () => exportExpensesCSV());
  on("openEditExpenseModal", (el) => {
    openExpenseForEdit(el.dataset.actionArg ?? "");
    openModal("expenseModal");
  });

  // ── Budget ──
  on("saveBudgetTarget", (_el, e) => {
    e.preventDefault();
    const input = /** @type {HTMLInputElement|null} */ (
      document.getElementById("budgetTargetInput")
    );
    const val = Number(input?.value ?? 0);
    if (isNaN(val) || val < 0) {
      showToast(t("error_invalid_amount"), "error");
      return;
    }
    const current = /** @type {Record<string,unknown>} */ (storeGet("weddingInfo") ?? {});
    storeSet("weddingInfo", { ...current, budgetTarget: val });
    renderBudgetProgress();
    showToast(t("settings_saved"), "success");
  });
  on("deleteBudgetEntry", (el) =>
    showConfirmDialog(t("confirm_delete"), () => deleteBudgetEntry(el.dataset.actionArg ?? "")),
  );
  on("renderBudgetProgress", () => renderBudgetProgress());
  on("renderBudgetChart", () => renderBudgetChart());
  on("setVendorPaymentFilter", (el) => setVendorPaymentFilter(el.dataset.actionArg ?? "all"));

  // ── Analytics exports ──
  on("exportAnalyticsPDF", () => exportAnalyticsPDF());
  on("exportAnalyticsCSV", () => exportAnalyticsCSV());
  on("exportMealPerTableCSV", () => exportMealPerTableCSV());
  on("printMealPerTable", () => printMealPerTable());
}
