// @ts-check
"use strict";

/* ── Expense Tracker (v1.15.0) ───────────────────────────────────────────────
   Tracks wedding expenses by category (venue, catering, photography, etc.).
   Admin CRUD; data persisted in localStorage as wedding_v1_expenses.
   ─────────────────────────────────────────────────────────────────────────── */

const EXPENSE_CATEGORIES = [
  "venue",
  "catering",
  "photography",
  "flowers",
  "music",
  "transport",
  "clothing",
  "misc",
];

/** Populate the category <select> with translated options */
function _buildExpenseCategoryOptions(selectEl) {
  if (!selectEl) return;
  selectEl.replaceChildren();
  EXPENSE_CATEGORIES.forEach(function (cat) {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = window.t(`expense_cat_${  cat}`);
    selectEl.appendChild(opt);
  });
}

/** Sum of all expense amounts */
function getTotalExpenses() {
  return window._expenses.reduce(function (s, e) {
    return s + (parseFloat(e.amount) || 0);
  }, 0);
}

/** Render the expense table into #expenseList */
function renderExpenses() {
  const container = document.getElementById("expenseList");
  const emptyMsg = document.getElementById("expenseEmpty");
  const totalEl = document.getElementById("expenseStatTotal");
  const adminBar = document.getElementById("expenseAdminBar");

  if (!container) return;

  /* Show/hide admin controls */
  if (adminBar)
    adminBar.style.display =
      window._authUser && window._authUser.isAdmin ? "" : "none";

  const total = getTotalExpenses();
  if (totalEl)
    totalEl.textContent =
      total > 0 ? `\u20aa${  total.toLocaleString()}` : "\u2014";

  container.replaceChildren();

  if (!window._expenses.length) {
    if (emptyMsg) emptyMsg.style.display = "";
    return;
  }
  if (emptyMsg) emptyMsg.style.display = "none";

  const sorted = window._expenses.slice().sort(function (a, b) {
    return (b.date || "").localeCompare(a.date || "");
  });

  sorted.forEach(function (exp) {
    const row = document.createElement("tr");

    const catTd = document.createElement("td");
    catTd.textContent = window.t(`expense_cat_${  exp.category || "misc"}`);
    row.appendChild(catTd);

    const descTd = document.createElement("td");
    descTd.textContent = exp.description || "";
    row.appendChild(descTd);

    const dateTd = document.createElement("td");
    dateTd.textContent = exp.date || "";
    dateTd.style.direction = "ltr";
    row.appendChild(dateTd);

    const amtTd = document.createElement("td");
    amtTd.style.textAlign = "end";
    amtTd.textContent = exp.amount
      ? `\u20aa${  parseFloat(exp.amount).toLocaleString()}`
      : "\u2014";
    row.appendChild(amtTd);

    if (window._authUser && window._authUser.isAdmin) {
      const actTd = document.createElement("td");
      actTd.style.textAlign = "center";

      const editBtn = document.createElement("button");
      editBtn.className = "btn-icon-sm";
      editBtn.textContent = "\u270f\ufe0f";
      editBtn.setAttribute("aria-label", window.t("btn_edit"));
      const expId = exp.id;
      editBtn.onclick = function () {
        openEditExpenseModal(expId);
      };
      actTd.appendChild(editBtn);

      const delBtn = document.createElement("button");
      delBtn.className = "btn-icon-sm";
      delBtn.textContent = "\ud83d\uddd1\ufe0f";
      delBtn.setAttribute("aria-label", window.t("btn_delete"));
      delBtn.onclick = function () {
        deleteExpense(expId);
      };
      actTd.appendChild(delBtn);

      row.appendChild(actTd);
    }

    container.appendChild(row);
  });
}

function openAddExpenseModal() {
  window._editingExpenseId = null;

  const titleEl = document.getElementById("expenseModalTitle");
  if (titleEl) {
    titleEl.setAttribute("data-i18n", "expense_add");
    titleEl.textContent = window.t("expense_add");
  }

  const catEl = document.getElementById("expenseCategory");
  _buildExpenseCategoryOptions(catEl);
  if (catEl) catEl.value = "misc";

  const descEl = document.getElementById("expenseDescription");
  const amtEl = document.getElementById("expenseAmount");
  const dateEl = document.getElementById("expenseDate");
  if (descEl) descEl.value = "";
  if (amtEl) amtEl.value = "";
  if (dateEl) dateEl.value = new Date().toISOString().slice(0, 10);

  window.openModal("expenseModal");
}

function openEditExpenseModal(id) {
  const exp = window._expenses.find(function (e) {
    return e.id === id;
  });
  if (!exp) return;
  window._editingExpenseId = id;

  const titleEl = document.getElementById("expenseModalTitle");
  if (titleEl) {
    titleEl.setAttribute("data-i18n", "expense_edit");
    titleEl.textContent = window.t("expense_edit");
  }

  const catEl = document.getElementById("expenseCategory");
  _buildExpenseCategoryOptions(catEl);
  if (catEl) catEl.value = exp.category || "misc";

  const descEl = document.getElementById("expenseDescription");
  const amtEl = document.getElementById("expenseAmount");
  const dateEl = document.getElementById("expenseDate");
  if (descEl) descEl.value = exp.description || "";
  if (amtEl) amtEl.value = exp.amount != null ? String(exp.amount) : "";
  if (dateEl) dateEl.value = exp.date || "";

  window.openModal("expenseModal");
}

function saveExpense() {
  const catEl = document.getElementById("expenseCategory");
  const descEl = document.getElementById("expenseDescription");
  const amtEl = document.getElementById("expenseAmount");
  const dateEl = document.getElementById("expenseDate");

  const amount = parseFloat((amtEl ? amtEl.value : "") || "0");
  if (!amount || amount <= 0) {
    window.showToast(window.t("expense_required"), "error");
    return;
  }

  if (window._editingExpenseId) {
    const idx = window._expenses.findIndex(function (e) {
      return e.id === window._editingExpenseId;
    });
    if (idx >= 0) {
      window._expenses[idx].category = catEl ? catEl.value : "misc";
      window._expenses[idx].description = descEl
        ? window.sanitizeInput(descEl.value, 100)
        : "";
      window._expenses[idx].amount = amount;
      window._expenses[idx].date = dateEl ? dateEl.value : "";
    }
  } else {
    window._expenses.push({
      id: window.uid(),
      category: catEl ? catEl.value : "misc",
      description: descEl ? window.sanitizeInput(descEl.value, 100) : "",
      amount,
      date: dateEl ? dateEl.value : "",
    });
  }

  window.saveAll();
  window.closeModal("expenseModal");
  renderExpenses();
  window.showToast(window.t("expense_saved"));
}

function deleteExpense(id) {
  window._expenses = window._expenses.filter(function (e) {
    return e.id !== id;
  });
  window.saveAll();
  renderExpenses();
  window.showToast(window.t("expense_deleted"));
}
