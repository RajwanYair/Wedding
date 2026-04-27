/**
 * src/sections/budget.js — Budget & gifts section ESM module (S0.8)
 *
 * Tracks gift contributions vs budget. Aggregates from guests and custom entries.
 */

import { storeGet, storeSet, storeSubscribe } from "../core/store.js";
import { el } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { uid } from "../utils/misc.js";
import { sanitize } from "../utils/sanitize.js";
import { enqueueWrite, syncStoreKeyToSheets } from "../core/sync.js";
import { getAllSummaries } from "../services/budget-tracker.js";

/** @type {(() => void)[]} */
const _unsubs = [];

export function mount(/** @type {HTMLElement} */ _container) {
  _unsubs.push(storeSubscribe("budget", renderBudget));
  _unsubs.push(storeSubscribe("guests", renderBudget));
  _unsubs.push(storeSubscribe("weddingInfo", renderBudget));
  _unsubs.push(storeSubscribe("expenses", renderBudgetProgress));
  _unsubs.push(storeSubscribe("vendors", renderBudgetProgress));
  _unsubs.push(storeSubscribe("budgetEnvelopes", _renderEnvelopeSummary));
  // S22.3 expense category breakdown
  _unsubs.push(storeSubscribe("expenses", renderExpenseCategoryBreakdown));
  _unsubs.push(storeSubscribe("vendors", renderExpenseCategoryBreakdown));
  renderBudget();
  renderBudgetProgress();
  renderExpenseCategoryBreakdown(); // S22.3
  _renderEnvelopeSummary(); // Sprint 28 / C1
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
export function saveBudgetEntry(data, existingId = null) {
  const { value, errors } = sanitize(data, {
    name: { type: "string", required: true, maxLength: 120 },
    amount: { type: "number", required: true, min: 0 },
    note: { type: "string", required: false, maxLength: 300 },
  });
  if (errors.length) return { ok: false, errors };

  const entries = [.../** @type {any[]} */ (storeGet("budget") ?? [])];
  const now = new Date().toISOString();

  if (existingId) {
    const idx = entries.findIndex((e) => e.id === existingId);
    if (idx === -1) return { ok: false, errors: [t("error_entry_not_found")] };
    entries[idx] = { ...entries[idx], ...value, updatedAt: now };
  } else {
    entries.push({ id: uid(), ...value, createdAt: now });
  }

  storeSet("budget", entries);
  enqueueWrite("budget", () => syncStoreKeyToSheets("budget"));
  return { ok: true };
}

/**
 * @param {string} id
 */
export function deleteBudgetEntry(id) {
  const entries = /** @type {any[]} */ (storeGet("budget") ?? []).filter((e) => e.id !== id);
  storeSet("budget", entries);
  enqueueWrite("budget", () => syncStoreKeyToSheets("budget"));
}

export function renderBudget() {
  const tbody = el.budgetTableBody;
  if (!tbody) return;

  // Merge custom entries + guest gift fields
  const entries = /** @type {any[]} */ (storeGet("budget") ?? []);
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const giftRows = guests
    .filter((g) => g.gift)
    .map((g) => ({
      id: g.id,
      name: `${g.firstName} ${g.lastName || ""}`,
      amount: Number(g.gift) || 0,
    }));

  const allRows = [...entries, ...giftRows];
  tbody.textContent = "";

  allRows.forEach((row) => {
    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    nameTd.textContent = row.name;
    tr.appendChild(nameTd);

    // Status cell (gift received indicator)
    const statusTd = document.createElement("td");
    statusTd.className = "u-text-center";
    statusTd.textContent = row.amount > 0 ? "✅" : "⏳";
    tr.appendChild(statusTd);

    // Gift/note cell
    const noteTd = document.createElement("td");
    noteTd.textContent = row.note || "—";
    tr.appendChild(noteTd);

    const amtTd = document.createElement("td");
    amtTd.className = "u-text-end";
    amtTd.textContent = `₪${row.amount}`;
    tr.appendChild(amtTd);

    tbody.appendChild(tr);
  });

  const total = allRows.reduce((s, r) => s + (r.amount || 0), 0);
  const totalEl = document.getElementById("budgetTotal");
  if (totalEl) totalEl.textContent = `₪${total}`;

  // Fill stat boxes
  const info = /** @type {any} */ (storeGet("weddingInfo") ?? {});
  const target = Number(info.budgetTarget) || 0;
  const giftCount = allRows.filter((r) => r.amount > 0).length;
  const pending = guests.filter((g) => g.status === "confirmed" && !g.gift).length;
  const pct = target > 0 ? Math.min(100, Math.round((total / target) * 100)) : 0;

  _statText("budgetStatGifts", String(giftCount));
  _statText("budgetStatTotal", `₪${total}`);
  _statText("budgetStatPending", String(pending));
  _statText("budgetStatBudget", target > 0 ? `₪${target}` : "—");
  _statText("budgetStatPct", target > 0 ? `${pct}%` : "—");

  // Show progress wrap when budget target is set
  const wrap = /** @type {HTMLElement|null} */ (document.getElementById("budgetProgressWrap"));
  if (wrap) {
    if (target > 0) {
      wrap.classList.remove("u-hidden");
    } else {
      wrap.classList.add("u-hidden");
    }
  }
}

function _statText(/** @type {string} */ id, /** @type {string|number} */ value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

// ── Budget-envelope summary panel (Sprint 28 / C1) ────────────────────────

/**
 * Render a budget-envelope summary into #budgetEnvelopeSummary (if present).
 * Shows each envelope's limit, spent, remaining, and over-budget status.
 */
function _renderEnvelopeSummary() {
  const container = document.getElementById("budgetEnvelopeSummary");
  if (!container) return;

  const summaries = getAllSummaries();
  const entries = Object.entries(summaries);
  container.textContent = "";

  if (entries.length === 0) return;

  const title = document.createElement("h4");
  title.className = "budget-envelopes-title";
  title.setAttribute("data-i18n", "budget_envelopes_title");
  title.textContent = t("budget_envelopes_title");
  container.appendChild(title);

  const list = document.createElement("ul");
  list.className = "budget-envelopes-list";
  entries.forEach(([category, s]) => {
    const li = document.createElement("li");
    li.className = `budget-envelope-item${s.isOver ? " budget-envelope-item--over" : ""}`;
    const catSpan = document.createElement("span");
    catSpan.className = "budget-envelope-cat";
    catSpan.textContent = category;
    const statsSpan = document.createElement("span");
    statsSpan.className = "budget-envelope-stats";
    statsSpan.textContent = `₪${s.spent} / ₪${s.limit}${s.isOver ? ` ⚠ ${t("budget_envelope_over")}` : ""}`;
    li.appendChild(catSpan);
    li.appendChild(statsSpan);
    list.appendChild(li);
  });
  container.appendChild(list);
}

// ── Stats ─────────────────────────────────────────────────────────────────

/**
 * Aggregate budget totals from entries + guest gift contributions.
 * @returns {{ total: number, gifts: number, expenses: number, balance: number }}
 */
export function getBudgetSummary() {
  const entries = /** @type {any[]} */ (storeGet("budget") ?? []);
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);

  const gifts = guests.reduce((s, g) => s + (Number(g.gift) || 0), 0);
  const entryTotal = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const expenses = vendors.reduce((s, v) => s + (Number(v.price) || 0), 0);

  return {
    total: gifts + entryTotal,
    gifts,
    expenses,
    balance: gifts + entryTotal - expenses,
  };
}

/**
 * Render a progress bar showing spent budget vs target.
 * Reads `weddingInfo.budgetTarget` from the store for the target amount.
 */
export function renderBudgetProgress() {
  const bar = /** @type {HTMLElement|null} */ (document.getElementById("budgetProgressBar"));
  const label = /** @type {HTMLElement|null} */ (document.getElementById("budgetProgressLabel"));
  if (!bar) return;

  const info = /** @type {any} */ (storeGet("weddingInfo") ?? {});
  const target = Number(info.budgetTarget) || 0;

  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []);
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  const spent =
    expenses.reduce((s, e) => s + (e.amount || 0), 0) +
    vendors.reduce((s, v) => s + (v.paid || 0), 0);

  const pct = target > 0 ? Math.min(100, Math.round((spent / target) * 100)) : 0;
  bar.style.width = `${pct}%`;
  bar.setAttribute("aria-valuenow", String(pct));

  const over = target > 0 && spent > target;
  bar.classList.toggle("budget-progress--over", over);

  if (label) {
    label.textContent =
      target > 0
        ? `₪${spent.toLocaleString()} / ₪${target.toLocaleString()} (${pct}%)`
        : `₪${spent.toLocaleString()}`;
  }
}

