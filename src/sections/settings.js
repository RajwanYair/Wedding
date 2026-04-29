/**
 * src/sections/settings.js — Settings section ESM module (S0.8)
 *
 * Manages wedding info (names, date, venue), theme, language, and admin access.
 * No window.* dependencies.
 */

import { storeGet, storeSet } from "../core/store.js";
import { BaseSection, fromSection } from "../core/section-base.js";
import { getBackendTypeConfig, getSheetsWebAppUrl, getSpreadsheetId } from "../core/app-config.js";
import { el } from "../core/dom.js";
import { t, loadLocale, applyI18n, normalizeUiLanguage } from "../core/i18n.js";
import { STORAGE_KEYS, GUEST_STATUSES } from "../core/constants.js";
import { save, load, getActiveEventId } from "../core/state.js";
import { readBrowserStorageJson } from "../core/storage.js";
import { sanitize } from "../utils/sanitize.js";
import { queueSize, queueKeys, onSyncStatus } from "../core/sync.js";
import { getActiveTheme, showToast } from "../core/ui.js";
import {
  isPushSupported,
  requestPushPermission,
  subscribePush,
  unsubscribePush,
  getCachedSubscription,
} from "../services/notifications.js";
import {
  getPreferences,
  updatePreferences,
} from "../services/notifications.js";
import {
  THEME_VARS,
  applyThemeVars,
  serializeThemeVars,
  deserializeThemeVars,
} from "../services/theme.js";
import {
  exportThemeJson,
  stringifyThemeJson,
  importThemeJson,
} from "../services/theme.js";
import { validatePluginManifest } from "../services/export.js";
import {
  addAdminUser,
  removeAdminUser,
  signInWith,
  isApprovedAdminAsync,
  fetchAdminUsers,
} from "../services/auth.js";
import { ONBOARDING_STEPS, setOnboardingState } from "../services/workspace.js";
import { buildAllDeployButtons } from "../utils/deploy-buttons.js";

// ── Lifecycle ──────────────────────────────────────────────────────────

class SettingsSection extends BaseSection {
  async onMount() {
    this.subscribe("weddingInfo", populateSettings);
    this.subscribe("auditLog", renderAuditLog);
    populateSettings();
    renderAuditLog();
    // Auto-generate QR code when settings section opens
    generateRsvpQrCode();
    // Attempt to load remote audit log
    refreshAuditLog();
    // Wire push notification UI (S18d)
    _renderPushCard();
    // Wire notification channel/event preferences (Sprint 56)
    _renderNotifPrefsCard();
    // Wire theme customizer (Sprint 138)
    _renderThemeVarsEditor();
    // Wire one-click deploy buttons (S196)
    _renderDeployButtons();
    // Wire monitoring opt-in toggle (S205)
    _renderMonitoringToggle();
    // Wire sync queue monitor badge (S217)
    initQueueMonitor();
  }
}

export const { mount, unmount, capabilities } = fromSection(new SettingsSection("settings"));

// ── Settings API ──────────────────────────────────────────────────────────

/**
 * Switch the app language.
 * @param {"he"|"en"} lang
 */
export async function switchLanguage(lang) {
  const nextLang = normalizeUiLanguage(lang);
  await loadLocale(nextLang);
  save("lang", nextLang);
  applyI18n();
}

/**
 * Populate settings form fields from current store state.
 */
