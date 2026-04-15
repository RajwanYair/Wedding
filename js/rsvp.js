// @ts-check
'use strict';

/* ── RSVP ── */

/** 90-second cooldown between RSVP submissions (guest users only) */
const _RSVP_COOLDOWN_MS = 90 * 1000;

function _rsvpCooldownOk() {
  const last = parseInt(localStorage.getItem(`${window.STORAGE_PREFIX  }lastRsvp`) || '0', 10);
  return (Date.now() - last) >= _RSVP_COOLDOWN_MS;
}

/**
 * Phone-first lookup: called on every input/blur of rsvpPhone.
 * - If phone has ≥7 digits → search guests by cleaned phone number.
 * - Found  → reveal form pre-filled with existing data, show "found" status.
 * - Not found → reveal empty form, show "new guest" status.
 * - Too short → hide form, show hint.
 */
function lookupRsvpByPhone() {
  const raw = document.getElementById("rsvpPhone").value;
  const cleaned = window.cleanPhone(raw);
  const status = document.getElementById("rsvpLookupStatus");
  const details = document.getElementById("rsvpDetails");

  /* Need at least 7 digits */
  if (cleaned.replace(/\D/g, "").length < 7) {
    details.style.display = "none";
    status.style.display = "block";
    status.style.color = "var(--text-secondary)";
    status.textContent = window.t("rsvp_phone_hint");
    return;
  }

  /* Search in-memory guests by cleaned phone */
  const match = window._guests.find(function (g) {
    return g.phone && window.cleanPhone(g.phone) === cleaned;
  });

  details.style.display = "";

  if (match) {
    /* Pre-fill form with existing guest data */
    document.getElementById("rsvpFirstName").value = match.firstName || "";
    document.getElementById("rsvpLastName").value = match.lastName || "";
    document.getElementById("rsvpSide").value = match.side || "groom";
    document.getElementById("rsvpAttending").value =
      match.status || "confirmed";
    document.getElementById("rsvpGuests").value = match.count || 1;
    document.getElementById("rsvpChildren").value = match.children || 0;
    document.getElementById("rsvpMeal").value = match.meal || "regular";
    document.getElementById("rsvpAccessibility").checked =
      !!match.accessibility;
    document.getElementById("rsvpTransport").value = match.transport || "";
    document.getElementById("rsvpNotes").value = match.notes || "";
    status.style.display = "block";
    status.style.color = "var(--positive, #34d399)";
    status.textContent = window.t("rsvp_lookup_found");
  } else {
    /* Clear form for new guest entry */
    document.getElementById("rsvpFirstName").value = "";
    document.getElementById("rsvpLastName").value = "";
    document.getElementById("rsvpSide").value = "groom";
    document.getElementById("rsvpAttending").value = "confirmed";
    document.getElementById("rsvpGuests").value = "1";
    document.getElementById("rsvpChildren").value = "0";
    document.getElementById("rsvpMeal").value = "regular";
    document.getElementById("rsvpAccessibility").checked = false;
    document.getElementById("rsvpTransport").value = "";
    document.getElementById("rsvpNotes").value = "";
    status.style.display = "block";
    status.style.color = "var(--text-secondary)";
    status.textContent = window.t("rsvp_lookup_new");
  }
}

