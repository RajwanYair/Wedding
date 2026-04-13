"use strict";

/* ── Contact Collector (Sprint 3.4) ──────────────────────────────────────────
   Public shareable form where guests submit their own contact details.
   The submission goes to the admin via Google Sheets POST (if configured)
   and also updates local guest data when the admin is logged in.
   ─────────────────────────────────────────────────────────────────────────── */

/**
 * Render the contact form in #sec-contact-form.
 * Called by showSection('contact-form').
 */
function renderContactForm() {
  const nameEl = document.getElementById("contactFormCoupleName");
  const dateEl = document.getElementById("contactFormDate");
  if (nameEl)
    nameEl.textContent =
      guestFullName({ firstName: _weddingInfo.groom, lastName: "" }) +
      " & " +
      (_weddingInfo.bride || "");
  if (dateEl) {
    dateEl.textContent = _weddingInfo.hebrewDate || "";
  }
  /* If already submitted this session, show success state */
  const submitted = sessionStorage.getItem(
    STORAGE_PREFIX + "contact_submitted",
  );
  const form = document.getElementById("contactFormFields");
  const success = document.getElementById("contactFormSuccess");
  if (form && success) {
    form.style.display = submitted ? "none" : "";
    success.style.display = submitted ? "" : "none";
  }
}

/**
 * Submit the contact collection form.
 * Validates inputs, builds a guest object, and:
 *  1. POSTs to Apps Script WebApp (if configured).
 *  2. Upserts into local _guests (admin only — avoids polluting other guests' local data).
 *  3. Marks session as submitted.
 */
function submitContactForm() {
  const firstName = sanitizeInput(
    (document.getElementById("ccFirstName").value || "").trim(),
    100,
  );
  const lastName = sanitizeInput(
    (document.getElementById("ccLastName").value || "").trim(),
    100,
  );
  const phone = sanitizeInput(
    (document.getElementById("ccPhone").value || "").trim(),
    20,
  );
  const email = sanitizeInput(
    (document.getElementById("ccEmail").value || "").trim(),
    254,
  );
  const side = document.getElementById("ccSide").value || "groom";

  if (!firstName) {
    document.getElementById("ccFirstName").focus();
    showToast(t("contact_required"), "error");
    return;
  }
  if (!phone && !email) {
    showToast(t("contact_phone_or_email"), "error");
    return;
  }
  if (phone && cleanPhone(phone).replace(/\D/g, "").length < 7) {
    showToast(t("contact_invalid_phone"), "error");
    return;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast(t("contact_invalid_email"), "error");
    return;
  }

  const now = new Date().toISOString();
  const guestData = {
    id: uid(),
    firstName,
    lastName,
    phone: phone ? cleanPhone(phone) : "",
    email,
    count: 1,
    children: 0,
    status: "pending",
    side,
    group: "other",
    relationship: "",
    meal: "regular",
    mealNotes: "",
    accessibility: false,
    tableId: "",
    notes: "",
    gift: "",
    sent: false,
    rsvpDate: "",
    createdAt: now,
    updatedAt: now,
    arrived: false,
    arrivedAt: null,
  };

  /* 1. If admin is logged in: upsert into local guest list */
  if (_authUser && _authUser.isAdmin) {
    const existing = _guests.find(function (g) {
      return (
        (phone && cleanPhone(g.phone || "") === cleanPhone(phone)) ||
        (email && g.email === email)
      );
    });
    if (existing) {
      Object.assign(existing, {
        firstName,
        lastName,
        phone: guestData.phone,
        email,
        side,
        updatedAt: now,
      });
    } else {
      _guests.push(guestData);
    }
    saveAll();
    renderGuests();
    renderStats();
  }

  /* 2. Send to Sheets WebApp (primary channel — reaches admin's data) */
  if (SHEETS_WEBAPP_URL) {
    const row = typeof guestToRow === "function" ? guestToRow(guestData) : null;
    if (row) {
      _sheetsWebAppPost({ action: "appendContact", row: row }).catch(
        function () {
          /* network failure is silent — guest sees success anyway */
        },
      );
    }
  }

  /* 3. Mark submitted and update UI */
  sessionStorage.setItem(STORAGE_PREFIX + "contact_submitted", "1");
  logAudit("contact_submit", firstName + " " + lastName);
  showToast(t("contact_submitted"), "success");

  const form = document.getElementById("contactFormFields");
  const success = document.getElementById("contactFormSuccess");
  if (form) form.style.display = "none";
  if (success) success.style.display = "";
}

/**
 * Generate the shareable contact-collector URL and copy to clipboard.
 * Called from the Settings card.
 */
function copyContactLink() {
  const url =
    window.location.origin + window.location.pathname + "#contact-form";
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(function () {
      showToast(t("contact_link_copied"), "success");
    });
  } else {
    const ta = document.createElement("textarea");
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showToast(t("contact_link_copied"), "success");
  }
}

/**
 * Render the shareable link + QR in the settings card.
 */
function renderContactSettings() {
  const linkEl = document.getElementById("contactCollectorLink");
  if (linkEl) {
    const url =
      window.location.origin + window.location.pathname + "#contact-form";
    linkEl.href = url;
    linkEl.textContent = url;
  }
}