function populateSettings() {
  // Wedding info fields live in the invitation section; just update data summary here.
  updateDataSummary();

  // Mark active theme swatch (Sprint 74)
  const activeName = getActiveTheme();
  const picker = document.getElementById("themePicker");
  if (picker) {
    for (const btn of picker.querySelectorAll(".theme-swatch")) {
      btn.classList.toggle(
        "theme-swatch--active",
        btn instanceof HTMLElement && btn.dataset.actionArg === activeName,
      );
    }
  }

  // Telemetry opt-out checkbox state (Sprint 78)
  try {
    const telemetryCb = /** @type {HTMLInputElement|null} */ (
      document.getElementById("telemetryOptOut")
    );
    if (telemetryCb) {
      telemetryCb.checked = localStorage.getItem("wedding_v1_telemetry_opt_out") === "1";
    }
  } catch {
    /* storage disabled */
  }

  // Populate Sheets Web App URL if saved
  const sheetsUrl = getSheetsWebAppUrl();
  if (sheetsUrl) {
    const urlInput = /** @type {HTMLInputElement|null} */ (
      document.getElementById("sheetsWebAppUrl")
    );
    if (urlInput && !urlInput.value) urlInput.value = sheetsUrl;
  }

  const spreadsheetIdInput = /** @type {HTMLInputElement|null} */ (
    document.getElementById("sheetsSpreadsheetId")
  );
  if (spreadsheetIdInput && !spreadsheetIdInput.value) {
    spreadsheetIdInput.value = getSpreadsheetId();
  }

  const backendSelect = /** @type {HTMLSelectElement|null} */ (
    document.getElementById("backendTypeSelect")
  );
  if (backendSelect) backendSelect.value = getBackendTypeConfig();

  const sheetId = getSpreadsheetId();
  const sheetIdEl = document.getElementById("sheetsSpreadsheetIdValue");
  if (sheetIdEl) sheetIdEl.textContent = sheetId || "\u2014";

  const sheetLinkEl = /** @type {HTMLAnchorElement|null} */ (
    document.getElementById("sheetsSpreadsheetLink")
  );
  if (sheetLinkEl) {
    if (sheetId) {
      sheetLinkEl.href = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}`;
      sheetLinkEl.classList.remove("u-hidden");
    } else {
      sheetLinkEl.removeAttribute("href");
      sheetLinkEl.classList.add("u-hidden");
    }
  }

  // Populate approved emails list
  _renderApprovedEmails();
}

/**
 * Update the data summary card (guest count, admin emails displayed).
 */
function updateDataSummary() {
  if (!el.dataSummary) return;
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  el.dataSummary.textContent = t("plural_data_summary", {
    guests: guests.length,
    tables: tables.length,
  });
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
    eventId: getActiveEventId(),
    guests: storeGet("guests") ?? [],
    tables: storeGet("tables") ?? [],
    vendors: storeGet("vendors") ?? [],
    expenses: storeGet("expenses") ?? [],
    weddingInfo: storeGet("weddingInfo") ?? {},
    gallery: storeGet("gallery") ?? [],
    timeline: storeGet("timeline") ?? [],
    contacts: storeGet("contacts") ?? [],
    budget: storeGet("budget") ?? [],
    exportedAt: new Date().toISOString(),
  };
  const eid = getActiveEventId();
  const name = eid === "default" ? "wedding" : eid;
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  _downloadBlob(blob, `${name}-backup.json`);
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
      if (data.gallery) storeSet("gallery", data.gallery);
      if (data.timeline) storeSet("timeline", data.timeline);
      if (data.contacts) storeSet("contacts", data.contacts);
      if (data.budget) storeSet("budget", data.budget);
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
  const img = /** @type {HTMLImageElement|null} */ (document.getElementById("rsvpQrImage"));
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
  const spreadsheetIdInput = /** @type {HTMLInputElement|null} */ (
    form?.querySelector("[name='spreadsheetId'], #sheetsSpreadsheetId") ??
      document.getElementById("sheetsSpreadsheetId")
  );
  if (!input && !spreadsheetIdInput) return;
  const { value, errors } = sanitize(
    {
      url: input?.value.trim() ?? "",
      spreadsheetId: spreadsheetIdInput?.value.trim() ?? "",
    },
    {
      url: { type: "string", required: false, maxLength: 500 },
      spreadsheetId: { type: "string", required: false, maxLength: 120 },
    },
  );
  if (errors.length) return;
  storeSet("sheetsWebAppUrl", value.url);
  save("sheetsWebAppUrl", value.url);
  storeSet("sheetsSpreadsheetId", value.spreadsheetId);
  save("sheetsSpreadsheetId", value.spreadsheetId);
  populateSettings();
}

/**
 * Save Supabase configuration (URL + anon key) from Settings inputs.
 */
export function saveSupabaseConfig() {
  const urlInput = /** @type {HTMLInputElement|null} */ (document.getElementById("supabaseUrl"));
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
  const _getVal = (/** @type {string} */ id) =>
    /** @type {HTMLInputElement|null} */ (document.getElementById(id))?.value?.trim() ?? "";
  const enabled =
    /** @type {HTMLInputElement|null} */ (document.getElementById("transportEnabled"))?.checked ??
    false;
  const data = {
    transportEnabled: enabled ? "true" : "",
    transportTefachotTime: _getVal("transportTefachotTime"),
    transportTefachotAddress: _getVal("transportTefachotAddress"),
    transportJerusalemTime: _getVal("transportJerusalemTime"),
    transportJerusalemAddress: _getVal("transportJerusalemAddress"),
  };
  const current = /** @type {Record<string,unknown>} */ (storeGet("weddingInfo") ?? {});
  storeSet("weddingInfo", { ...current, ...data });
}

/**
 * Add an email to the approved admin allowlist.
 */
export function addApprovedEmail() {
  const input = /** @type {HTMLInputElement|null} */ (document.getElementById("newApproveEmail"));
  if (!input) return;
  const email = input.value.trim().toLowerCase();
  if (!email || !email.includes("@")) return;
  const list = /** @type {string[]} */ (storeGet("approvedEmails") ?? []);
  if (!list.includes(email)) {
    list.push(email);
    storeSet("approvedEmails", list);
    save("approvedEmails", list);
    addAdminUser(email).catch(() => {});
    _renderApprovedEmails();
  }
  input.value = "";
}

/**
 * Remove an email from the approved admin allowlist.
 * @param {HTMLElement} triggerEl  The remove button (carries data-email attribute)
 */
export function removeApprovedEmail(triggerEl) {
  const email = triggerEl.dataset.email ?? /** @type {HTMLElement|null} */ (triggerEl.closest("[data-email]"))?.dataset.email ?? "";
  if (!email) return;
  const list = /** @type {string[]} */ (storeGet("approvedEmails") ?? []);
  const updated = list.filter((e) => e.trim().toLowerCase() !== email.trim().toLowerCase());
  storeSet("approvedEmails", updated);
  save("approvedEmails", updated);
  removeAdminUser(email).catch(() => {});
  _renderApprovedEmails();
}

/**
 * Clear the audit log.
 */
export function clearAuditLog() {
  storeSet("auditLog", []);
}

/**
 * Render local audit log entries into the #auditLogBody table.
 * Fetches from Supabase `audit_log` table when backend is "supabase".
 * Falls back to localStorage store when offline or not configured.
 */
function renderAuditLog() {
  const tbody = document.getElementById("auditLogBody");
  if (!tbody) return;

  const MAX = 200;
  const raw = /** @type {unknown[]} */ (storeGet("auditLog") ?? []);
  const entries =
    /** @type {Array<{action?:string, entity?:string, entityId?:string|null, userEmail?:string, ts?:string, diff?:unknown}>} */ (
      raw.slice(-MAX).reverse()
    );

  tbody.textContent = "";

  if (entries.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.className = "u-text-muted";
    td.setAttribute("data-i18n", "audit_empty");
    td.textContent = t("audit_empty");
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  for (const entry of entries) {
    const tr = document.createElement("tr");

    // Time
    const tdTime = document.createElement("td");
    const ts = entry.ts ? new Date(entry.ts) : null;
    tdTime.textContent = ts
      ? ts.toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })
      : "";
    tr.appendChild(tdTime);

    // Action
    const tdAction = document.createElement("td");
    const actionKey = `audit_action_${(entry.action ?? "").toLowerCase().replace(/[^a-z_]/g, "_")}`;
    tdAction.textContent = t(actionKey) || String(entry.action ?? "");
    tr.appendChild(tdAction);

    // Detail (entity + entityId)
    const tdDetail = document.createElement("td");
    const detail = [entry.entity, entry.entityId].filter(Boolean).join(" #");
    tdDetail.textContent = detail;
    tr.appendChild(tdDetail);

    // User
    const tdUser = document.createElement("td");
    tdUser.textContent = String(entry.userEmail ?? "");
    tr.appendChild(tdUser);

    tbody.appendChild(tr);
  }
}

/**
 * Clear the error log.
 */
export function clearErrorLog() {
  storeSet("appErrors", []);
}

/**
 * Fetch remote audit log entries from Supabase and merge into the local store.
 * No-op when backend is not Supabase or project is not configured.
 */
async function refreshAuditLog() {
  const { getBackendType } = await import("../services/backend.js");
  if (getBackendType() !== "supabase") return;
  const { fetchAuditLog } = await import("../services/supabase.js");
  const remote = await fetchAuditLog(200);
  if (remote.length === 0) return;
  storeSet("auditLog", remote);
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
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-icon btn-danger btn-small";
    btn.setAttribute("data-action", "removeApprovedEmail");
    btn.setAttribute("data-email", email);
    btn.setAttribute("aria-label", t("admin_remove_email") || "Remove");
    btn.textContent = t("admin_remove_email") || "✕";
    row.appendChild(btn);
    container.appendChild(row);
  });
}

// ── S15.3 Auto-backup Scheduler ─────────────────────────────────────────

/** @type {number|null} */
let _autoBackupInterval = null;

/**
 * Start automatic periodic backups to localStorage.
 * Saves a snapshot every `intervalMin` minutes.
 * @param {number} [intervalMin=30]
 */
export function startAutoBackup(intervalMin = 30) {
  stopAutoBackup();
  _runAutoBackup(); // snapshot immediately
  _autoBackupInterval = setInterval(_runAutoBackup, intervalMin * 60 * 1000);
  save("autoBackupEnabled", true);
  save("autoBackupInterval", intervalMin);
}

/**
 * Stop automatic backups.
 */
export function stopAutoBackup() {
  if (_autoBackupInterval !== null) {
    clearInterval(_autoBackupInterval);
    _autoBackupInterval = null;
  }
  save("autoBackupEnabled", false);
}

/**
 * Run a single auto-backup snapshot.
 */
function _runAutoBackup() {
  const snapshot = {
    guests: storeGet("guests") ?? [],
    tables: storeGet("tables") ?? [],
    vendors: storeGet("vendors") ?? [],
    expenses: storeGet("expenses") ?? [],
    weddingInfo: storeGet("weddingInfo") ?? {},
    timeline: storeGet("timeline") ?? [],
    budget: storeGet("budget") ?? [],
    backedUpAt: new Date().toISOString(),
  };
  save("autoBackup", snapshot);
  const badge = document.getElementById("lastBackupTime");
  if (badge) badge.textContent = new Date().toLocaleTimeString("he-IL");
}

/**
 * Download the latest auto-backup as a JSON file.
 */
export function downloadAutoBackup() {
  const snapshot = load("autoBackup", null);
  if (!snapshot) return;
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json",
  });
  _downloadBlob(blob, `wedding-autobackup-${Date.now()}.json`);
}

/**
 * Restore from the latest auto-backup.
 */
export function restoreAutoBackup() {
  const snapshot = /** @type {Record<string, unknown> | null} */ (load("autoBackup", null));
  if (!snapshot) return;
  const keys = ["guests", "tables", "vendors", "expenses", "weddingInfo", "timeline", "budget"];
  keys.forEach((k) => {
    if (snapshot[k] !== undefined) storeSet(k, snapshot[k]);
  });
}

// ── S18.1 Sync Queue Monitor ─────────────────────────────────────────────

/** @type {(() => void) | null} */
let _queueMonitorUnreg = null;

/** @type {number} F2.4.3 — peak queue size for progress tracking */
let _peakQueueSize = 0;

/**
 * Start monitoring the sync queue and update the badge in settings.
 * Registers an onSyncStatus listener that refreshes the queue badge.
 */
function initQueueMonitor() {
  _peakQueueSize = 0;
  _renderQueueBadge();
  // Register status listener (replaces previous)
  _queueMonitorUnreg?.();
  _queueMonitorUnreg = null;
  onSyncStatus(_renderQueueBadge);
}

/** Render the pending-writes badge + F2.4.3 progress bar */
function _renderQueueBadge() {
  const badgeEl = document.getElementById("syncQueueBadge");
  const listEl = document.getElementById("syncQueueList");
  const progressWrap = document.getElementById("syncProgressWrap");
  const progressBar = document.getElementById("syncProgressBar");
  const progressText = document.getElementById("syncProgressText");
  if (!badgeEl) return;
  const count = queueSize();
  badgeEl.textContent = String(count);
  badgeEl.classList.toggle("badge--warn", count > 0);

  // Track peak for progress calculation
  if (count > _peakQueueSize) _peakQueueSize = count;

  if (listEl) {
    const keys = queueKeys();
    listEl.textContent = count > 0 ? keys.join(", ") : t("queue_empty");
  }

  // F2.4.3 — progress bar
  if (progressWrap && progressBar) {
    if (_peakQueueSize > 0 && count > 0) {
      progressWrap.hidden = false;
      const done = _peakQueueSize - count;
      const pct = Math.round((done / _peakQueueSize) * 100);
      progressBar.style.width = `${pct}%`;
      if (progressText) {
        progressText.textContent = `${done}/${_peakQueueSize} (${pct}%)`;
      }
    } else {
      progressWrap.hidden = true;
      progressBar.style.width = "0%";
      if (progressText) progressText.textContent = "";
      // Reset peak when queue is fully drained
      if (count === 0) _peakQueueSize = 0;
    }
  }
}

// ── Sprint 2: Bulk CSV export + Data integrity ────────────────────────────

/**
 * Export all CSV files at once (guests, vendors, expenses, timeline, contacts).
 * Downloads each file sequentially with a short delay.
 */
export async function exportAllCSV() {
  const sections = [
    {
      key: "guests",
      header: "ID,First,Last,Phone,Status,Count,Children,Side,Group,Meal",
      fields: (/** @type {any} */ g) =>
        `${g.id},${g.firstName},${g.lastName || ""},${g.phone || ""},${g.status},${g.count || 1},${g.children || 0},${g.side || ""},${g.group || ""},${g.meal || ""}`,
    },
    {
      key: "vendors",
      header: "ID,Category,Name,Contact,Phone,Price,Paid,Notes,DueDate",
      fields: (/** @type {any} */ v) =>
        `${v.id},"${(v.category || "").replace(/"/g, '""')}","${(v.name || "").replace(/"/g, '""')}",${v.contact || ""},${v.phone || ""},${v.price || 0},${v.paid || 0},"${(v.notes || "").replace(/"/g, '""')}",${v.dueDate || ""}`,
    },
    {
      key: "expenses",
      header: "ID,Category,Amount,Description,Date",
      fields: (/** @type {any} */ ex) =>
        `${ex.id},"${(ex.category || "").replace(/"/g, '""')}",${ex.amount || 0},"${(ex.description || "").replace(/"/g, '""')}",${ex.date || ""}`,
    },
    {
      key: "timeline",
      header: "Time,Title,Note",
      fields: (/** @type {any} */ t) =>
        `${t.time || ""},"${(t.title || "").replace(/"/g, '""')}","${(t.note || "").replace(/"/g, '""')}"`,
    },
    {
      key: "contacts",
      header: "Name,Phone,Email,SubmittedAt",
      fields: (/** @type {any} */ c) =>
        `"${`${c.firstName || ""} ${c.lastName || ""}`.trim().replace(/"/g, '""')}",${c.phone || ""},${c.email || ""},${c.submittedAt || ""}`,
    },
  ];
  for (const { key, header, fields } of sections) {
    const items = /** @type {any[]} */ (storeGet(key) ?? []);
    if (items.length === 0) continue;
    const rows = items.map(fields);
    const csv = [header, ...rows].join("\n");
    _downloadBlob(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" }), `${key}.csv`);
  }
}

