/**
 * src/handlers/settings-handlers.js — Settings · Sheets · Misc handler registrations (F1.1)
 *
 * Extracted from main.js _registerHandlers().
 */

import { on } from "../core/events.js";
import { STORAGE_KEYS } from "../core/constants.js";
import { showToast, closeModal, showConfirmDialog } from "../core/ui.js";
import { t, normalizeUiLanguage, nextUiLanguage } from "../core/i18n.js";
import { load, save } from "../core/state.js";
import { storeSet } from "../core/store.js";
import {
  syncSheetsNow,
  sheetsCheckConnection,
  createMissingSheetTabs,
  pullFromSheets,
  pushAllToSheets,
  sheetsPost,
  startLiveSync,
  stopLiveSync,
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
  refreshAuditLog,
  generateRsvpQrCode,
  startAutoBackup,
  stopAutoBackup,
  downloadAutoBackup,
  restoreAutoBackup,
  exportAllCSV,
  checkDataIntegrity,
  exportDebugReport,
} from "../sections/settings.js";
import * as invitationSection from "../sections/invitation.js";
import * as contactSection from "../sections/contact-collector.js";
import * as registrySection from "../sections/registry.js";
import * as landingSection from "../sections/landing.js";

/**
 * Register settings, sheets/sync, and misc event handlers.
 * @param {{ pendingConflicts: () => any[], applyConflictResolutions: (choices: string[]) => void }} ctx
 */
