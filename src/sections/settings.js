/**
 * src/sections/settings.js — Settings section ESM module (S0.8)
 *
 * Manages wedding info (names, date, venue), theme, language, and admin access.
 * No window.* dependencies.
 */

import { storeGet, storeSet, storeSubscribe } from "../core/store.js";
import { el } from "../core/dom.js";
import { t, loadLocale, applyI18n } from "../core/i18n.js";
import { save, load } from "../core/state.js";
import { sanitize } from "../utils/sanitize.js";
import { enqueueWrite, syncStoreKeyToSheets } from "../services/sheets.js";

/** @type {(() => void)[]} */
const _unsubs = [];

// ── Lifecycle ─────────────────────────────────────────────────────────────

/**
 * @param {HTMLElement} _container
 */
export function mount(_container) {
  _unsubs.push(storeSubscribe("weddingInfo", populateSettings));
  populateSettings();
  // Auto-generate QR code when settings section opens
  generateRsvpQrCode();
}

export function unmount() {
  _unsubs.forEach((fn) => fn());
  _unsubs.length = 0;
}

// ── Settings API ──────────────────────────────────────────────────────────

/**
 * Save wedding info fields from a plain object.
 * @param {Record<string, unknown>} data
 * @returns {{ ok: boolean, errors?: string[] }}
 */
export function saveWeddingInfo(data) {
  const { value, errors } = sanitize(data, {
    groom: { type: "string", required: false, maxLength: 80 },
    bride: { type: "string", required: false, maxLength: 80 },
    date: { type: "string", required: false, maxLength: 20 },
    venue: { type: "string", required: false, maxLength: 120 },
    venueAddress: { type: "string", required: false, maxLength: 200 },
    venueMapLink: { type: "string", required: false, maxLength: 500 },
    phone: { type: "string", required: false, maxLength: 30 },
  });
  if (errors.length) return { ok: false, errors };

  const current = /** @type {Record<string,string>} */ (
    storeGet("weddingInfo") ?? {}
  );
  storeSet("weddingInfo", { ...current, ...value });
  enqueueWrite("weddingInfo", () => syncStoreKeyToSheets("weddingInfo"));
  return { ok: true };
}

/**
 * Switch the app language.
 * @param {"he"|"en"} lang
 */
export async function switchLanguage(lang) {
  if (lang !== "he" && lang !== "en") return;
  await loadLocale(lang);
  save("lang", lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
  applyI18n();
}

/**
 * Set a CSS theme on <body>.
 * @param {"rosegold"|"gold"|"emerald"|"royal"|""} theme
 */
export function setTheme(theme) {
  const themes = ["rosegold", "gold", "emerald", "royal"];
  document.body.classList.remove(...themes.map((t) => `theme-${t}`));
  if (theme && themes.includes(theme)) {
    document.body.classList.add(`theme-${theme}`);
  }
  save("theme", theme);
}

/**
 * Populate settings form fields from current store state.
 */
export function populateSettings() {
  // Wedding info fields live in the invitation section; just update data summary here.
  updateDataSummary();

  // Populate Sheets Web App URL if saved
  const sheetsUrl = load("sheetsWebAppUrl", "");
  if (sheetsUrl) {
    const urlInput = /** @type {HTMLInputElement|null} */ (
      document.getElementById("sheetsWebAppUrl")
    );
    if (urlInput && !urlInput.value) urlInput.value = sheetsUrl;
  }

  // Populate approved emails list
  _renderApprovedEmails();
}

/**
 * Update the data summary card (guest count, admin emails displayed).
 */
export function updateDataSummary() {
  if (!el.dataSummary) return;
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  el.dataSummary.textContent = `${guests.length} ${t("guests")} · ${tables.length} ${t("tables")}`;
}

// ── Data management ───────────────────────────────────────────────────────

/**
 * Wipe all local data after user confirmation.
 */
export function clearAllData() {
  if (!confirm(t("confirm_clear_all") || "Clear all local data?")) return;
  storeSet("guests", []);
  storeSet("tables", []);
  storeSet("vendors", []);
  storeSet("expenses", []);
  storeSet("weddingInfo", {});
}

/**
 * Export all app data as a JSON download.
 */
export function exportJSON() {
  const data = {
    guests: storeGet("guests") ?? [],
    tables: storeGet("tables") ?? [],
    vendors: storeGet("vendors") ?? [],
    expenses: storeGet("expenses") ?? [],
    weddingInfo: storeGet("weddingInfo") ?? {},
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  _downloadBlob(blob, "wedding-backup.json");
}

/**
 * Import data from a JSON file (reads from file input).
 * @param {HTMLElement} btn  The import button or the file input itself
 */
export function importJSON(btn) {
  // If called directly from a file input's change event, read the file
  if (/** @type {HTMLInputElement} */ (btn).type === "file") {
    const input = /** @type {HTMLInputElement} */ (btn);
    _readJsonFile(input);
    return;
  }
  // Otherwise, find or create a sibling file input and trigger it
  const input = /** @type {HTMLInputElement|null} */ (
    btn.parentElement?.querySelector('input[type="file"]') ??
      document.getElementById("importJsonFile")
  );
  if (!input) return;
  input.onchange = function () {
    _readJsonFile(input);
  };
  input.click();
}

/**
 * @param {HTMLInputElement} input
 */
function _readJsonFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(/** @type {string} */ (e.target?.result));
      if (data.guests) storeSet("guests", data.guests);
      if (data.tables) storeSet("tables", data.tables);
      if (data.vendors) storeSet("vendors", data.vendors);
      if (data.expenses) storeSet("expenses", data.expenses);
      if (data.weddingInfo) storeSet("weddingInfo", data.weddingInfo);
    } catch {
      alert(t("error_invalid_json") || "Invalid JSON file");
    }
  };
  reader.readAsText(file);
}