/**
 * Run data integrity checks and report issues.
 * Checks: orphaned tableIds, invalid statuses, missing required fields,
 * duplicate IDs, phone format, date validity.
 * @returns {{ ok: boolean, issues: string[] }}
 */
export function checkDataIntegrity() {
  const issues = [];
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const tableIds = new Set(tables.map((t) => t.id));
  const guestIds = new Set();
  const validStatuses = new Set(GUEST_STATUSES);

  for (const g of guests) {
    // Duplicate ID
    if (guestIds.has(g.id)) issues.push(`Duplicate guest ID: ${g.id}`);
    guestIds.add(g.id);
    // Missing name
    if (!g.firstName) issues.push(`Guest ${g.id}: missing firstName`);
    // Invalid status
    if (g.status && !validStatuses.has(g.status))
      issues.push(`Guest ${g.id}: invalid status "${g.status}"`);
    // Orphaned tableId
    if (g.tableId && !tableIds.has(g.tableId))
      issues.push(`Guest ${g.id}: tableId "${g.tableId}" not found`);
  }

  // Check table capacity vs assignments
  for (const tbl of tables) {
    const seated = guests.filter((g) => g.tableId === tbl.id).length;
    if (seated > (tbl.capacity || 10))
      issues.push(`Table "${tbl.name}": ${seated} seated exceeds capacity ${tbl.capacity}`);
  }

  return { ok: issues.length === 0, issues };
}