// ── S22.3 Expense Category Breakdown ──────────────────────────────────────

/**
 * Render an expense breakdown by category in #expenseCategoryBreakdown.
 * Shows each category with count, total amount, and % of all expenses.
 */
export function renderExpenseCategoryBreakdown() {
  const tbody = document.getElementById("expenseCategoryTbody");
  if (!tbody) return;
  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []);
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);

  // Bucket expenses by category
  /** @type {Map<string, { count: number, total: number }>} */
  const cats = new Map();
  expenses.forEach((e) => {
    const key = e.category || t("expense_other");
    const cur = cats.get(key) ?? { count: 0, total: 0 };
    cats.set(key, { count: cur.count + 1, total: cur.total + (Number(e.amount) || 0) });
  });
  // Merge vendor payments as a separate category
  const vendorTotal = vendors.reduce((s, v) => s + (Number(v.paid) || 0), 0);
  if (vendorTotal > 0) {
    const vk = t("col_vendors");
    const cur = cats.get(vk) ?? { count: 0, total: 0 };
    cats.set(vk, { count: cur.count + vendors.length, total: cur.total + vendorTotal });
  }

  const grandTotal = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0) + vendorTotal;
  tbody.textContent = "";

  if (cats.size === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.className = "u-text-center u-text-muted";
    td.textContent = t("expense_empty");
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  [...cats.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([cat, { count, total }]) => {
      const pct = grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0;
      const tr = document.createElement("tr");
      const cells = [cat, String(count), `₪${total.toLocaleString()}`, `${pct}%`];
      cells.forEach((txt) => {
        const td = document.createElement("td");
        td.textContent = txt;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

  // Total row
  const totalTr = document.createElement("tr");
  totalTr.className = "budget-vs-actual-total";
  [`${t("budget_total") || "סה״כ"}`, "", `₪${grandTotal.toLocaleString()}`, "100%"].forEach(
    (txt, i) => {
      const td = document.createElement("td");
      td.textContent = txt;
      if (i === 0) td.style.fontWeight = "700";
      totalTr.appendChild(td);
    },
  );
  tbody.appendChild(totalTr);
}

// ── Sprint 2: Budget Intelligence Helpers ─────────────────────────────────

/**
 * Compute budget-vs-actual by vendor category.
 * Compares budgeted amounts from budget entries against actual vendor costs.
 * @returns {Array<{ category: string, budgeted: number, actual: number, diff: number }>}
 */
export function getBudgetVsActual() {
  const entries = /** @type {any[]} */ (storeGet("budget") ?? []);
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  /** @type {Record<string, { budgeted: number, actual: number }>} */
  const cats = {};
  for (const e of entries) {
    const cat = e.category || "other";
    if (!cats[cat]) cats[cat] = { budgeted: 0, actual: 0 };
    cats[cat].budgeted += Number(e.amount) || 0;
  }
  for (const v of vendors) {
    const cat = v.category || "other";
    if (!cats[cat]) cats[cat] = { budgeted: 0, actual: 0 };
    cats[cat].actual += Number(v.price) || 0;
  }
  return Object.entries(cats)
    .map(([category, { budgeted, actual }]) => ({
      category,
      budgeted,
      actual,
      diff: budgeted - actual,
    }))
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}

/**
 * Get monthly expense distribution.
 * Groups expenses by month for burn-down analysis.
 * @returns {Array<{ month: string, total: number, count: number }>}
 */
export function getMonthlyExpenses() {
  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []);
  /** @type {Record<string, { total: number, count: number }>} */
  const months = {};
  for (const e of expenses) {
    const d = e.date || e.createdAt;
    if (!d) continue;
    const month = String(d).slice(0, 7); // YYYY-MM
    if (!months[month]) months[month] = { total: 0, count: 0 };
    months[month].total += Number(e.amount) || 0;
    months[month].count++;
  }
  return Object.entries(months)
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Calculate budget utilization rate by category.
 * Shows which categories have been paid vs. committed.
 * @returns {Array<{ category: string, committed: number, paid: number, rate: number }>}
 */
export function getPaymentUtilization() {
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  /** @type {Record<string, { committed: number, paid: number }>} */
  const cats = {};
  for (const v of vendors) {
    const cat = v.category || "other";
    if (!cats[cat]) cats[cat] = { committed: 0, paid: 0 };
    cats[cat].committed += Number(v.price) || 0;
    cats[cat].paid += Number(v.paid) || 0;
  }
  return Object.entries(cats)
    .map(([category, { committed, paid }]) => ({
      category,
      committed,
      paid,
      rate: committed > 0 ? Math.round((paid / committed) * 100) : 0,
    }))
    .sort((a, b) => b.committed - a.committed);
}

/**
 * Forecast remaining budget burn rate.
 * Based on historical spend rate, predicts when budget will be exhausted.
 * @returns {{ monthlyRate: number, monthsLeft: number | null, remaining: number }}
 */
export function getBudgetForecast() {
  const info = /** @type {Record<string, string>} */ (storeGet("weddingInfo") ?? {});
  const target = Number(info.budgetTarget) || 0;
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []);
  const totalSpent =
    vendors.reduce((s, v) => s + (Number(v.paid) || 0), 0) +
    expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const remaining = target - totalSpent;

  // Calculate monthly rate from expenses with dates
  const dated = expenses.filter((e) => e.date || e.createdAt);
  if (dated.length < 2) return { monthlyRate: 0, monthsLeft: null, remaining };
  const dates = dated.map((e) => new Date(e.date || e.createdAt).getTime()).sort((a, b) => a - b);
  const spanMs = dates[dates.length - 1] - dates[0];
  const spanMonths = spanMs / (1000 * 60 * 60 * 24 * 30) || 1;
  const monthlyRate = Math.round(totalSpent / spanMonths);
  return {
    monthlyRate,
    monthsLeft: monthlyRate > 0 ? Math.round((remaining / monthlyRate) * 10) / 10 : null,
    remaining,
  };
}

/**
 * Get top expense items sorted by amount.
 * @param {number} [limit=10] Max items to return
 * @returns {Array<{ id: string, description: string, amount: number, category: string }>}
 */
export function getTopExpenses(limit = 10) {
  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []);
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  const items = [
    ...expenses.map((e) => ({
      id: e.id,
      description: e.description || "",
      amount: Number(e.amount) || 0,
      category: e.category || "other",
    })),
    ...vendors.map((v) => ({
      id: v.id,
      description: v.name || "",
      amount: Number(v.price) || 0,
      category: v.category || "other",
    })),
  ];
  return items.sort((a, b) => b.amount - a.amount).slice(0, limit);
}
