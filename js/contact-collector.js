// @ts-check
"use strict";

/* ── Contact Collector (Sprint 3.4) ──────────────────────────────────────────
   Public shareable form where guests submit their own contact details.
   The submission goes to the admin via Google Sheets POST (if configured)
   and also updates local guest data when the admin is logged in.
   ─────────────────────────────────────────────────────────────────────────── */

/**
 * Render the contact form in #sec-contact-form.
 * Called by window.showSection('contact-form').
 */
function renderContactForm() {
  const nameEl = document.getElementById("contactFormCoupleName");
  const dateEl = document.getElementById("contactFormDate");
  if (nameEl)
    nameEl.textContent =
      `${window.guestFullName({ firstName: window._weddingInfo.groom, lastName: "" }) 
      } & ${ 
      window._weddingInfo.bride || ""}`;
  if (dateEl) {
    dateEl.textContent = window._weddingInfo.hebrewDate || "";
  }
  /* If already submitted this session, show success state */
  const submitted = sessionStorage.getItem(
    `${window.STORAGE_PREFIX  }contact_submitted`,
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
 *  2. Upserts into local window._guests (admin only — avoids polluting other guests' local data).
 *  3. Marks session as submitted.
 */
function submitContactForm() {
  const firstName = window.sanitizeInput(
    (document.getElementById("ccFirstName").value || "").trim(),
    100,
  );
  const lastName = window.sanitizeInput(
    (document.getElementById("ccLastName").value || "").trim(),
    100,
  );
  const phone = window.sanitizeInput(
    (document.getElementById("ccPhone").value || "").trim(),
    20,
  );
  const email = window.sanitizeInput(
    (document.getElementById("ccEmail").value || "").trim(),
    254,
  );
  const side = document.getElementById("ccSide").value || "groom";

  if (!firstName) {
    document.getElementById("ccFirstName").focus();
    window.showToast(window.t("contact_required"), "error");
    return;
  }
  if (!phone && !email) {
    window.showToast(window.t("contact_phone_or_email"), "error");
    return;
  }
  if (phone && window.cleanPhone(phone).replace(/\D/g, "").length < 7) {
    window.showToast(window.t("contact_invalid_phone"), "error");
    return;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    window.showToast(window.t("contact_invalid_email"), "error");
    return;
  }

  const now = new Date().toISOString();
  const guestData = {
    id: window.uid(),
    firstName,
    lastName,
    phone: phone ? window.cleanPhone(phone) : "",
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
  if (window._authUser && window._authUser.isAdmin) {
    const existing = window._guests.find(function (g) {
      return (
        (phone && window.cleanPhone(g.phone || "") === window.cleanPhone(phone)) ||
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
      window._guests.push(guestData);
    }
    window.saveAll();
    window.renderGuests();
    window.renderStats();
  }

  /* 2. Send to Sheets WebApp (primary channel — reaches admin's data) */
  if (window.SHEETS_WEBAPP_URL) {
    const row = typeof guestToRow === "function" ? window.guestToRow(guestData) : null;
    if (row) {
      window._sheetsWebAppPost({ action: "appendContact", row }).catch(
        function () {
          /* network failure is silent — guest sees success anyway */
        },
      );
    }
  }

  /* 3. Mark submitted and update UI */
  sessionStorage.setItem(`${window.STORAGE_PREFIX  }contact_submitted`, "1");
  window.logAudit("contact_submit", `${firstName  } ${  lastName}`);
  window.showToast(window.t("contact_submitted"), "success");

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
    `${window.location.origin + window.location.pathname  }#contact-form`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(function () {
      window.showToast(window.t("contact_link_copied"), "success");
    });
  } else {
    const ta = document.createElement("textarea");
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    window.showToast(window.t("contact_link_copied"), "success");
  }
}

/**
 * Render the shareable link + QR in the settings card.
 */
function renderContactSettings() {
  const linkEl = document.getElementById("contactCollectorLink");
  if (linkEl) {
    const url =
      `${window.location.origin + window.location.pathname  }#contact-form`;
    linkEl.href = url;
    linkEl.textContent = url;
  }
}