/**
 * Copy the RSVP public link to the clipboard.
 */
export function copyRsvpLink() {
  const url = `${location.origin}${location.pathname}#rsvp`;
  navigator.clipboard?.writeText(url).catch(() => {});
}

/**
 * Copy the contact form link to the clipboard.
 */
export function copyContactLink() {
  const url = `${location.origin}${location.pathname}#contact-form`;
  navigator.clipboard?.writeText(url).catch(() => {});
}

/**
 * Generate and display an RSVP QR code image using the free qrserver.com API.
 * Renders the QR code into an <img id="rsvpQrCode"> element (if present)
 * and also opens the direct download URL.
 * Uses the public, no-key-required API — no runtime dependency.
 * @returns {string}  The QR code image URL
 */
export function generateRsvpQrCode() {
  const rsvpUrl = `${location.origin}${location.pathname}#rsvp`;
  const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&qzone=2&format=png&data=${encodeURIComponent(rsvpUrl)}`;
  const img = /** @type {HTMLImageElement|null} */ (
    document.getElementById("rsvpQrImage")
  );
  if (img) {
    img.src = apiUrl;
    img.alt = "RSVP QR Code";
    img.width = 200;
    img.height = 200;
  }
  return apiUrl;
}

/**
 * Save the Apps Script Web App URL from settings form.
 * @param {HTMLFormElement|null} form
 */
export function saveWebAppUrl(form) {
  const input = /** @type {HTMLInputElement|null} */ (
    form?.querySelector("[name='webAppUrl'], #sheetsWebAppUrl") ??
      document.getElementById("sheetsWebAppUrl")
  );
  if (!input) return;
  const { value, errors } = sanitize(
    { url: input.value.trim() },
    {
      url: { type: "string", required: true, maxLength: 500 },
    },
  );
  if (errors.length) return;
  storeSet("sheetsWebAppUrl", value.url);
  save("sheetsWebAppUrl", value.url);
}

/**
 * Save Supabase configuration (URL + anon key) from Settings inputs.
 */
export function saveSupabaseConfig() {
  const urlInput = /** @type {HTMLInputElement|null} */ (
    document.getElementById("supabaseUrl")
  );
  const keyInput = /** @type {HTMLInputElement|null} */ (
    document.getElementById("supabaseAnonKey")
  );
  if (urlInput?.value?.trim()) {
    const url = urlInput.value.trim();
    storeSet("supabaseUrl", url);
    save("supabaseUrl", url);
  }
  if (keyInput?.value?.trim()) {
    const key = keyInput.value.trim();
    storeSet("supabaseAnonKey", key);
    save("supabaseAnonKey", key);
  }
}

/**
 * Save the selected backend type from the dropdown.
 */
export function saveBackendType() {
  const select = /** @type {HTMLSelectElement|null} */ (
    document.getElementById("backendTypeSelect")
  );
  if (!select) return;
  const val = select.value;
  if (val === "supabase" || val === "none" || val === "sheets") {
    storeSet("backendType", val);
    save("backendType", val);
  }
}

/**
 * Save transport settings (bus stop times + addresses).
 * Reads directly from named input elements (no form wrapper required).
 */
export function saveTransportSettings() {
  const _getVal = (id) =>
    /** @type {HTMLInputElement|null} */ (
      document.getElementById(id)
    )?.value?.trim() ?? "";
  const enabled =
    /** @type {HTMLInputElement|null} */ (
      document.getElementById("transportEnabled")
    )?.checked ?? false;
  const data = {
    transportEnabled: enabled ? "true" : "",
    transportTefachotTime: _getVal("transportTefachotTime"),
    transportTefachotAddress: _getVal("transportTefachotAddress"),
    transportJerusalemTime: _getVal("transportJerusalemTime"),
    transportJerusalemAddress: _getVal("transportJerusalemAddress"),
  };
  const current = /** @type {Record<string,unknown>} */ (
    storeGet("weddingInfo") ?? {}
  );
  storeSet("weddingInfo", { ...current, ...data });
}

/**
 * Add an email to the approved admin allowlist.
 */
export function addApprovedEmail() {
  const input = /** @type {HTMLInputElement|null} */ (
    document.getElementById("newApproveEmail")
  );
  if (!input) return;
  const email = input.value.trim().toLowerCase();
  if (!email || !email.includes("@")) return;
  const list = /** @type {string[]} */ (storeGet("approvedEmails") ?? []);
  if (!list.includes(email)) {
    list.push(email);
    storeSet("approvedEmails", list);
    save("approvedEmails", list);
    _renderApprovedEmails();
  }
  input.value = "";
}

/**
 * Clear the audit log.
 */
export function clearAuditLog() {
  storeSet("auditLog", []);
}

/**
 * Clear the error log.
 */
export function clearErrorLog() {
  storeSet("errorLog", []);
}

// ── Private helpers ───────────────────────────────────────────────────────

/** @param {Blob} blob  @param {string} name */
function _downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Render the approved emails list into #approvedEmailsList (if present).
 */
function _renderApprovedEmails() {
  const container = document.getElementById("approvedEmailsList");
  if (!container) return;
  const list = /** @type {string[]} */ (storeGet("approvedEmails") ?? []);
  container.textContent = "";
  if (list.length === 0) {
    const p = document.createElement("p");
    p.className = "u-text-muted";
    p.textContent = t("no_approved_emails");
    container.appendChild(p);
    return;
  }
  list.forEach((email) => {
    const row = document.createElement("div");
    row.className = "approved-email-row";
    const span = document.createElement("span");
    span.textContent = email;
    row.appendChild(span);
    container.appendChild(row);
  });
}