function submitRSVP() {
  /* Rate-limit unauthenticated/guest users to prevent spam submissions */
  if (!(window._authUser && window._authUser.isAdmin) && !_rsvpCooldownOk()) {
    window.showToast(window.t("toast_rsvp_cooldown"), "warning");
    return;
  }

  const firstName = window.sanitizeInput(
    document.getElementById("rsvpFirstName").value,
    100,
  );
  if (!firstName) {
    document.getElementById("rsvpFirstName").focus();
    return;
  }

  const lastName = window.sanitizeInput(
    document.getElementById("rsvpLastName").value,
    100,
  );
  const phone = window.sanitizeInput(document.getElementById("rsvpPhone").value, 20);
  const notes = window.sanitizeInput(document.getElementById("rsvpNotes").value, 1000);
  const status = document.getElementById("rsvpAttending").value;
  const side = document.getElementById("rsvpSide").value;
  const count = parseInt(document.getElementById("rsvpGuests").value, 10) || 1;
  const children =
    parseInt(document.getElementById("rsvpChildren").value, 10) || 0;
  const meal = document.getElementById("rsvpMeal").value;
  const accessibility = document.getElementById("rsvpAccessibility").checked;
  const transport = document.getElementById("rsvpTransport").value || "";
  const now = new Date().toISOString();

  // Match by phone or full name
  const existing = window._guests.find(function (g) {
    return (
      (phone && g.phone === phone) ||
      window.guestFullName(g).toLowerCase() ===
        (`${firstName  } ${  lastName}`).trim().toLowerCase()
    );
  });

  if (existing) {
    existing.status = status;
    existing.count = count;
    existing.children = children;
    existing.meal = meal;
    existing.accessibility = accessibility;
    existing.transport = transport;
    if (notes) existing.notes = notes;
    if (lastName && !existing.lastName) existing.lastName = lastName;
    existing.rsvpDate = now;
    existing.updatedAt = now;
    window.showToast(window.t("toast_rsvp_updated"), "success");
  } else {
    window._guests.push({
      id: window.uid(),
      firstName,
      lastName,
      phone,
      email: "",
      count,
      children,
      status,
      side,
      group: "other",
      relationship: "",
      meal,
      mealNotes: "",
      accessibility,
      transport,
      tableId: "",
      notes,
      gift: "",
      sent: false,
      rsvpDate: now,
      createdAt: now,
      updatedAt: now,
    });
    window.showToast(window.t("toast_rsvp_submitted"), "success");
  }

  window.saveAll();
  window.renderGuests();
  window.renderStats();
  /* Record submission timestamp for rate-limiting (guest users) */
  if (!(window._authUser && window._authUser.isAdmin)) {
    localStorage.setItem(`${window.STORAGE_PREFIX  }lastRsvp`, String(Date.now()));
  }
  // Sync to Google Sheets
  if (window._authUser && window._authUser.isAdmin) {
    window.syncGuestsToSheets();
  } else if (window.SHEETS_WEBAPP_URL) {
    const rsvpGuest = existing || window._guests[window._guests.length - 1];
    if (navigator.onLine) {
      window.sheetsAppendRsvp(rsvpGuest);
    } else {
      /* Device is offline — queue for later */
      const row =
        typeof guestToRow === "function" ? window.guestToRow(rsvpGuest) : null;
      if (row) window.enqueueOfflineRsvp("rsvp", { action: "appendRsvp", row });
    }
  }

  window.logAudit("rsvp_submit", `${firstName  } ${  lastName}`);

  /* Email notifications (Sprint 3.6) */
  const notifyGuest = existing || window._guests[window._guests.length - 1];
  window.sendRsvpConfirmation(notifyGuest);
  window.sendAdminRsvpNotify(notifyGuest);

  // Reset RSVP form
  ["rsvpFirstName", "rsvpLastName", "rsvpPhone", "rsvpNotes"].forEach(
    function (id) {
      document.getElementById(id).value = "";
    },
  );
  document.getElementById("rsvpAttending").value = "confirmed";
  document.getElementById("rsvpGuests").value = "1";
  document.getElementById("rsvpChildren").value = "0";
  document.getElementById("rsvpMeal").value = "regular";
  document.getElementById("rsvpAccessibility").checked = false;
  document.getElementById("rsvpTransport").value = "";
  /* Hide details panel and reset lookup status */
  document.getElementById("rsvpDetails").style.display = "none";
  const st = document.getElementById("rsvpLookupStatus");
  st.style.display = "block";
  st.style.color = "var(--text-secondary)";
  st.textContent = window.t("rsvp_phone_hint");
}