/**
 * Export client errors + store sizes as a diagnostic JSON download.
 * Sprint 9 — DX: debug report for admin troubleshooting.
 */
export function exportDebugReport() {
  /** @type {any[]} */
  const errors = STORAGE_KEYS.ERRORS ? readBrowserStorageJson(STORAGE_KEYS.ERRORS, []) : [];

  const report = {
    timestamp: new Date().toISOString(),
    errors,
    stores: ["guests", "tables", "vendors", "expenses", "timeline", "weddingInfo"].map((k) => {
      const val = storeGet(k);
      return { key: k, count: Array.isArray(val) ? val.length : val ? 1 : 0 };
    }),
    userAgent: navigator.userAgent,
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `wedding-debug-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Data completeness score — percentage of guests with all important fields filled.
 * Checks: firstName, phone, status (non-pending), meal, tableId.
 * @returns {{ total: number, complete: number, rate: number, missingFields: Record<string, number> }}
 */
export function getDataCompletenessScore() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  if (guests.length === 0) return { total: 0, complete: 0, rate: 0, missingFields: {} };

  const fields = ["firstName", "phone", "meal", "tableId"];
  /** @type {Record<string, number>} */
  const missingFields = {};
  let complete = 0;

  for (const g of guests) {
    let allPresent = true;
    for (const field of fields) {
      if (!g[field]) {
        missingFields[field] = (missingFields[field] ?? 0) + 1;
        allPresent = false;
      }
    }
    if (allPresent) complete += 1;
  }

  return {
    total: guests.length,
    complete,
    rate: Math.round((complete / guests.length) * 100),
    missingFields,
  };
}

/**
 * Store sizes in bytes — useful for storage quota management.
 * @returns {{ key: string, bytes: number }[]}
 */
export function getStoreSizes() {
  const keys = ["guests", "tables", "vendors", "expenses", "timeline", "weddingInfo", "gallery"];
  return keys
    .map((key) => {
      const val = storeGet(key);
      const bytes = val ? new Blob([JSON.stringify(val)]).size : 0;
      return { key, bytes };
    })
    .sort((a, b) => b.bytes - a.bytes);
}

// ── S138 — Theme Vars Customizer UI ───────────────────────────────────────

const THEME_VARS_STORAGE_KEY = "wedding_v1_theme_vars";

/** Load persisted custom vars from localStorage. */
function _loadPersistedVars() {
  try {
    return deserializeThemeVars(localStorage.getItem(THEME_VARS_STORAGE_KEY) ?? "");
  } catch {
    return {};
  }
}

/** Persist and apply custom vars. */
function _persistAndApplyVars(/** @type {Record<string,string>} */ vars) {
  const serialized = serializeThemeVars(vars);
  localStorage.setItem(THEME_VARS_STORAGE_KEY, serialized);
  applyThemeVars(vars);
}

/** Render the theme variable sliders / color inputs. */
function _renderThemeVarsEditor() {
  const container = document.getElementById("themeVarsEditor");
  if (!container) return;
  container.textContent = "";

  const current = _loadPersistedVars();

  for (const varDef of THEME_VARS) {
    const row = document.createElement("div");
    row.className = "theme-var-row";

    const label = document.createElement("label");
    label.className = "theme-var-label";
    label.textContent = t(`theme_var_${varDef.label}`) || varDef.label;
    label.setAttribute("for", `themeVar_${varDef.key}`);
    row.appendChild(label);

    if (varDef.type === "color") {
      const input = document.createElement("input");
      input.type = "color";
      input.id = `themeVar_${varDef.key}`;
      input.className = "theme-var-input";
      input.value = current[varDef.key] || varDef.default;
      input.addEventListener("input", () => {
        const vars = { ..._loadPersistedVars(), [varDef.key]: input.value };
        _persistAndApplyVars(vars);
      });
      row.appendChild(input);
    } else {
      const input = document.createElement("input");
      input.type = "range";
      input.id = `themeVar_${varDef.key}`;
      input.className = "theme-var-input";
      input.min = String(varDef.min ?? 0);
      input.max = String(varDef.max ?? 100);
      input.step = varDef.type === "number" ? "0.05" : "1";
      const rawVal = current[varDef.key] || varDef.default;
      input.value = String(Number.parseFloat(rawVal) || 0);

      const valDisplay = document.createElement("span");
      valDisplay.className = "theme-var-value";
      valDisplay.textContent = input.value + (varDef.unit || "");

      input.addEventListener("input", () => {
        valDisplay.textContent = input.value + (varDef.unit || "");
        const vars = { ..._loadPersistedVars(), [varDef.key]: input.value };
        _persistAndApplyVars(vars);
      });
      row.appendChild(input);
      row.appendChild(valDisplay);
    }
    container.appendChild(row);
  }
}

/** Reset theme vars to defaults. */
export function resetThemeVars() {
  localStorage.removeItem(THEME_VARS_STORAGE_KEY);
  const defaults = /** @type {Record<string, string>} */ ({});
  for (const v of THEME_VARS) defaults[v.key] = v.default;
  applyThemeVars(defaults);
  _renderThemeVarsEditor();
}

/** Export current theme as downloadable JSON file. */
export function exportThemeToJson() {
  const vars = _loadPersistedVars();
  const envelope = exportThemeJson(vars, { name: "My Wedding Theme" });
  const json = stringifyThemeJson(envelope);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "theme.json";
  a.click();
  URL.revokeObjectURL(url);
}

/** Import theme from a JSON file selected by user. */
export function importThemeFromJson() {
  const input = /** @type {HTMLInputElement|null} */ (
    document.getElementById("themeJsonFileInput")
  );
  if (!input) return;
  input.value = "";
  input.addEventListener(
    "change",
    () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = importThemeJson(/** @type {string} */ (reader.result));
        if (!result.ok) {
          showToast(t("theme_import_error"), "error");
          return;
        }
        _persistAndApplyVars(result.envelope?.vars ?? {});
        _renderThemeVarsEditor();
        showToast(t("theme_import_success"), "success");
      };
      reader.readAsText(file);
    },
    { once: true },
  );
  input.click();
}

// ── S18d — Push Notification UI ───────────────────────────────────────────

/**
 * Render the push notification card inside #pushSettingsCard.
 * Shows enable/disable toggle plus VAPID key input.
 */
function _renderPushCard() {
  const container = document.getElementById("pushSettingsCard");
  if (!container) return;

  if (!isPushSupported()) {
    container.textContent = t("push_not_supported");
    return;
  }

  const isSubscribed = !!getCachedSubscription();
  const vapidKey = /** @type {string} */ (load("vapidPublicKey", ""));

  // VAPID input row
  const vapidLabel = document.createElement("label");
  vapidLabel.className = "settings-label";
  vapidLabel.setAttribute("for", "vapidKeyInput");
  const vapidSpan = document.createElement("span");
  vapidSpan.setAttribute("data-i18n", "push_vapid_label");
  vapidSpan.textContent = t("push_vapid_label");
  const vapidInput = document.createElement("input");
  vapidInput.type = "text";
  vapidInput.id = "vapidKeyInput";
  vapidInput.className = "settings-input";
  vapidInput.placeholder = t("push_vapid_placeholder");
  vapidInput.value = typeof vapidKey === "string" ? vapidKey : "";
  vapidInput.addEventListener("change", () => {
    save("vapidPublicKey", vapidInput.value.trim());
  });
  vapidLabel.appendChild(vapidSpan);
  vapidLabel.appendChild(vapidInput);

  // Status msg
  const statusMsg = document.createElement("p");
  statusMsg.className = "status-msg";
  statusMsg.setAttribute("aria-live", "polite");
  statusMsg.textContent = isSubscribed ? t("push_status_active") : t("push_status_inactive");

  // Toggle button
  const toggleBtn = document.createElement("button");
  toggleBtn.className = isSubscribed ? "btn btn-danger btn-small" : "btn btn-primary btn-small";
  toggleBtn.textContent = isSubscribed ? t("push_btn_disable") : t("push_btn_enable");
  toggleBtn.addEventListener("click", async () => {
    toggleBtn.disabled = true;
    if (getCachedSubscription()) {
      const ok = await unsubscribePush();
      statusMsg.textContent = ok ? t("push_disabled") : t("push_disable_fail");
      toggleBtn.textContent = t("push_btn_enable");
      toggleBtn.className = "btn btn-primary btn-small";
    } else {
      save("vapidPublicKey", vapidInput.value.trim());
      if (!vapidInput.value.trim()) {
        statusMsg.textContent = t("push_vapid_required");
        toggleBtn.disabled = false;
        return;
      }
      const perm = await requestPushPermission();
      if (perm !== "granted") {
        statusMsg.textContent = t("push_permission_denied");
        toggleBtn.disabled = false;
        return;
      }
      const sub = await subscribePush(vapidInput.value.trim());
      if (sub) {
        statusMsg.textContent = t("push_enabled");
        toggleBtn.textContent = t("push_btn_disable");
        toggleBtn.className = "btn btn-danger btn-small";
      } else {
        statusMsg.textContent = t("push_enable_fail");
      }
    }
    toggleBtn.disabled = false;
  });

  container.textContent = "";
  container.appendChild(vapidLabel);
  container.appendChild(statusMsg);
  container.appendChild(toggleBtn);
}

// ── Sprint 56 — Notification Preferences UI ───────────────────────────────

const CHANNELS = /** @type {const} */ (["push", "email", "whatsapp", "sms"]);
const EVENTS = /** @type {const} */ ([
  "rsvp_confirmed",
  "rsvp_reminder",
  "table_assigned",
  "campaign",
  "system",
]);

/** @type {Record<string, string>} */
const CHANNEL_ICONS = { push: "🔔", email: "📧", whatsapp: "💬", sms: "📲" };

/**
 * Render channel + event toggles in #notifPrefsCard.
 * Preferences are stored under "_default" userId.
 */
function _renderNotifPrefsCard() {
  const container = document.getElementById("notifPrefsCard");
  if (!container) return;
  container.textContent = "";

  const userId = "_default";
  const prefs = getPreferences(userId);

  // ── Channels section ──────────────────────────────────
  const chanHeading = document.createElement("p");
  chanHeading.className = "settings-label";
  chanHeading.setAttribute("data-i18n", "notif_channels_label");
  chanHeading.textContent = t("notif_channels_label");
  container.appendChild(chanHeading);

  const chanGrid = document.createElement("div");
  chanGrid.className = "notif-prefs-grid";
  for (const ch of CHANNELS) {
    const row = document.createElement("label");
    row.className = "notif-pref-row";

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = prefs.channels[ch] ?? false;
    chk.addEventListener("change", () => {
      updatePreferences(userId, { channels: { [ch]: chk.checked } });
    });

    const lbl = document.createElement("span");
    lbl.textContent = `${CHANNEL_ICONS[ch] ?? ""} `;
    const lblKey = document.createElement("span");
    lblKey.setAttribute("data-i18n", `notif_channel_${ch}`);
    lblKey.textContent = t(`notif_channel_${ch}`);
    lbl.appendChild(lblKey);

    row.appendChild(chk);
    row.appendChild(lbl);
    chanGrid.appendChild(row);
  }
  container.appendChild(chanGrid);

  // ── Events section ────────────────────────────────────
  const evtHeading = document.createElement("p");
  evtHeading.className = "settings-label u-mt-sm";
  evtHeading.setAttribute("data-i18n", "notif_events_label");
  evtHeading.textContent = t("notif_events_label");
  container.appendChild(evtHeading);

  const evtGrid = document.createElement("div");
  evtGrid.className = "notif-prefs-grid";
  for (const ev of EVENTS) {
    const row = document.createElement("label");
    row.className = "notif-pref-row";

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = prefs.events[ev] ?? false;
    chk.addEventListener("change", () => {
      updatePreferences(userId, { events: { [ev]: chk.checked } });
    });

    const lbl = document.createElement("span");
    lbl.setAttribute("data-i18n", `notif_event_${ev}`);
    lbl.textContent = t(`notif_event_${ev}`);

    row.appendChild(chk);
    row.appendChild(lbl);
    evtGrid.appendChild(row);
  }
  container.appendChild(evtGrid);
}

// ── S141 — Plugin Manager UI ──────────────────────────────────────────────

const PLUGIN_STORAGE_KEY = "wedding_v1_plugins";

/** Get installed plugins from localStorage. */
function _getInstalledPlugins() {
  try {
    return JSON.parse(localStorage.getItem(PLUGIN_STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** Save installed plugins to localStorage. */
function _saveInstalledPlugins(/** @type {any[]} */ plugins) {
  localStorage.setItem(PLUGIN_STORAGE_KEY, JSON.stringify(plugins));
}

/** Render the plugin list into #pluginList. */
function renderPluginList() {
  const container = document.getElementById("pluginList");
  if (!container) return;
  container.textContent = "";

  const plugins = _getInstalledPlugins();
  if (plugins.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = t("plugin_none_installed");
    container.appendChild(empty);
    return;
  }

  for (const plugin of plugins) {
    const row = document.createElement("div");
    row.className = `plugin-row${plugin.enabled ? "" : " plugin-row--disabled"}`;

    const info = document.createElement("div");
    info.className = "plugin-info";

    const name = document.createElement("strong");
    name.textContent = plugin.name;
    info.appendChild(name);

    const ver = document.createElement("span");
    ver.className = "plugin-version";
    ver.textContent = ` v${plugin.version}`;
    info.appendChild(ver);

    if (plugin.author) {
      const author = document.createElement("span");
      author.className = "plugin-author";
      author.textContent = ` — ${plugin.author}`;
      info.appendChild(author);
    }

    row.appendChild(info);

    // Toggle button
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "btn btn-small btn-secondary";
    toggleBtn.textContent = plugin.enabled ? t("plugin_disable") : t("plugin_enable");
    toggleBtn.addEventListener("click", () => {
      plugin.enabled = !plugin.enabled;
      _saveInstalledPlugins(plugins);
      renderPluginList();
    });
    row.appendChild(toggleBtn);

    // Remove button
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-small btn-danger";
    removeBtn.textContent = t("plugin_remove");
    removeBtn.addEventListener("click", () => {
      const filtered = plugins.filter((/** @type {any} */ p) => p.id !== plugin.id);
      _saveInstalledPlugins(filtered);
      renderPluginList();
    });
    row.appendChild(removeBtn);

    container.appendChild(row);
  }
}

/** Install a plugin from a JSON manifest file. */
export function installPlugin() {
  const input = /** @type {HTMLInputElement|null} */ (document.getElementById("pluginFileInput"));
  if (!input) return;
  input.value = "";
  input.addEventListener(
    "change",
    () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const manifest = JSON.parse(/** @type {string} */ (reader.result));
          const result = validatePluginManifest(manifest);
          if (!result.ok) {
            showToast(`${t("plugin_invalid")}: ${result.errors.join(", ")}`, "error");
            return;
          }
          if (result.warnings.length > 0) {
            showToast(`${t("plugin_warnings")}: ${result.warnings.join(", ")}`, "warning");
          }
          const plugins = _getInstalledPlugins();
          if (plugins.some((/** @type {any} */ p) => p.id === manifest.id)) {
            showToast(t("plugin_already_installed"), "error");
            return;
          }
          plugins.push({
            id: manifest.id,
            name: manifest.name,
            version: manifest.version,
            author: manifest.author ?? "",
            permissions: manifest.permissions ?? [],
            hooks: manifest.hooks ?? [],
            enabled: true,
          });
          _saveInstalledPlugins(plugins);
          renderPluginList();
          showToast(t("plugin_installed"), "success");
        } catch {
          showToast(t("plugin_invalid"), "error");
        }
      };
      reader.readAsText(file);
    },
    { once: true },
  );
  input.click();
}

// ── Deploy buttons (S196 / Roadmap S152) ────────────────────────────────────

const _REPO_URL = "https://github.com/RajwanYair/Wedding";

const _DEPLOY_PROVIDERS = [
  { key: "vercel", label: "Vercel", emoji: "▲" },
  { key: "netlify", label: "Netlify", emoji: "🌐" },
  { key: "cloudflare", label: "Cloudflare", emoji: "☁️" },
  { key: "render", label: "Render", emoji: "🖥️" },
];

function _renderDeployButtons() {
  const container = document.getElementById("deployButtonsContainer");
  if (!container) return;
  container.textContent = "";
  const urls = buildAllDeployButtons({ repoUrl: _REPO_URL });
  for (const { key, label, emoji } of _DEPLOY_PROVIDERS) {
    const a = document.createElement("a");
    a.className = "btn btn-secondary btn-small";
    a.href = urls[/** @type {keyof typeof urls} */ (key)] ?? "#";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = `${emoji} ${label}`;
    container.appendChild(a);
  }
}
// ── Monitoring toggle (S205 / Roadmap S156) ───────────────────────────────

const _TELEMETRY_KEY = "wedding_v1_telemetry_opt_out";

function _renderMonitoringToggle() {
  const checkbox = /** @type {HTMLInputElement|null} */ (
    document.getElementById("monitoringOptIn")
  );
  if (!checkbox) return;
  const optedOut = localStorage.getItem(_TELEMETRY_KEY) === "1";
  checkbox.checked = !optedOut;
}

export function toggleMonitoring() {
  const checkbox = /** @type {HTMLInputElement|null} */ (
    document.getElementById("monitoringOptIn")
  );
  if (!checkbox) return;
  if (checkbox.checked) {
    localStorage.removeItem(_TELEMETRY_KEY);
    showToast(t("monitoring_enabled_toast"), "success");
  } else {
    localStorage.setItem(_TELEMETRY_KEY, "1");
    showToast(t("monitoring_disabled_toast"), "info");
  }
}

// ── Auth helpers (S231) ─────────────────────────────────────────────────────

/**
 * Initiate OAuth sign-in via the named provider.
 * @param {string} provider
 * @returns {Promise<import('../services/auth.js').OAuthProfile | null>}
 */
export async function startAdminSignIn(provider) {
  return signInWith(/** @type {any} */ (provider));
}

/**
 * Fetch all known admin emails (local + remote) and re-render the list.
 * @returns {Promise<string[]>}
 */
export async function refreshAdminList() {
  const emails = await fetchAdminUsers();
  _renderApprovedEmails();
  return emails;
}

/**
 * Validate that an email is approved, checking remote when available.
 * @param {string} email
 * @returns {Promise<boolean>}
 */
export async function checkIsApprovedAdmin(email) {
  return isApprovedAdminAsync(email);
}

// ── Onboarding helpers (S231) ───────────────────────────────────────────────

/**
 * Reset the onboarding wizard to the first step.
 */
export function resetOnboarding() {
  setOnboardingState({ step: ONBOARDING_STEPS[0] ?? "welcome", completed: false });
}
