/**
 * src/sections/expenses.js — Expenses section ESM module (S0.8)
 *
 * Expense CRUD with category breakdown and Sheets sync.
 */

import { storeGet, storeSet } from "../core/store.js";
import { BaseSection, fromSection } from "../core/section-base.js";
import { el } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { uid } from "../utils/misc.js";
import { sanitize } from "../utils/sanitize.js";
import { enqueueWrite, syncStoreKeyToSheets } from "../core/sync.js";
import { getTopCategories } from "../services/financial-analytics.js";
import { EXPENSE_CATEGORIES } from "../core/constants.js";

/** @type {string} active expense category filter; "all" means no filter */
let _expenseCatFilter = "all";

class ExpensesSection extends BaseSection {
  async onMount() {
    this.subscribe("expenses", renderExpenses);
    renderExpenses();
  }
}

export const { mount, unmount, capabilities } = fromSection(new ExpensesSection("expenses"));

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
    if (idx === -1) return { ok: false, errors: [t("error_expense_not_found")] };
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
  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []).filter((e) => e.id !== id);
  storeSet("expenses", expenses);
  enqueueWrite("expenses", () => syncStoreKeyToSheets("expenses"));
}

function renderExpenses() {
  const list = el.expenseList;
  if (!list) return;

  let expenses = /** @type {any[]} */ (storeGet("expenses") ?? []);

  // S20.3 Category filter
  if (_expenseCatFilter !== "all") {
    expenses = expenses.filter((e) => (e.category || "") === _expenseCatFilter);
  }

  list.textContent = "";

  expenses.forEach((e) => {
    const tr = document.createElement("tr");
    tr.className = "expense-row";
    tr.dataset.id = e.id;
    tr.dataset.category = e.category || "";

    // S20.3 — clickable category chip
    const catTd = document.createElement("td");
    const catBtn = document.createElement("button");
    catBtn.className = `btn btn-chip${_expenseCatFilter === e.category ? " btn-primary" : " btn-ghost"} u-text-sm`;
    catBtn.textContent = e.category || "";
    catBtn.title = t("expense_filter_by_cat");
    catBtn.dataset.action = "setExpenseCategoryFilter";
    catBtn.dataset.actionArg = _expenseCatFilter === e.category ? "all" : e.category || "all";
    catTd.appendChild(catBtn);
    tr.appendChild(catTd);

    const cells = [e.description || "", e.date || "", `₪${e.amount || 0}`];
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
    const allExpenses = /** @type {any[]} */ (storeGet("expenses") ?? []);
    const total = allExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    totalEl.textContent = `₪${total}`;
  }
  const emptyEl = document.getElementById("expenseEmpty");
  if (emptyEl) emptyEl.classList.toggle("u-hidden", expenses.length > 0);
  // Show admin actions header when there are expenses
  const actionsHeader = document.getElementById("expenseActionsHeader");
  if (actionsHeader) actionsHeader.classList.toggle("u-hidden", expenses.length === 0);

  // Sprint 27 / C1: top-categories analytics panel
  _renderTopCategoriesPanel();
}

// ── Top-categories analytics panel (Sprint 27 / C1) ──────────────────────

/**
 * Render the top-5 expense categories breakdown panel.
 * Uses a dedicated `#expenseTopCategories` container if present.
 */
function _renderTopCategoriesPanel() {
  const container = document.getElementById("expenseTopCategories");
  if (!container) return;

  const top = getTopCategories(5);
  container.textContent = "";

  if (top.length === 0) return;

  const title = document.createElement("h4");
  title.className = "expense-top-categories-title";
  title.setAttribute("data-i18n", "expense_top_categories");
  title.textContent = t("expense_top_categories");
  container.appendChild(title);

  const list = document.createElement("ul");
  list.className = "expense-top-categories-list";
  top.forEach(({ category, total, count }) => {
    const li = document.createElement("li");
    li.className = "expense-top-categories-item";
    const catSpan = document.createElement("span");
    catSpan.className = "expense-cat-label";
    catSpan.textContent = category;
    const statsSpan = document.createElement("span");
    statsSpan.className = "expense-cat-stats";
    statsSpan.textContent = `₪${total} (${count})`;
    li.appendChild(catSpan);
    li.appendChild(statsSpan);
    list.appendChild(li);
  });
  container.appendChild(list);
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
 * S20.3 Set (or clear) the active expense category filter, then re-render.
 * @param {string} category — pass "all" to clear
 */
export function setExpenseCategoryFilter(category) {
  const isKnown = category === "all" || EXPENSE_CATEGORIES.includes(/** @type {any} */ (category));
  _expenseCatFilter = isKnown ? category : "all";
  // Update category filter chip label if present
  const chip = document.getElementById("expCatFilterChip");
  if (chip) {
    chip.textContent = _expenseCatFilter === "all" ? t("all_categories") : _expenseCatFilter;
  }
  renderExpenses();
}

/**
 * Pre-fill the expense modal with an existing expense and open it.
 * @param {string} id
 */
export function openExpenseForEdit(id) {
  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []);
  const exp = expenses.find((e) => e.id === id);
  if (!exp) return;
  const setVal = (/** @type {string} */ elId, /** @type {unknown} */ val) => {
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

/**
 * Expense trend — monthly totals sorted chronologically.
 * @returns {{ month: string, total: number }[]}
 */
export function getExpenseMonthlyTrend() {
  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []);
  /** @type {Map<string, number>} */
  const map = new Map();
  for (const e of expenses) {
    if (!e.date) continue;
    const month = e.date.slice(0, 7);
    map.set(month, (map.get(month) ?? 0) + (e.amount || 0));
  }
  return [...map.entries()]
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Largest N expenses for reporting.
 * @param {number} [limit=5]
 * @returns {{ id: string, category: string, description: string, amount: number, date: string }[]}
 */
export function getLargestExpenses(limit = 5) {
  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []);
  return [...expenses]
    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
    .slice(0, limit)
    .map((e) => ({
      id: e.id,
      category: e.category || "",
      description: e.description || "",
      amount: e.amount || 0,
      date: e.date || "",
    }));
}
