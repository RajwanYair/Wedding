/**
 * src/handlers/settings-handlers.js — Settings, sheets sync, and conflict resolution handlers
 */

import { on } from "../core/events.js";
import { t, normalizeUiLanguage, nextUiLanguage } from "../core/i18n.js";
import { showToast, closeModal, applyTheme } from "../core/ui.js";
import { applyConflictResolutions, getPendingConflicts } from "../core/conflict-resolver.js";
import { save } from "../core/state.js";
import {
  syncSheetsNow,
  sheetsCheckConnection,
  createMissingSheetTabs,
  pullFromSheets,
  pushAllToSheets,
  startLiveSync,
  stopLiveSync,
  sheetsPost,
} from "../services/sheets.js";
import {
  switchLanguage,
  clearAllData,
  exportJSON,
  importJSON,
  copyRsvpLink,
  copyContactLink,
  saveWebAppUrl,
  saveSupabaseConfig,
  saveBackendType,
  saveTransportSettings,
  addApprovedEmail,
  clearAuditLog,
  clearErrorLog,
  generateRsvpQrCode,
} from "../sections/settings.js";
import { load } from "../core/state.js";
import * as registrySection from "../sections/registry.js";

export function register() {
  // ── Sheets / Sync ──
  on("syncSheetsNow", async () => {
    showToast(t("syncing"), "info");
    await syncSheetsNow();
    showToast(t("synced"), "success");
  });
  on("sheetsCheckConnection", async () => {
    const ok = await sheetsCheckConnection();
    showToast(ok ? t("sheets_connected") : t("sheets_not_connected"), ok ? "success" : "error");
  });
  on("createMissingSheetTabs", async () => {
    await createMissingSheetTabs();
    showToast(t("sheets_tabs_created"), "success");
  });
  on("pullFromSheets", async () => {
    if (!confirm(t("sheets_pull_confirm"))) return;
    showToast(t("toast_sheets_loading"), "info");
    try {
      await pullFromSheets();
      showToast(t("sheets_pull_success"), "success");
    } catch {
      showToast(t("sheets_pull_error"), "error");
    }
  });
  on("toggleLiveSync", (el) => {
    const checked = /** @type {HTMLInputElement} */ (el).checked;
    if (checked) {
      startLiveSync();
      save("liveSync", true);
      showToast(t("live_sync_started"), "success");
    } else {
      stopLiveSync();
      save("liveSync", false);
      showToast(t("live_sync_stopped"), "info");
    }
  });
  on("pushAllToSheets", async () => {
    showToast(t("sheets_push_all_loading"), "info");
    try {
      const counts = /** @type {Record<string, number>} */ (await pushAllToSheets());
      const total = Object.values(counts).reduce((s, n) => s + n, 0);
      showToast(t("sheets_push_all_done").replace("{n}", String(total)), "success");
    } catch {
      showToast(t("toast_sheets_error"), "error");
    }
  });
  on("cleanConfigDuplicates", async () => {
    showToast(t("sheets_testing"), "info");
    try {
      const result = /** @type {any} */ (await sheetsPost({ action: "cleanConfig" }));
      const removed = result?.removed ?? 0;
      showToast(
        removed > 0
          ? t("sheets_clean_config_done").replace("{n}", String(removed))
          : t("sheets_clean_config_none"),
        removed > 0 ? "success" : "info",
      );
    } catch {
      showToast(t("toast_sheets_error"), "error");
    }
  });
  on("saveWebAppUrl", (_el, e) => {
    const form = /** @type {HTMLFormElement|null} */ (
      /** @type {HTMLElement} */ (e.target).closest("form")
    );
    saveWebAppUrl(form);
    showToast(t("settings_saved"), "success");
  });
  on("saveSupabaseConfig", () => {
    saveSupabaseConfig();
    showToast(t("settings_saved"), "success");
  });
  on("saveBackendType", () => {
    saveBackendType();
    showToast(t("settings_saved"), "success");
  });
  on("supabaseCheckConnection", async () => {
    const { supabaseCheckConnection: sbCheck } = await import("../services/supabase.js");
    const ok = await sbCheck();
    showToast(ok ? t("supabase_connected") : t("supabase_not_connected"), ok ? "success" : "error");
  });

  // ── Conflict resolution ──
  on("conflictAcceptAllLocal", () => {
    closeModal("conflictModal");
    showToast(t("conflict_kept_local"), "info");
  });
  on("conflictAcceptAllRemote", () => {
    if (getPendingConflicts().length > 0) {
      applyConflictResolutions(getPendingConflicts().map(() => "remote"));
    }
    closeModal("conflictModal");
  });
  on("conflictApplySelected", () => {
    const list = document.getElementById("conflictList");
    if (!list) return;
    const radios = list.querySelectorAll('input[type="radio"]:checked');
    const choices = /** @type {string[]} */ ([]);
    radios.forEach((r) => choices.push(/** @type {HTMLInputElement} */ (r).value));
    applyConflictResolutions(choices);
    closeModal("conflictModal");
    showToast(t("conflict_resolved"), "success");
  });

  // ── Settings / Misc ──
  on("saveTransportSettings", () => {
    saveTransportSettings();
    showToast(t("settings_saved"), "success");
  });
  on("saveTelemetryOptOut", () => {
    const cb = /** @type {HTMLInputElement|null} */ (
      document.getElementById("telemetryOptOut")
    );
    try {
      if (cb?.checked) localStorage.setItem("wedding_v1_telemetry_opt_out", "1");
      else localStorage.removeItem("wedding_v1_telemetry_opt_out");
    } catch {
      /* storage disabled — silent */
    }
    showToast(t("settings_saved"), "success");
  });
  on("addRegistryLink", () => {
    const urlInput = /** @type {HTMLInputElement|null} */ (
      document.getElementById("registryInputUrl")
    );
    const nameInput = /** @type {HTMLInputElement|null} */ (
      document.getElementById("registryInputName")
    );
    if (!urlInput?.value?.trim()) return;
    const url = urlInput.value.trim();
    if (!url.startsWith("https://")) {
      showToast(t("error_invalid_url"), "error");
      return;
    }
    registrySection.addLink?.({ url, name: nameInput?.value?.trim() || url });
    if (urlInput) urlInput.value = "";
    if (nameInput) nameInput.value = "";
  });
  on("addApprovedEmail", () => addApprovedEmail());
  on("clearAllData", () => clearAllData());
  on("switchLanguage", async () => {
    const current = normalizeUiLanguage(load("lang", "he"));
    await switchLanguage(nextUiLanguage(current));
    showToast(t("language_switched"), "info");
  });
  on("toggleLanguage", async () => {
    const current = normalizeUiLanguage(load("lang", "he"));
    await switchLanguage(nextUiLanguage(current));
    showToast(t("language_switched"), "info");
  });
  on("clearAuditLog", () => clearAuditLog());
  on("clearErrorLog", () => clearErrorLog());
  on("exportJSON", () => exportJSON());
  on("importJSON", (el) => importJSON(el));
  on("copyRsvpLink", () => {
    copyRsvpLink();
    showToast(t("copied"), "success");
  });
  on("copyContactLink", () => {
    copyContactLink();
    showToast(t("copied"), "success");
  });
  on("generateRsvpQrCode", () => generateRsvpQrCode());
  on("printRsvpQr", () => window.print());
  on("printGuestCards", () => window.print());
  // Sprint 74 — Live theme picker: setTheme action dispatched by swatch buttons in settings.html
  on("setTheme", (el) => {
    const name = el.dataset.actionArg ?? "default";
    applyTheme(name);
    // Update active swatch UI
    const picker = document.getElementById("themePicker");
    if (picker) {
      for (const btn of picker.querySelectorAll(".theme-swatch")) {
        btn.classList.toggle(
          "theme-swatch--active",
          btn instanceof HTMLElement && btn.dataset.actionArg === name,
        );
      }
    }
    showToast(t("theme_applied"), "success");
  });
}
