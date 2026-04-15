// @ts-check
"use strict";

/* ── Guest Management ── */

/* S3.3: IDs of guests whose data is saved locally but not yet confirmed by Sheets sync */
const _guestPendingSync = new Set();

/* Called by sheets._flushWriteQueue() when a batch sync completes. */
function clearGuestPendingSync() {
  _guestPendingSync.clear();
  /* Re-render to remove pending indicators */
  const tbody = document.getElementById("guestTableBody");
  if (tbody) {
    tbody.querySelectorAll("tr[data-sync-pending]").forEach(function (tr) {
      tr.removeAttribute("data-sync-pending");
    });
  }
}

/* ── Guests ── */
function renderGuests() {
  const q = (window.el.guestSearch.value || "").trim().toLowerCase();
  let list = window._guests.slice();

  // Sort
  if (window._sortCol) {
    list.sort(function (a, b) {
      const av = (a[window._sortCol] || "").toString().toLowerCase();
      const bv = (b[window._sortCol] || "").toString().toLowerCase();
      return window._sortAsc
        ? av.localeCompare(bv, "he")
        : bv.localeCompare(av, "he");
    });
  }

  // Filter by status
  if (window._currentFilter !== "all") {
    list = list.filter(function (g) {
      return g.status === window._currentFilter;
    });
  }
  // Filter by side
  if (window._sideFilter !== "all") {
    list = list.filter(function (g) {
      return (g.side || "mutual") === window._sideFilter;
    });
  }
  // Search
  if (q) {
    list = list.filter(function (g) {
      const full = `${g.firstName || ""} ${g.lastName || ""}`.toLowerCase();
      return (
        full.includes(q) ||
        (g.phone || "").includes(q) ||
        (g.relationship || "").toLowerCase().includes(q)
      );
    });
  }

  window.el.guestsEmpty.style.display =
    list.length === 0 &&
    !q &&
    window._currentFilter === "all" &&
    window._sideFilter === "all"
      ? "block"
      : "none";

  const frag = document.createDocumentFragment();
  list.forEach(function (g) {
    const tr = document.createElement("tr");
    if (_guestPendingSync.has(g.id)) tr.dataset.syncPending = "1";
    const tableName = g.tableId ? window.getTableName(g.tableId) : "\u2014";
    const statusClass = `status-${g.status}`;
    const sideClass = `side-${g.side || "mutual"}`;
    const mealClass = `meal-${g.meal || "regular"}`;
    const sideKey = g.side || "mutual";
    const mealKey = g.meal || "regular";
    const statusKey = g.status || "pending";

    /* td: First name */
    const tdFirst = document.createElement("td");
    const strong = document.createElement("strong");
    strong.textContent = g.firstName || "";
    tdFirst.appendChild(strong);

    /* td: Last name */
    const tdLast = document.createElement("td");
    tdLast.textContent = g.lastName || "";

    /* td: Side */
    const tdSide = document.createElement("td");
    const sideBadge = document.createElement("span");
    sideBadge.className = `side-badge ${sideClass}`;
    const sideIcon = document.createElement("span");
    sideIcon.className = "badge-icon";
    sideIcon.textContent = window.SIDE_ICON[sideKey] || "";
    sideBadge.appendChild(sideIcon);
    sideBadge.appendChild(
      document.createTextNode(` ${window.t(`side_${sideKey}`)}`),
    );
    tdSide.appendChild(sideBadge);

    /* td: Phone */
    const tdPhone = document.createElement("td");
    tdPhone.dir = "ltr";
    tdPhone.style.textAlign = "right";
    tdPhone.textContent = (g.phone ? "\ud83d\udcde " : "") + (g.phone || "");

    /* td: Count */
    const tdCount = document.createElement("td");
    tdCount.textContent =
      (g.count || 1) + (g.children ? ` +${g.children}\ud83d\udc76` : "");

    /* td: Meal + accessibility */
    const tdMeal = document.createElement("td");
    const mealBadge = document.createElement("span");
    mealBadge.className = `meal-badge ${mealClass}`;
    const mealIcon = document.createElement("span");
    mealIcon.className = "badge-icon";
    mealIcon.textContent = window.MEAL_ICON[mealKey] || "";
    mealBadge.appendChild(mealIcon);
    mealBadge.appendChild(
      document.createTextNode(` ${window.t(`meal_${mealKey}`)}`),
    );
    tdMeal.appendChild(mealBadge);
    if (g.accessibility) {
      const accessChip = document.createElement("span");
      accessChip.className = "chip-access";
      accessChip.title = window.t("label_accessibility");
      accessChip.textContent = "\u267f";
      tdMeal.appendChild(document.createTextNode(" "));
      tdMeal.appendChild(accessChip);
    }

    /* td: Transport */
    const tdTransport = document.createElement("td");
    if (g.transport && g.transport !== "none" && g.transport !== "") {
      const transportChip = document.createElement("span");
      transportChip.className = "chip-transport";
      transportChip.title = window.t("label_transport");
      transportChip.textContent = `\uD83D\uDE8C ${window.t(`transport_${g.transport}`)}`;
      tdTransport.appendChild(transportChip);
    }

    /* td: Status */
    const tdStatus = document.createElement("td");
    const statusBadge = document.createElement("span");
    statusBadge.className = `status-badge ${statusClass}`;
    const statusIcon = document.createElement("span");
    statusIcon.className = "badge-icon";
    statusIcon.textContent = window.STATUS_ICON[statusKey] || "";
    statusBadge.appendChild(statusIcon);
    statusBadge.appendChild(
      document.createTextNode(` ${window.t(`status_${statusKey}`)}`),
    );
    tdStatus.appendChild(statusBadge);

    /* td: Table */
    const tdTable = document.createElement("td");
    tdTable.textContent =
      (tableName !== "\u2014" ? "\ud83e\ude91 " : "") + tableName;

    /* td: Actions */
    const tdActions = document.createElement("td");
    tdActions.style.whiteSpace = "nowrap";

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn btn-secondary btn-small";
    btnEdit.setAttribute("data-action", "editGuest");
    btnEdit.setAttribute("data-action-arg", g.id);
    btnEdit.title = window.t("btn_edit");
    btnEdit.textContent = "\u270f\ufe0f";

    const btnDel = document.createElement("button");
    btnDel.className = "btn btn-danger btn-small";
    btnDel.setAttribute("data-action", "deleteGuest");
    btnDel.setAttribute("data-action-arg", g.id);
    btnDel.title = window.t("btn_delete");
    btnDel.textContent = "\ud83d\uddd1\ufe0f";

    const btnWa = document.createElement("button");
    btnWa.className = "btn btn-whatsapp btn-small";
    btnWa.setAttribute("data-action", "sendWhatsAppSingle");
    btnWa.setAttribute("data-action-arg", g.id);
    btnWa.title = "WhatsApp";
    btnWa.textContent = "\ud83d\udcf1";

    tdActions.appendChild(btnEdit);
    tdActions.appendChild(document.createTextNode(" "));
    tdActions.appendChild(btnDel);
    tdActions.appendChild(document.createTextNode(" "));
    tdActions.appendChild(btnWa);

    tr.appendChild(tdFirst);
    tr.appendChild(tdLast);
    tr.appendChild(tdSide);
    tr.appendChild(tdPhone);
    tr.appendChild(tdCount);
    tr.appendChild(tdMeal);
    tr.appendChild(tdTransport);
    tr.appendChild(tdStatus);
    tr.appendChild(tdTable);
    tr.appendChild(tdActions);

    frag.appendChild(tr);
  });

  window.el.guestTableBody.replaceChildren();
  window.el.guestTableBody.appendChild(frag);
}

