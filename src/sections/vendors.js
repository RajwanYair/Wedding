/**
 * src/sections/vendors.js — Vendors section ESM module (S0.8)
 *
 * Vendor CRUD with payment tracking and Sheets sync.
 */

import { storeGet, storeSet } from "../core/store.js";
import { BaseSection, fromSection } from "../core/section-base.js";
import { t } from "../core/i18n.js";
import { uid } from "../utils/misc.js";
import { sanitize } from "../utils/sanitize.js";
import { enqueueWrite, syncStoreKeyToSheets } from "../core/sync.js";
import { pushUndo } from "../utils/undo.js";
import { cleanPhone } from "../utils/phone.js";
import { buildVCardDataUrl, getVCardFilename } from "../utils/vcard.js";
import { buildBitLink, buildPayBoxLink } from "../utils/payment-link.js";
import { getOverdueVendors } from "../services/vendor-analytics.js";
import { buildPaymentTimeline, topVendorsByCost } from "../services/vendor-timeline.js";

class VendorsSection extends BaseSection {
  async onMount() {
    this.subscribe("vendors", renderVendors);
    this.subscribe("vendors", renderOverdueChip); // S23.5
    this.subscribe("vendors", renderVendorPaymentTimeline); // C1 Sprint 45
    this.subscribe("vendors", renderVendorSpendTimeline); // S147
    this.subscribe("vendors", renderTopVendorsByCost); // S147
    renderVendors();
    renderOverdueChip(); // S23.5
    renderVendorPaymentTimeline(); // C1 Sprint 45
    renderVendorSpendTimeline(); // S147
    renderTopVendorsByCost(); // S147
  }
}

export const { mount, unmount, capabilities } = fromSection(new VendorsSection("vendors"));

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
    rating: { type: "number", required: false, min: 0, max: 5, default: 0 },
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
  if (victim) pushUndo(`Delete vendor ${victim.name}`, "vendors", JSON.parse(JSON.stringify(all)));
  const vendors = all.filter((v) => v.id !== id);
  storeSet("vendors", vendors);
  enqueueWrite("vendors", () => syncStoreKeyToSheets("vendors"));
}

