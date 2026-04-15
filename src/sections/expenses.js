/**
 * src/sections/expenses.js — Expenses section ESM module (S0.8)
 *
 * Expense CRUD with category breakdown and Sheets sync.
 */

import { storeGet, storeSet, storeSubscribe } from "../core/store.js";
import { el } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { uid } from "../utils/misc.js";
import { sanitize } from "../utils/sanitize.js";
import { enqueueWrite, syncStoreKeyToSheets } from "../services/sheets.js";

/** @type {(() => void)[]} */
const _unsubs = [];

export function mount(_container) {
  _unsubs.push(storeSubscribe("expenses", renderExpenses));
  renderExpenses();
}

export function unmount() {
  _unsubs.forEach((fn) => fn());
  _unsubs.length = 0;
}

/**
 * @param {Record<string, unknown>} data
 * @param {string|null} [existingId]
 * @returns {{ ok: boolean, errors?: string[] }}
 */
export function saveExpense(data, existingId = null) {
  const { value, errors } = sanitize(data, {
    category: { type: "string", required: true, maxLength: 60 },
    description: { type: "string", required: true, maxLength: 200 },
    amount: { type: "number", required: true, min: 0 },
    date: { type: "string", required: false, maxLength: 20 },
  });
  if (errors.length) return { ok: false, errors };

  const expenses = [.../** @type {any[]} */ (storeGet("expenses") ?? [])];
  const now = new Date().toISOString();

  if (existingId) {
    const idx = expenses.findIndex((e) => e.id === existingId);
    if (idx === -1)
      return { ok: false, errors: [t("error_expense_not_found")] };
    expenses[idx] = { ...expenses[idx], ...value, updatedAt: now };
  } else {
    expenses.push({
      id: uid(),
      ...value,
      date: value.date || now.slice(0, 10),
      createdAt: now,
    });
  }

  storeSet("expenses", expenses);
  enqueueWrite("expenses", () => syncStoreKeyToSheets("expenses"));
  return { ok: true };
}

/**
 * @param {string} id
 */
export function deleteExpense(id) {
  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []).filter(
    (e) => e.id !== id,
  );
  storeSet("expenses", expenses);
  enqueueWrite("expenses", () => syncStoreKeyToSheets("expenses"));
}

export function renderExpenses() {
  const list = el.expenseList;
  if (!list) return;

  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []);
  list.textContent = "";

  expenses.forEach((e) => {
    const tr = document.createElement("tr");
    tr.className = "expense-row";
    tr.dataset.id = e.id;

    const cells = [
      e.category || "",
      e.description || "",
      e.date || "",
      `₪${e.amount || 0}`,
    ];
    cells.forEach((txt) => {
      const td = document.createElement("td");
      td.textContent = txt;
      tr.appendChild(td);
    });

    // Actions cell
    const actionsTd = document.createElement("td");
    actionsTd.className = "u-text-center";
    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-small btn-secondary";
    editBtn.textContent = t("btn_edit");
    editBtn.dataset.action = "openEditExpenseModal";
    editBtn.dataset.actionArg = e.id;
    actionsTd.appendChild(editBtn);
    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-small btn-danger u-ml-xs";
    delBtn.textContent = t("btn_delete");
    delBtn.dataset.action = "deleteExpense";
    delBtn.dataset.actionArg = e.id;
    actionsTd.appendChild(delBtn);
    tr.appendChild(actionsTd);

    list.appendChild(tr);
  });

  const totalEl = document.getElementById("expenseStatTotal");
  if (totalEl) {
    const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    totalEl.textContent = `₪${total}`;
  }
  const emptyEl = document.getElementById("expenseEmpty");
  if (emptyEl) emptyEl.classList.toggle("u-hidden", expenses.length > 0);
  // Show admin actions header when there are expenses
  const actionsHeader = document.getElementById("expenseActionsHeader");
  if (actionsHeader)
    actionsHeader.classList.toggle("u-hidden", expenses.length === 0);
}

/**
 * Export all expenses as CSV file download.
 */
export function exportExpensesCSV() {
  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []);
  const header = "Description,Category,Amount,Date";
  const rows = expenses.map((e) =>
    [
      `"${(e.description || "").replace(/"/g, '""')}"`,
      `"${e.category || ""}"`,
      e.amount || 0,
      `"${e.date || ""}"`,
    ].join(","),
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "expenses.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Filter expenses by category for display.
 * @param {string} category — pass "all" to clear filter
 */
export function filterExpensesByCategory(category) {
  const list = el.expenseList;
  if (!list) return;
  const rows = list.querySelectorAll("tr.expense-row");
  rows.forEach((row) => {
    const htmlRow = /** @type {HTMLElement} */ (row);
    const cat = htmlRow.dataset.category || "";
    htmlRow.style.display =
      category === "all" || !category || cat === category ? "" : "none";
  });
}

/**
 * Pre-fill the expense modal with an existing expense and open it.
 * @param {string} id
 */
export function openExpenseForEdit(id) {
  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []);
  const exp = expenses.find((e) => e.id === id);
  if (!exp) return;
  const setVal = (elId, val) => {
    const input = /** @type {HTMLInputElement|HTMLSelectElement|null} */ (
      document.getElementById(elId)
    );
    if (input) input.value = String(val ?? "");
  };
  setVal("expenseModalId", exp.id);
  setVal("expenseCategory", exp.category ?? "");
  setVal("expenseAmount", exp.amount ?? 0);
  setVal("expenseDescription", exp.description ?? "");
  setVal("expenseDate", exp.date ?? "");
  const title = document.getElementById("expenseModalTitle");
  if (title) title.setAttribute("data-i18n", "expense_edit");
}

/**
 * Aggregate expense statistics by category.
 * @returns {{ total: number, byCategory: Record<string, number> }}
 */
export function getExpenseSummary() {
  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []);
  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  /** @type {Record<string, number>} */
  const byCategory = {};
  expenses.forEach((e) => {
    const cat = e.category || "other";
    byCategory[cat] = (byCategory[cat] ?? 0) + (e.amount || 0);
  });
  return { total, byCategory };
}
