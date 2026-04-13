"use strict";

/* ── Email Notifications (Sprint 3.6) ── */

/**
 * Default email settings.  All values are overridden by the persisted config.
 * Stored under wedding_v1_emailSettings in localStorage.
 */
const _EMAIL_DEFAULTS = {
  enabled: false,
  rsvpConfirmation: true, // send guest a confirmation email on RSVP
  adminNotify: true, // notify admin when a new RSVP arrives
};

let _emailSettings = { ..._EMAIL_DEFAULTS };

/* ── Persistence ── */

function loadEmailSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + "emailSettings");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        _emailSettings = { ..._EMAIL_DEFAULTS, ...parsed };
      }
    }
  } catch (_e) {
    /* silent */
  }
}

function saveEmailSettings() {
  try {
    localStorage.setItem(
      STORAGE_PREFIX + "emailSettings",
      JSON.stringify(_emailSettings),
    );
  } catch (_e) {
    /* silent */
  }
}

/* ── Send helpers ── */

/**
 * Ask the Apps Script web-app to send an RSVP confirmation email to the guest.
 * Silently no-ops when email is disabled, guest has no email, or no web-app URL.
 * @param {{ firstName:string, email:string, status:string }} guest
 */
function sendRsvpConfirmation(guest) {
  if (!_emailSettings.enabled || !_emailSettings.rsvpConfirmation) return;
  if (!guest || !guest.email) return;
  if (!SHEETS_WEBAPP_URL) return;
  _sheetsWebAppPost({
    action: "sendEmail",
    type: "rsvpConfirmation",
    to: sanitizeInput(guest.email, 254),
    name: sanitizeInput(guest.firstName || "", 100),
    status: sanitizeInput(guest.status || "confirmed", 20),
  }).catch(function () {
    /* non-fatal */
  });
}

/**
 * Ask the Apps Script web-app to notify the current admin about a new RSVP.
 * Only fires when the admin is signed-in (so their email is known).
 * @param {{ firstName:string, phone:string, status:string }} guest
 */
function sendAdminRsvpNotify(guest) {
  if (!_emailSettings.enabled || !_emailSettings.adminNotify) return;
  if (!_authUser || !_authUser.isAdmin || !_authUser.email) return;
  if (!SHEETS_WEBAPP_URL) return;
  _sheetsWebAppPost({
    action: "sendEmail",
    type: "adminRsvpNotify",
    to: sanitizeInput(_authUser.email, 254),
    name: sanitizeInput(guest.firstName || "", 100),
    phone: sanitizeInput(guest.phone || "", 30),
    status: sanitizeInput(guest.status || "", 20),
  }).catch(function () {
    /* non-fatal */
  });
}

/* ── Settings UI ── */

function renderEmailSettings() {
  const card = document.getElementById("emailSettingsCard");
  if (!card) return;

  /* Clear previous content safely */
  while (card.firstChild) {
    card.removeChild(card.firstChild);
  }

  /* ── Enable toggle ── */
  const toggleRow = document.createElement("label");
  toggleRow.style.cssText =
    "display:flex; align-items:center; gap:0.6rem; cursor:pointer; margin-bottom:0.8rem; font-size:0.9em;";

  const chkEnabled = document.createElement("input");
  chkEnabled.type = "checkbox";
  chkEnabled.id = "emailEnabled";
  chkEnabled.checked = !!_emailSettings.enabled;
  chkEnabled.addEventListener("change", function () {
    _emailSettings.enabled = chkEnabled.checked;
    saveEmailSettings();
    renderEmailSettings();
  });

  const lblEnabled = document.createElement("span");
  lblEnabled.setAttribute("data-i18n", "email_enable_label");
  lblEnabled.textContent = t("email_enable_label");

  toggleRow.appendChild(chkEnabled);
  toggleRow.appendChild(lblEnabled);
  card.appendChild(toggleRow);

  if (!_emailSettings.enabled) {
    const note = document.createElement("p");
    note.style.cssText = "font-size:0.82em; color:var(--text-muted); margin:0;";
    note.setAttribute("data-i18n", "email_disabled_note");
    note.textContent = t("email_disabled_note");
    card.appendChild(note);
    return;
  }

  /* ── Per-event checkboxes ── */
  const OPT = [
    { key: "rsvpConfirmation", i18n: "email_opt_rsvp_confirm" },
    { key: "adminNotify", i18n: "email_opt_admin_notify" },
  ];
  OPT.forEach(function (opt) {
    const row = document.createElement("label");
    row.style.cssText =
      "display:flex; align-items:center; gap:0.5rem; margin-bottom:0.45rem; font-size:0.88em; cursor:pointer;";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!_emailSettings[opt.key];
    cb.addEventListener("change", function () {
      _emailSettings[opt.key] = cb.checked;
      saveEmailSettings();
    });

    const sp = document.createElement("span");
    sp.setAttribute("data-i18n", opt.i18n);
    sp.textContent = t(opt.i18n);

    row.appendChild(cb);
    row.appendChild(sp);
    card.appendChild(row);
  });

  /* ── Requirements hint ── */
  const hint = document.createElement("p");
  hint.style.cssText =
    "font-size:0.76em; color:var(--text-muted); margin-top:0.6rem; padding-top:0.5rem; border-top:1px solid var(--glass-border); line-height:1.5;";
  hint.setAttribute("data-i18n", "email_webapp_hint");
  hint.textContent = t("email_webapp_hint");
  card.appendChild(hint);
}

/* ── Init ── */

function initEmailNotifications() {
  loadEmailSettings();
}