export function registerSettingsHandlers(ctx) {
  // ── Sheets / Sync ──
  on("syncSheetsNow", async () => {
    showToast(t("syncing"), "info");
    await syncSheetsNow();
    showToast(t("synced"), "success");
  });
  on("sheetsCheckConnection", async () => {
    const ok = await sheetsCheckConnection();
    showToast(
      ok ? t("sheets_connected") : t("sheets_not_connected"),
      ok ? "success" : "error",
    );
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

  on("toggleSheetsMirror", (el) => {
    const checked = /** @type {HTMLInputElement} */ (el).checked;
    try {
      localStorage.setItem(STORAGE_KEYS.SHEETS_MIRROR, checked ? "true" : "false");
    } catch { /* ignore */ }
    showToast(
      checked ? t("sheets_mirror_on") : t("sheets_mirror_off"),
      checked ? "success" : "info",
    );
  });

  on("saveWaCloudSettings", () => {
    const idEl = /** @type {HTMLInputElement|null} */ (document.getElementById("waPhoneNumberId"));
    if (!idEl) return;
    const phoneNumId = idEl.value.trim();
    if (!phoneNumId) {
      showToast(t("wa_cloud_id_required"), "error");
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEYS.WA_PHONE_NUMBER_ID, phoneNumId);
    } catch { /* ignore */ }
    showToast(t("wa_cloud_saved"), "success");
  });

  // ── Conflict resolution ──
  on("conflictAcceptAllLocal", () => {
    closeModal("conflictModal");
    showToast(t("conflict_kept_local"), "info");
  });
  on("conflictAcceptAllRemote", () => {
    const pending = ctx.pendingConflicts();
    if (pending.length > 0) {
      ctx.applyConflictResolutions(pending.map(() => "remote"));
    }
    closeModal("conflictModal");
  });
  on("conflictApplySelected", () => {
    const list = document.getElementById("conflictList");
    if (!list) return;
    const radios = list.querySelectorAll('input[type="radio"]:checked');
    const choices = /** @type {string[]} */ ([]);
    radios.forEach((r) =>
      choices.push(/** @type {HTMLInputElement} */ (r).value),
    );
    ctx.applyConflictResolutions(choices);
    closeModal("conflictModal");
    showToast(t("conflict_resolved"), "success");
  });

  on("pushAllToSheets", async () => {
    showToast(t("sheets_push_all_loading"), "info");
    try {
      const counts = /** @type {Record<string, number>} */ (
        await pushAllToSheets()
      );
      const total = Object.values(counts).reduce((s, n) => s + n, 0);
      showToast(
        t("sheets_push_all_done").replace("{n}", String(total)),
        "success",
      );
    } catch {
      showToast(t("toast_sheets_error"), "error");
    }
  });
  on("cleanConfigDuplicates", async () => {
    showToast(t("sheets_testing"), "info");
    try {
      const result = /** @type {any} */ (
        await sheetsPost({ action: "cleanConfig" })
      );
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
    const { supabaseCheckConnection: sbCheck } =
      await import("../services/supabase.js");
    const ok = await sbCheck();
    showToast(
      ok ? t("supabase_connected") : t("supabase_not_connected"),
      ok ? "success" : "error",
    );
  });

  // ── Settings / Misc ──
  on("saveTransportSettings", () => {
    saveTransportSettings();
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
  on("refreshAuditLog", async () => {
    await refreshAuditLog();
    showToast(t("audit_refresh_btn"), "info");
  });
  on("clearErrorLog", () => clearErrorLog());
  on("clearCommLog", () => {
    storeSet("commLog", []);
    showToast(t("comm_cleared"), "info");
  });
  on("exportJSON", () => exportJSON());
  on("importJSON", (el) => importJSON(el));
  on("exportAllCSV", () => exportAllCSV());
  on("checkDataIntegrity", () => {
    const result = checkDataIntegrity();
    if (result.ok) {
      showToast(t("data_integrity_ok"), "success");
    } else {
      showToast(t("data_integrity_issues").replace("{n}", String(result.issues.length)), "warning");
      console.warn("[integrity]", result.issues);
    }
  });
  on("exportDebugReport", () => exportDebugReport());
  on("startAutoBackup", () => {
    const interval =
      Number(
        /** @type {HTMLInputElement|null} */ (
          document.getElementById("autoBackupInterval")
        )?.value,
      ) || 30;
    startAutoBackup(interval);
    showToast(t("autobackup_started"), "success");
  });
  on("stopAutoBackup", () => {
    stopAutoBackup();
    showToast(t("autobackup_stopped"), "info");
  });
  on("downloadAutoBackup", () => downloadAutoBackup());
  on("restoreAutoBackup", () => {
    showConfirmDialog(t("autobackup_restore_confirm"), () => {
      restoreAutoBackup();
      showToast(t("autobackup_restored"), "success");
    });
  });
  on("printRsvpQr", () => window.print());
  on("copyRsvpLink", () => {
    copyRsvpLink();
    showToast(t("copied"), "success");
  });
  on("copyContactLink", () => {
    copyContactLink();
    showToast(t("copied"), "success");
  });
  on("generateRsvpQrCode", () => generateRsvpQrCode());
  on("printGuestCards", () => window.print());

  // ── Invitation detail form ──
  on("updateWeddingDetails", () => invitationSection.updateWeddingDetails?.());
  on("handleInvitationUpload", (_triggerEl, e) => {
    const input = /** @type {HTMLInputElement|null} */ (
      /** @type {HTMLElement|null} */ (e.target)?.tagName === "INPUT"
        ? e.target
        : null
    );
    if (input) invitationSection.handleInvitationUpload?.(input);
  });

  // ── Contact form ──
  on("submitContactForm", () => {
    const data = {
      firstName:
        /** @type {HTMLInputElement|null} */ (
          document.getElementById("ccFirstName")
        )?.value?.trim() ?? "",
      lastName:
        /** @type {HTMLInputElement|null} */ (
          document.getElementById("ccLastName")
        )?.value?.trim() ?? "",
      phone:
        /** @type {HTMLInputElement|null} */ (
          document.getElementById("ccPhone")
        )?.value?.trim() ?? "",
      email:
        /** @type {HTMLInputElement|null} */ (
          document.getElementById("ccEmail")
        )?.value?.trim() ?? "",
      side:
        /** @type {HTMLSelectElement|null} */ (
          document.getElementById("ccSide")
        )?.value ?? "mutual",
      dietaryNotes: "",
    };
    const result = contactSection.submitContactForm(data);
    if (!result.ok)
      showToast(result.errors?.join(", ") ?? t("error_save"), "error");
    else showToast(t("contact_sent"), "success");
  });

  // ── Landing table finder ──
  on("findTable", () => {
    const input =
      /** @type {HTMLInputElement|null} */ (
        document.getElementById("tablefinderInput")
      ) ??
      /** @type {HTMLInputElement|null} */ (
        document.getElementById("findTableInput")
      );
    landingSection.showTableFinder(input?.value?.trim() ?? "");
  });
}
