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
import { enqueueWrite, syncStoreKeyToSheets } from "../services/sheets.js";

/** @type {(() => void)[]} */
const _unsubs = [];

export function mount(_container) {
  _unsubs.push(storeSubscribe("budget", renderBudget));
  _unsubs.push(storeSubscribe("guests", renderBudget));
  _unsubs.push(storeSubscribe("weddingInfo", renderBudget));
  _unsubs.push(storeSubscribe("expenses", renderBudgetProgress));
  _unsubs.push(storeSubscribe("vendors", renderBudgetProgress));
  renderBudget();
  renderBudgetProgress();
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
  const entries = /** @type {any[]} */ (storeGet("budget") ?? []).filter(
    (e) => e.id !== id,
  );
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
  const pending = guests.filter(
    (g) => g.status === "confirmed" && !g.gift,
  ).length;
  const pct =
    target > 0 ? Math.min(100, Math.round((total / target) * 100)) : 0;

  _statText("budgetStatGifts", String(giftCount));
  _statText("budgetStatTotal", `₪${total}`);
  _statText("budgetStatPending", String(pending));
  _statText("budgetStatBudget", target > 0 ? `₪${target}` : "—");
  _statText("budgetStatPct", target > 0 ? `${pct}%` : "—");

  // Show progress wrap when budget target is set
  const wrap = /** @type {HTMLElement|null} */ (
    document.getElementById("budgetProgressWrap")
  );
  if (wrap) {
    if (target > 0) {
      wrap.classList.remove("u-hidden");
    } else {
      wrap.classList.add("u-hidden");
    }
  }
}

function _statText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
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
  const bar = /** @type {HTMLElement|null} */ (
    document.getElementById("budgetProgressBar")
  );
  const label = /** @type {HTMLElement|null} */ (
    document.getElementById("budgetProgressLabel")
  );
  if (!bar) return;

  const info = /** @type {any} */ (storeGet("weddingInfo") ?? {});
  const target = Number(info.budgetTarget) || 0;

  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []);
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  const spent =
    expenses.reduce((s, e) => s + (e.amount || 0), 0) +
    vendors.reduce((s, v) => s + (v.paid || 0), 0);

  const pct =
    target > 0 ? Math.min(100, Math.round((spent / target) * 100)) : 0;
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
