/**
 * src/sections/vendors.js — Vendors section ESM module (S0.8)
 *
 * Vendor CRUD with payment tracking and Sheets sync.
 */

import { storeGet, storeSet, storeSubscribe } from "../core/store.js";
import { t } from "../core/i18n.js";
import { uid } from "../utils/misc.js";
import { sanitize } from "../utils/sanitize.js";
import { enqueueWrite, syncStoreKeyToSheets } from "../services/sheets.js";
import { pushUndo } from "../utils/undo.js";
import { cleanPhone } from "../utils/phone.js";

/** @type {(() => void)[]} */
const _unsubs = [];

export function mount(_container) {
  _unsubs.push(storeSubscribe("vendors", renderVendors));
  renderVendors();
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
export function saveVendor(data, existingId = null) {
  const { value, errors } = sanitize(data, {
    category: { type: "string", required: true, maxLength: 60 },
    name: { type: "string", required: true, maxLength: 120 },
    contact: { type: "string", required: false, maxLength: 120 },
    phone: { type: "string", required: false, maxLength: 30 },
    price: { type: "number", required: false, min: 0, default: 0 },
    paid: { type: "number", required: false, min: 0, default: 0 },
    dueDate: { type: "string", required: false, maxLength: 20 },
    notes: { type: "string", required: false, maxLength: 500 },
    contractUrl: { type: "string", required: false, maxLength: 500 },
  });
  if (errors.length) return { ok: false, errors };

  const vendors = [.../** @type {any[]} */ (storeGet("vendors") ?? [])];
  const now = new Date().toISOString();

  if (existingId) {
    const idx = vendors.findIndex((v) => v.id === existingId);
    if (idx === -1) return { ok: false, errors: [t("error_vendor_not_found")] };
    vendors[idx] = { ...vendors[idx], ...value, updatedAt: now };
  } else {
    vendors.push({ id: uid(), ...value, createdAt: now, updatedAt: now });
  }

  storeSet("vendors", vendors);
  enqueueWrite("vendors", () => syncStoreKeyToSheets("vendors"));
  return { ok: true };
}

/**
 * @param {string} id
 */
export function deleteVendor(id) {
  const all = /** @type {any[]} */ (storeGet("vendors") ?? []);
  const victim = all.find((v) => v.id === id);
  if (victim)
    pushUndo(
      `Delete vendor ${victim.name}`,
      "vendors",
      JSON.parse(JSON.stringify(all)),
    );
  const vendors = all.filter((v) => v.id !== id);
  storeSet("vendors", vendors);
  enqueueWrite("vendors", () => syncStoreKeyToSheets("vendors"));
}

export function renderVendors() {
  const tbody = document.getElementById("vendorTableBody");
  if (!tbody) return;

  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  tbody.textContent = "";

  vendors.forEach((v) => {
    const tr = document.createElement("tr");
    tr.className = "vendor-row";
    tr.dataset.id = v.id;
    tr.dataset.category = v.category || "";

    // S14.3 — Overdue detection
    const now = new Date();
    const isOverdue =
      v.dueDate && new Date(v.dueDate) < now && (v.paid || 0) < (v.price || 0);
    if (isOverdue) tr.classList.add("vendor-row--overdue");

    const dueDateStr = v.dueDate
      ? new Date(v.dueDate).toLocaleDateString("he-IL")
      : "—";
    const cells = [
      v.category || "",
      v.name || "",
      v.phone || "",
      `₪${v.price || 0}`,
      `₪${v.paid || 0}`,
      dueDateStr,
      v.notes || "",
    ];
    cells.forEach((txt, ci) => {
      const td = document.createElement("td");
      td.textContent = txt;
      if (ci === 5 && isOverdue) {
        td.classList.add("vendor-overdue-cell");
        td.textContent = `⚠️ ${txt}`;
      }
      tr.appendChild(td);
    });

    // Actions cell
    const actionsTd = document.createElement("td");
    actionsTd.className = "u-text-center";
    // S19.1 Quick-dial buttons
    if (v.phone) {
      const rawPhone = cleanPhone(v.phone);
      const telLink = document.createElement("a");
      telLink.href = `tel:${v.phone}`;
      telLink.className = "btn btn-small btn-secondary u-mr-xs";
      telLink.title = t("vendor_call");
      telLink.textContent = "📞";
      actionsTd.appendChild(telLink);
      if (rawPhone) {
        const waLink = document.createElement("a");
        waLink.href = `https://wa.me/${rawPhone}`;
        waLink.target = "_blank";
        waLink.rel = "noopener noreferrer";
        waLink.className = "btn btn-small btn-whatsapp u-mr-xs";
        waLink.title = t("vendor_whatsapp");
        waLink.textContent = "💬";
        actionsTd.appendChild(waLink);
      }
    }
    // S21.2 Contract URL link
    if (v.contractUrl) {
      const contractLink = document.createElement("a");
      contractLink.href = v.contractUrl;
      contractLink.target = "_blank";
      contractLink.rel = "noopener noreferrer";
      contractLink.className = "btn btn-small btn-ghost u-mr-xs";
      contractLink.title = t("vendor_open_contract");
      contractLink.textContent = "📄";
      actionsTd.appendChild(contractLink);
    }
    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-small btn-secondary";
    editBtn.textContent = t("btn_edit");
    editBtn.dataset.action = "openEditVendorModal";
    editBtn.dataset.actionArg = v.id;
    actionsTd.appendChild(editBtn);
    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-small btn-danger u-ml-xs";
    delBtn.textContent = t("btn_delete");
    delBtn.dataset.action = "deleteVendor";
    delBtn.dataset.actionArg = v.id;
    actionsTd.appendChild(delBtn);
    tr.appendChild(actionsTd);

    tbody.appendChild(tr);
  });

  const bannerEl = document.getElementById("vendorTotalBanner");
  if (bannerEl) {
    const total = vendors.reduce((s, v) => s + (v.price || 0), 0);
    const paid = vendors.reduce((s, v) => s + (v.paid || 0), 0);
    bannerEl.textContent =
      t("vendor_total", { total, paid, remaining: total - paid }) ||
      `₪${paid} / ₪${total}`;
  }
  const emptyEl = document.getElementById("vendorsEmpty");
  if (emptyEl) emptyEl.hidden = vendors.length > 0;
}

/**
 * Export all vendors as CSV file download.
 */
export function exportVendorsCSV() {
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  const header = "Name,Category,Contact,Phone,Price,Paid,Notes";
  const rows = vendors.map((v) =>
    [
      `"${(v.name || "").replace(/"/g, '""')}"`,
      `"${v.category || ""}"`,
      `"${(v.contact || "").replace(/"/g, '""')}"`,
      `"${v.phone || ""}"`,
      v.price || 0,
      v.paid || 0,
      `"${(v.notes || "").replace(/"/g, '""')}"`,
    ].join(","),
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "vendors.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Filter vendors by category for display.
 * @param {string} category — pass "all" to show all
 */
export function filterVendorsByCategory(category) {
  const tbody = document.getElementById("vendorTableBody");
  if (!tbody) return;
  const rows = tbody.querySelectorAll("tr.vendor-row");
  rows.forEach((row) => {
    const htmlRow = /** @type {HTMLElement} */ (row);
    const cat = htmlRow.dataset.category || "";
    htmlRow.style.display =
      category === "all" || !category || cat === category ? "" : "none";
  });
}

/**
 * Pre-fill the vendor modal with an existing vendor and open it.
 * @param {string} id
 */
export function openVendorForEdit(id) {
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  const v = vendors.find((vnd) => vnd.id === id);
  if (!v) return;
  const setVal = (elId, val) => {
    const input = /** @type {HTMLInputElement|HTMLSelectElement|null} */ (
      document.getElementById(elId)
    );
    if (input) input.value = String(val ?? "");
  };
  setVal("vendorModalId", v.id);
  setVal("vendorCategory", v.category ?? "");
  setVal("vendorName", v.name ?? "");
  setVal("vendorContact", v.contact ?? "");
  setVal("vendorPhone", v.phone ?? "");
  setVal("vendorPrice", v.price ?? 0);
  setVal("vendorPaid", v.paid ?? 0);
  setVal("vendorDueDate", v.dueDate ?? "");
  setVal("vendorNotes", v.notes ?? "");
  setVal("vendorContractUrl", v.contractUrl ?? "");
  const title = document.getElementById("vendorModalTitle");
  if (title) title.setAttribute("data-i18n", "modal_edit_vendor");
}

/**
 * Aggregate vendor payment statistics.
 * @returns {{ total: number, totalCost: number, totalPaid: number, outstanding: number, paymentRate: number }}
 */
export function getVendorStats() {
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  const totalCost = vendors.reduce((s, v) => s + (v.price || 0), 0);
  const totalPaid = vendors.reduce((s, v) => s + (v.paid || 0), 0);
  return {
    total: vendors.length,
    totalCost,
    totalPaid,
    outstanding: totalCost - totalPaid,
    paymentRate: totalCost > 0 ? Math.round((totalPaid / totalCost) * 100) : 0,
  };
}