function filterGuests() {
  renderGuests();
}

function setFilter(f) {
  window._currentFilter = f;
  document.querySelectorAll("[data-filter]").forEach(function (btn) {
    btn.classList.toggle("active", btn.getAttribute("data-filter") === f);
  });
  renderGuests();
}

function setSideFilter(f) {
  window._sideFilter = f;
  document.querySelectorAll("[data-side]").forEach(function (btn) {
    btn.classList.toggle("active", btn.getAttribute("data-side") === f);
  });
  renderGuests();
}

function sortGuestsBy(col) {
  if (window._sortCol === col) {
    window._sortAsc = !window._sortAsc;
  } else {
    window._sortCol = col;
    window._sortAsc = true;
  }
  // Update sort indicators
  document.querySelectorAll('[id^="si-"]').forEach(function (s) {
    s.textContent = "↕";
  });
  const ind = document.getElementById(`si-${col}`);
  if (ind) ind.textContent = window._sortAsc ? "↑" : "↓";
  renderGuests();
}

function openAddGuestModal() {
  window._editingGuestId = null;
  document.getElementById("guestModalTitle").textContent =
    window.t("modal_add_guest");
  document.getElementById("guestFirstName").value = "";
  document.getElementById("guestLastName").value = "";
  document.getElementById("guestPhone").value = "";
  document.getElementById("guestEmail").value = "";
  document.getElementById("guestCount2").value = "1";
  document.getElementById("guestChildren").value = "0";
  document.getElementById("guestStatus").value = "pending";
  document.getElementById("guestSide").value = "groom";
  document.getElementById("guestGroup").value = "family";
  document.getElementById("guestRelationship").value = "";
  document.getElementById("guestMeal").value = "regular";
  document.getElementById("guestMealNotes").value = "";
  document.getElementById("guestAccessibility").checked = false;
  document.getElementById("guestTransport").value = "";
  document.getElementById("guestGift").value = "";
  document.getElementById("guestNotes").value = "";
  window.populateTableSelect();
  document.getElementById("guestTableSelect").value = "";
  window.openModal("guestModal");
}

