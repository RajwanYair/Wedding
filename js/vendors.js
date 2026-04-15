// @ts-check
"use strict";

/* ── Vendor Management ── */

const VENDOR_CATEGORIES = [
  "venue",
  "catering",
  "photography",
  "video",
  "flowers",
  "music",
  "cake",
  "attire",
  "transport",
  "other",
];

/** @type {string|null} */
let _editingVendorId = null;

/**
 * Render the vendor list and payment totals.
 */
function renderVendors() {
  const listEl = window.el.vendorList;
  if (!listEl) return;
  listEl.replaceChildren();

  const vendors = window._vendors || [];

  /* ── Totals banner ── */
  const totalPrice = vendors.reduce(function (s, v) {
    return s + (v.price || 0);
  }, 0);
  const totalPaid = vendors.reduce(function (s, v) {
    return s + (v.paid || 0);
  }, 0);
  const remaining = totalPrice - totalPaid;

  const banner = document.getElementById("vendorTotalBanner");
  if (banner) {
    banner.textContent = window
      .t("vendor_total")
      .replace("{total}", totalPrice.toLocaleString())
      .replace("{paid}", totalPaid.toLocaleString())
      .replace("{remaining}", remaining.toLocaleString());
    banner.className =
      `vendor-total-banner ${  remaining > 0 ? "has-remaining" : "fully-paid"}`;
  }

  if (vendors.length === 0) {
    const empty = document.getElementById("vendorsEmpty");
    if (empty) empty.style.display = "block";
    return;
  }
  const empty = document.getElementById("vendorsEmpty");
  if (empty) empty.style.display = "none";

  /* ── Table ── */
  const frag = document.createDocumentFragment();
  vendors.forEach(function (v) {
    const tr = document.createElement("tr");

    const catKey = `vendor_cat_${  v.category || "other"}`;

    const tdCat = document.createElement("td");
    tdCat.textContent = window.t(catKey);

    const tdName = document.createElement("td");
    const nameStrong = document.createElement("strong");
    nameStrong.textContent = v.name || "";
    tdName.appendChild(nameStrong);
    if (v.contact) {
      const sub = document.createElement("div");
      sub.style.cssText = "font-size:0.8em; color:var(--text-muted);";
      sub.textContent = v.contact;
      tdName.appendChild(sub);
    }

    const tdPhone = document.createElement("td");
    tdPhone.dir = "ltr";
    if (v.phone) {
      const a = document.createElement("a");
      a.href = `tel:${  v.phone}`;
      a.textContent = v.phone;
      a.style.cssText = "color:var(--accent); text-decoration:none;";
      tdPhone.appendChild(a);
    }

    const tdPrice = document.createElement("td");
    tdPrice.textContent = v.price
      ? `₪${  Number(v.price).toLocaleString()}`
      : "—";

    const tdPaid = document.createElement("td");
    const paidPct =
      v.price > 0 ? Math.round(((v.paid || 0) / v.price) * 100) : 0;
    const paidSpan = document.createElement("span");
    paidSpan.className =
      `payment-badge ${ 
      paidPct >= 100
        ? "paid-full"
        : paidPct > 0
          ? "paid-partial"
          : "paid-none"}`;
    paidSpan.textContent =
      `₪${  Number(v.paid || 0).toLocaleString()  } (${  paidPct  }%)`;
    tdPaid.appendChild(paidSpan);

    const tdNotes = document.createElement("td");
    tdNotes.style.cssText =
      "font-size:0.85em; color:var(--text-muted); max-width:12rem;";
    tdNotes.textContent = v.notes || "";

    const tdActions = document.createElement("td");
    tdActions.style.cssText = "white-space:nowrap;";

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn btn-secondary btn-small";
    btnEdit.setAttribute("data-action", "editVendor");
    btnEdit.setAttribute("data-action-arg", v.id);
    btnEdit.title = window.t("btn_edit");
    btnEdit.textContent = "✏️";

    const btnDel = document.createElement("button");
    btnDel.className = "btn btn-danger btn-small";
    btnDel.setAttribute("data-action", "deleteVendor");
    btnDel.setAttribute("data-action-arg", v.id);
    btnDel.title = window.t("btn_delete");
    btnDel.textContent = "🗑️";

    tdActions.appendChild(btnEdit);
    tdActions.appendChild(document.createTextNode(" "));
    tdActions.appendChild(btnDel);

    tr.appendChild(tdCat);
    tr.appendChild(tdName);
    tr.appendChild(tdPhone);
    tr.appendChild(tdPrice);
    tr.appendChild(tdPaid);
    tr.appendChild(tdNotes);
    tr.appendChild(tdActions);
    frag.appendChild(tr);
  });

  const tbody = document.getElementById("vendorTableBody");
  if (tbody) {
    tbody.replaceChildren(frag);
  }
}