function renderVendors() {
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
    const isOverdue = v.dueDate && new Date(v.dueDate) < now && (v.paid || 0) < (v.price || 0);
    if (isOverdue) tr.classList.add("vendor-row--overdue");

    const dueDateStr = v.dueDate ? new Date(v.dueDate).toLocaleDateString("he-IL") : "—";
    const cells = [
      v.category || "",
      v.name || "",
      v.phone || "",
      `₪${v.price || 0}`,
      `₪${v.paid || 0}`,
      dueDateStr,
      _renderRatingText(v.rating || 0),
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
    // C1 Sprint 37: vCard download button
    const vcardLink = document.createElement("a");
    vcardLink.href = buildVCardDataUrl(v);
    vcardLink.download = getVCardFilename(v);
    vcardLink.className = "btn btn-small btn-ghost u-mr-xs";
    vcardLink.title = t("vendor_download_contact");
    vcardLink.textContent = "👤";
    actionsTd.appendChild(vcardLink);
    // C1 Sprint 38: payment link buttons (Bit + PayBox) when vendor has unpaid balance
    const remaining = (v.price || 0) - (v.paid || 0);
    if (v.phone && remaining > 0) {
      const bitLink = document.createElement("a");
      bitLink.href = buildBitLink({ phone: v.phone, amount: remaining, description: v.name });
      bitLink.target = "_blank";
      bitLink.rel = "noopener noreferrer";
      bitLink.className = "btn btn-small btn-ghost u-mr-xs";
      bitLink.title = t("vendor_pay_bit");
      bitLink.textContent = "💳";
      actionsTd.appendChild(bitLink);
      const payboxLink = document.createElement("a");
      payboxLink.href = buildPayBoxLink({ phone: v.phone, amount: remaining, description: v.name });
      payboxLink.target = "_blank";
      payboxLink.rel = "noopener noreferrer";
      payboxLink.className = "btn btn-small btn-ghost u-mr-xs";
      payboxLink.title = t("vendor_pay_paybox");
      payboxLink.textContent = "📲";
      actionsTd.appendChild(payboxLink);
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
    const { totalCost, totalPaid, outstanding } = getVendorPaymentSummary();
    bannerEl.textContent =
      t("vendor_total", { total: totalCost, paid: totalPaid, remaining: outstanding }) || `₪${totalPaid} / ₪${totalCost}`;
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
    htmlRow.style.display = category === "all" || !category || cat === category ? "" : "none";
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
  const setVal = (/** @type {string} */ elId, /** @type {unknown} */ val) => {
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

// ── S23.5 Vendor overdue chip ─────────────────────────────────────────────

/**
 * Show/hide the overdue vendor count chip in the vendors section header.
 */
function renderOverdueChip() {
  const chip = document.getElementById("vendorOverdueChip");
  if (!chip) return;
  const count = getOverdueVendors().length;
  if (count > 0) {
    chip.textContent = `⚠️ ${t("plural_vendors_overdue", { count })}`;
    /** @type {HTMLElement} */ (chip).hidden = false;
  } else {
    /** @type {HTMLElement} */ (chip).hidden = true;
  }
}

// ── S24.2 Vendor payments CSV export ─────────────────────────────────────

/**
 * Export a detailed vendor payments CSV including outstanding and status columns.
 */
export function exportVendorPaymentsCSV() {
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  const header = [
    t("label_vendor_name") || "Name",
    t("label_vendor_category") || "Category",
    t("vendor_contact") || "Contact",
    t("label_vendor_phone") || "Phone",
    t("label_vendor_price") || "Price",
    t("label_vendor_paid") || "Paid",
    t("vendor_outstanding") || "Outstanding",
    t("vendor_due_date") || "Due Date",
    t("vendor_payment_status") || "Status",
  ].join(",");
  const now = new Date();
  const rows = vendors.map((v) => {
    const outstanding = (v.price || 0) - (v.paid || 0);
    const isOverdue = v.dueDate && new Date(v.dueDate) < now && outstanding > 0;
    const status =
      outstanding <= 0
        ? t("status_paid") || "Paid"
        : isOverdue
          ? t("vendor_overdue_label") || "Overdue"
          : t("vendor_pending_payment") || "Pending";
    return [
      `"${(v.name || "").replace(/"/g, '""')}"`,
      `"${v.category || ""}"`,
      `"${(v.contact || "").replace(/"/g, '""')}"`,
      `"${v.phone || ""}"`,
      v.price || 0,
      v.paid || 0,
      outstanding,
      `"${v.dueDate || ""}"`,
      `"${status}"`,
    ].join(",");
  });
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "vendor-payments.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Sprint 6: Rating Helper ─────────────────────────────────────────────

/**
 * @param {number} rating
 * @returns {string}
 */
function _renderRatingText(rating) {
  if (!rating || rating <= 0) return "";
  return "★".repeat(Math.min(rating, 5)) + "☆".repeat(Math.max(0, 5 - rating));
}

// ── Sprint 6: Vendor Payment Filter ─────────────────────────────────────

/** @type {string} current vendor payment filter */
let _paymentFilter = "all";

/**
 * Toggle vendor payment filter.
 * @param {string} filter — "all" | "paid" | "unpaid" | "overdue"
 */
export function setVendorPaymentFilter(filter) {
  _paymentFilter = filter;
  renderVendors();
}

/**
 * Get vendor payment summary stats.
 * @returns {{ total: number, totalCost: number, totalPaid: number, outstanding: number, paidCount: number, overdueCount: number }}
 */
export function getVendorPaymentSummary() {
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  const now = new Date();
  const totalCost = vendors.reduce((s, v) => s + (v.price || 0), 0);
  const totalPaid = vendors.reduce((s, v) => s + (v.paid || 0), 0);
  const paidCount = vendors.filter(
    (v) => (v.paid || 0) >= (v.price || 0) && (v.price || 0) > 0,
  ).length;
  const overdueCount = vendors.filter(
    (v) => v.dueDate && new Date(v.dueDate) < now && (v.paid || 0) < (v.price || 0),
  ).length;
  return {
    total: vendors.length,
    totalCost,
    totalPaid,
    outstanding: totalCost - totalPaid,
    paidCount,
    overdueCount,
  };
}

/**
 * Vendor timeline — sorted upcoming due dates.
 * @returns {{ id: string, name: string, category: string, dueDate: string, remaining: number, daysUntilDue: number }[]}
 */
export function getVendorTimeline() {
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  const now = Date.now();
  return vendors
    .filter((v) => v.dueDate && (v.paid || 0) < (v.price || 0))
    .map((v) => ({
      id: v.id,
      name: v.name,
      category: v.category,
      dueDate: v.dueDate,
      remaining: (v.price || 0) - (v.paid || 0),
      daysUntilDue: Math.ceil((new Date(v.dueDate).getTime() - now) / 86400000),
    }))
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

/**
 * Group vendors by category with aggregated totals.
 * @returns {{ category: string, count: number, totalCost: number, totalPaid: number }[]}
 */
export function getVendorsByCategory() {
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  /** @type {Map<string, { count: number, totalCost: number, totalPaid: number }>} */
  const map = new Map();
  for (const v of vendors) {
    const cat = v.category || "other";
    const entry = map.get(cat) ?? { count: 0, totalCost: 0, totalPaid: 0 };
    entry.count += 1;
    entry.totalCost += v.price || 0;
    entry.totalPaid += v.paid || 0;
    map.set(cat, entry);
  }
  return [...map.entries()]
    .map(([category, d]) => ({ category, ...d }))
    .sort((a, b) => b.totalCost - a.totalCost);
}

/**
 * Contract completeness check — vendors missing contract URL.
 * @returns {{ id: string, name: string, category: string, price: number }[]}
 */
export function getVendorsMissingContract() {
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  return vendors
    .filter((v) => !v.contractUrl)
    .map((v) => ({ id: v.id, name: v.name, category: v.category, price: v.price || 0 }));
}

/**
 * Vendors rated below threshold (default 3).
 * @param {number} [threshold=3]
 * @returns {{ id: string, name: string, category: string, rating: number }[]}
 */
export function getLowRatedVendors(threshold = 3) {
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  return vendors
    .filter((v) => typeof v.rating === "number" && v.rating > 0 && v.rating < threshold)
    .map((v) => ({ id: v.id, name: v.name, category: v.category, rating: v.rating }))
    .sort((a, b) => a.rating - b.rating);
}

/**
 * Maximum single-vendor exposure (share of total budget).
 * @returns {{ id: string, name: string, category: string, price: number, share: number }[]}
 */
export function getVendorBudgetShare() {
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  const total = vendors.reduce((s, v) => s + (v.price || 0), 0);
  if (total === 0) return [];
  return vendors
    .filter((v) => (v.price || 0) > 0)
    .map((v) => ({
      id: v.id,
      name: v.name,
      category: v.category,
      price: v.price,
      share: Math.round(((v.price || 0) / total) * 100),
    }))
    .sort((a, b) => b.share - a.share);
}

// ── C1: Vendor Payment Timeline (vendor-analytics.js, Sprint 45) ─────────

/**
 * Render per-category payment progress bars in #vendorPaymentTimeline.
 */
function renderVendorPaymentTimeline() {
  const container = document.getElementById("vendorPaymentTimeline");
  if (!container) return;

  const categories = getVendorsByCategory();
  if (categories.length === 0) {
    container.textContent = "";
    return;
  }

  const maxTotal = Math.max(...categories.map((c) => c.totalCost), 1);
  const rowH = 32;
  const gap = 8;
  const labelW = 90;
  const barMaxW = 180;
  const w = labelW + barMaxW + 80;
  const h = categories.length * (rowH + gap);
  const title = t("vendor_payment_timeline_title");

  let svg = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${_escStr(title)}"><title>${_escStr(title)}</title>`;

  categories.forEach((cat, i) => {
    const y = i * (rowH + gap);
    const paidW = Math.max((cat.totalPaid / maxTotal) * barMaxW, 2);
    const totalW = Math.max((cat.totalCost / maxTotal) * barMaxW, 2);
    const pct = cat.totalCost > 0 ? Math.round((cat.totalPaid / cat.totalCost) * 100) : 0;
    svg += `<text x="0" y="${y + 21}" font-size="11" fill="var(--text)">${_escStr(cat.category)}</text>`;
    svg += `<rect x="${labelW}" y="${y + 4}" width="${totalW}" height="${rowH - 8}" fill="var(--surface-2,#e2e8f0)" rx="4"/>`;
    svg += `<rect x="${labelW}" y="${y + 4}" width="${paidW}" height="${rowH - 8}" fill="var(--success)" rx="4" opacity="0.85"/>`;
    svg += `<text x="${labelW + totalW + 6}" y="${y + 21}" font-size="11" fill="var(--text)">${pct}%</text>`;
  });

  svg += `</svg>`;
  container.innerHTML = svg; // safe: numbers/CSS vars/escaped category strings
}

/** Escape a string for SVG text content. */
function _escStr(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── S147: Vendor Spend Timeline (vendor-timeline.js) ─────────────────────

/**
 * Render a cumulative payment timeline SVG in #vendorSpendTimeline.
 * Uses the pure `buildPaymentTimeline` helper from S122.
 */
function renderVendorSpendTimeline() {
  const container = document.getElementById("vendorSpendTimeline");
  if (!container) return;

  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  // Build synthetic payments from vendor records
  const payments = vendors
    .filter((v) => (Number(v.paid) || 0) > 0 && (v.paidAt || v.dueDate || v.createdAt))
    .map((v) => ({
      vendorId: v.id,
      amount: Number(v.paid) || 0,
      paidAt: v.paidAt || v.dueDate || v.createdAt || "",
    }));

  const points = buildPaymentTimeline(payments);
  if (points.length === 0) {
    container.textContent = t("vendor_spend_no_data");
    return;
  }

  const w = 340;
  const h = 120;
  const padL = 45;
  const padB = 20;
  const chartW = w - padL - 8;
  const chartH = h - padB - 14;
  const maxY = Math.max(points[points.length - 1].cumulative, 1);

  const scaleX = (/** @type {number} */ i) =>
    padL + (i / Math.max(points.length - 1, 1)) * chartW;
  const scaleY = (/** @type {number} */ val) =>
    h - padB - (val / maxY) * chartH;

  const linePts = points.map((p, i) => `${scaleX(i)},${scaleY(p.cumulative)}`).join(" ");
  const title = t("vendor_spend_timeline_title");

  let svg = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${_escStr(title)}"><title>${_escStr(title)}</title>`;
  if (points.length > 1) {
    svg += `<polyline points="${linePts}" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linejoin="round"/>`;
  }
  svg += `<text x="${padL}" y="${h - 4}" font-size="9" fill="var(--text-muted,#6b7280)">${points[0].date}</text>`;
  svg += `<text x="${w - 8}" y="${h - 4}" font-size="9" fill="var(--text-muted,#6b7280)" text-anchor="end">${points[points.length - 1].date}</text>`;
  svg += `<text x="${w / 2}" y="12" font-size="10" fill="var(--text)" text-anchor="middle">₪${points[points.length - 1].cumulative.toLocaleString()}</text>`;
  svg += `</svg>`;
  container.innerHTML = svg; // safe: numbers/dates/escaped strings
}

/**
 * Render top vendors by cost as horizontal bars in #vendorTopCost.
 */
function renderTopVendorsByCost() {
  const container = document.getElementById("vendorTopCost");
  if (!container) return;

  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  const top = topVendorsByCost(vendors, 5);
  if (top.length === 0) {
    container.textContent = "";
    return;
  }

  const maxCost = Math.max(top[0].cost, 1);
  const barH = 28;
  const gap = 6;
  const labelW = 90;
  const barMaxW = 160;
  const w = labelW + barMaxW + 80;
  const h = top.length * (barH + gap);
  const title = t("vendor_top_cost_title");

  let svg = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${_escStr(title)}"><title>${_escStr(title)}</title>`;
  top.forEach((v, i) => {
    const y = i * (barH + gap);
    const barW = Math.max((v.cost / maxCost) * barMaxW, 2);
    svg += `<text x="0" y="${y + 18}" font-size="11" fill="var(--text)">${_escStr(v.name)}</text>`;
    svg += `<rect x="${labelW}" y="${y + 2}" width="${barW}" height="${barH - 4}" fill="var(--accent,#8b5cf6)" rx="4" opacity="0.85"/>`;
    svg += `<text x="${labelW + barW + 6}" y="${y + 18}" font-size="11" fill="var(--text)">₪${v.cost.toLocaleString()}</text>`;
  });
  svg += `</svg>`;
  container.innerHTML = svg; // safe: numbers/escaped vendor names
}