function editGuest(id) {
  const g = window._guests.find(function (x) {
    return x.id === id;
  });
  if (!g) return;
  window._editingGuestId = id;
  document.getElementById("guestModalTitle").textContent =
    window.t("modal_edit_guest");
  document.getElementById("guestFirstName").value = g.firstName || "";
  document.getElementById("guestLastName").value = g.lastName || "";
  document.getElementById("guestPhone").value = g.phone || "";
  document.getElementById("guestEmail").value = g.email || "";
  document.getElementById("guestCount2").value = g.count || 1;
  document.getElementById("guestChildren").value = g.children || 0;
  document.getElementById("guestStatus").value = g.status || "pending";
  document.getElementById("guestSide").value = g.side || "groom";
  document.getElementById("guestGroup").value = g.group || "family";
  document.getElementById("guestRelationship").value = g.relationship || "";
  document.getElementById("guestMeal").value = g.meal || "regular";
  document.getElementById("guestMealNotes").value = g.mealNotes || "";
  document.getElementById("guestAccessibility").checked = !!g.accessibility;
  document.getElementById("guestTransport").value = g.transport || "";
  document.getElementById("guestGift").value = g.gift || "";
  document.getElementById("guestNotes").value = g.notes || "";
  window.populateTableSelect();
  document.getElementById("guestTableSelect").value = g.tableId || "";
  window.openModal("guestModal");
}