/**
 * Open the add-vendor modal with blank fields.
 */
function openAddVendorModal() {
  if (!window._authUser || !window._authUser.isAdmin) return;
  _editingVendorId = null;
  document.getElementById("vendorModalTitle").textContent =
    window.t("modal_add_vendor");
  document.getElementById("vendorCategory").value = "other";
  document.getElementById("vendorName").value = "";
  document.getElementById("vendorContact").value = "";
  document.getElementById("vendorPhone").value = "";
  document.getElementById("vendorPrice").value = "";
  document.getElementById("vendorPaid").value = "";
  document.getElementById("vendorNotes").value = "";
  window.openModal("vendorModal");
}

/**
 * Open the edit-vendor modal prefilled with the given vendor's data.
 * @param {string} id
 */
function editVendor(id) {
  if (!window._authUser || !window._authUser.isAdmin) return;
  const v = (window._vendors || []).find(function (x) {
    return x.id === id;
  });
  if (!v) return;
  _editingVendorId = id;
  document.getElementById("vendorModalTitle").textContent =
    window.t("modal_edit_vendor");
  document.getElementById("vendorCategory").value = v.category || "other";
  document.getElementById("vendorName").value = v.name || "";
  document.getElementById("vendorContact").value = v.contact || "";
  document.getElementById("vendorPhone").value = v.phone || "";
  document.getElementById("vendorPrice").value = v.price != null ? v.price : "";
  document.getElementById("vendorPaid").value = v.paid != null ? v.paid : "";
  document.getElementById("vendorNotes").value = v.notes || "";
  window.openModal("vendorModal");
}

/**
 * Save the vendor modal form (add or update).
 */
function saveVendor() {
  if (!window._authUser || !window._authUser.isAdmin) return;
  const name = window.sanitizeInput(
    document.getElementById("vendorName").value,
    200,
  );
  if (!name) {
    document.getElementById("vendorName").focus();
    return;
  }
  const data = {
    category: document.getElementById("vendorCategory").value || "other",
    name,
    contact: window.sanitizeInput(
      document.getElementById("vendorContact").value,
      100,
    ),
    phone: window.sanitizeInput(
      document.getElementById("vendorPhone").value,
      20,
    ),
    price: parseFloat(document.getElementById("vendorPrice").value) || 0,
    paid: parseFloat(document.getElementById("vendorPaid").value) || 0,
    notes: window.sanitizeInput(
      document.getElementById("vendorNotes").value,
      500,
    ),
    updatedAt: new Date().toISOString(),
  };

  if (!window._vendors) window._vendors = [];

  if (_editingVendorId) {
    const v = window._vendors.find(function (x) {
      return x.id === _editingVendorId;
    });
    if (v) Object.assign(v, data);
  } else {
    window._vendors.push(
      Object.assign(
        { id: window.uid(), createdAt: new Date().toISOString() },
        data,
      ),
    );
  }

  window.saveAll();
  window.closeModal("vendorModal");
  renderVendors();
  window.showToast(window.t("toast_vendor_saved"), "success");
}

/**
 * Delete a vendor by id after confirmation.
 * @param {string} id
 */
function deleteVendor(id) {
  if (!window._authUser || !window._authUser.isAdmin) return;
  if (!confirm(window.t("confirm_delete"))) return;
  window._vendors = (window._vendors || []).filter(function (v) {
    return v.id !== id;
  });
  window.saveAll();
  renderVendors();
  window.showToast(window.t("toast_vendor_deleted"), "error");
}