function saveGuest() {
  if (!window._authUser || !window._authUser.isAdmin) return;
  const firstName = window.sanitizeInput(
    document.getElementById("guestFirstName").value,
    100,
  );
  if (!firstName) {
    document.getElementById("guestFirstName").focus();
    return;
  }

  const data = {
    firstName,
    lastName: window.sanitizeInput(
      document.getElementById("guestLastName").value,
      100,
    ),
    phone: window.sanitizeInput(
      document.getElementById("guestPhone").value,
      20,
    ),
    email: window.sanitizeInput(
      document.getElementById("guestEmail").value,
      254,
    ),
    count: Math.max(
      1,
      Math.min(
        50,
        parseInt(document.getElementById("guestCount2").value, 10) || 1,
      ),
    ),
    children: Math.max(
      0,
      Math.min(
        50,
        parseInt(document.getElementById("guestChildren").value, 10) || 0,
      ),
    ),
    status: document.getElementById("guestStatus").value,
    side: document.getElementById("guestSide").value,
    group: document.getElementById("guestGroup").value,
    relationship: window.sanitizeInput(
      document.getElementById("guestRelationship").value,
      100,
    ),
    meal: document.getElementById("guestMeal").value,
    mealNotes: window.sanitizeInput(
      document.getElementById("guestMealNotes").value,
      300,
    ),
    accessibility: document.getElementById("guestAccessibility").checked,
    transport: document.getElementById("guestTransport").value || "",
    tableId: document.getElementById("guestTableSelect").value,
    gift: window.sanitizeInput(document.getElementById("guestGift").value, 200),
    notes: window.sanitizeInput(
      document.getElementById("guestNotes").value,
      500,
    ),
    updatedAt: new Date().toISOString(),
  };

  if (window._editingGuestId) {
    const g = window._guests.find(function (x) {
      return x.id === window._editingGuestId;
    });
    if (g) Object.assign(g, data);
  } else {
    /* ── Duplicate detection (new guests only) ── */
    const cleanedNewPhone = data.phone ? window.cleanPhone(data.phone) : "";
    if (cleanedNewPhone) {
      const dupPhone = window._guests.find(function (g) {
        return window.cleanPhone(g.phone || "") === cleanedNewPhone;
      });
      if (
        dupPhone &&
        !confirm(
          window
            .t("duplicate_guest_phone")
            .replace("{name}", window.guestFullName(dupPhone)),
        )
      ) {
        return;
      }
    }
    const fullNameNew = `${data.firstName || ""} ${data.lastName || ""}`
      .trim()
      .toLowerCase();
    if (fullNameNew) {
      const dupName = window._guests.find(function (g) {
        return (
          `${g.firstName || ""} ${g.lastName || ""}`.trim().toLowerCase() ===
          fullNameNew
        );
      });
      if (
        dupName &&
        !confirm(
          window
            .t("duplicate_guest_name")
            .replace("{name}", window.guestFullName(dupName)),
        )
      ) {
        return;
      }
    }
    const newId = window.uid();
    window._guests.push(
      Object.assign(
        {
          id: newId,
          sent: false,
          rsvpDate: "",
          createdAt: new Date().toISOString(),
        },
        data,
      ),
    );
    _guestPendingSync.add(newId);
  }

  /* S3.3: mark as pending-sync for optimistic UI indicator */
  if (window._editingGuestId) _guestPendingSync.add(window._editingGuestId);

  window.saveAll();
  window.enqueueSheetWrite("guests", window.syncGuestsToSheets);
  window.closeModal("guestModal");
  renderGuests();
  window.renderStats();
  window.showToast(window.t("toast_guest_saved"), "success");
  window.logAudit(
    window._editingGuestId ? "guest_edit" : "guest_add",
    `${data.firstName} ${data.lastName}`,
  );
}

function deleteGuest(id) {
  if (!window._authUser || !window._authUser.isAdmin) return;
  if (!confirm(window.t("confirm_delete"))) return;
  const gone = window._guests.find(function (g) {
    return g.id === id;
  });
  window._guests = window._guests.filter(function (g) {
    return g.id !== id;
  });
  window.saveAll();
  window.syncGuestsToSheets();
  renderGuests();
  window.renderStats();
  window.showToast(window.t("toast_guest_deleted"), "error");
  if (gone)
    window.logAudit("guest_delete", `${gone.firstName} ${gone.lastName || ""}`);
}
