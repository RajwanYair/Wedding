/**
 * src/handlers/settings-handlers.js — Settings, sheets sync, and conflict resolution handlers
 */

import { on } from "../core/events.js";
import { t, normalizeUiLanguage, nextUiLanguage } from "../core/i18n.js";
import { showToast, closeModal, applyTheme } from "../core/ui.js";
import {
  applyConflictResolutions,
  getPendingConflicts,
  showConflictModal,
} from "../core/conflict-resolver.js";
import { awaitDialogClose } from "../core/dialog.js";
import { logAdminAction } from "../services/compliance.js";
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
  removeApprovedEmail,
  clearAuditLog,
  clearErrorLog,
  generateRsvpQrCode,
  resetThemeVars,
  exportThemeToJson,
  importThemeFromJson,
  installPlugin,
  toggleMonitoring,
  startAutoBackup,
  stopAutoBackup,
  downloadAutoBackup,
  restoreAutoBackup,
  exportAllCSV,
  checkDataIntegrity,
  exportDebugReport,
  startAdminSignIn,
  refreshAdminList,
  checkIsApprovedAdmin,
  resetOnboarding,
  registerPasskey,
  authenticatePasskey,
  clearPasskeys,
  generateApiKey,
  copyApiKey,
  revokeApiKey,
  requestGdprErasure,
  addWebhook,
  removeWebhook,
  pingWebhookById,
  refreshWebhooks,
} from "../sections/settings.js";
import { sendMagicLink, loginSupabaseAnonymous } from "../services/auth.js";
import { load } from "../core/state.js";
import * as registrySection from "../sections/registry.js";
import { saveWebsiteConfig, previewWebsite } from "../sections/website-builder.js";

/**
 * Register `data-action` handlers for the settings section.
 * Idempotent — call once at app boot.
 */
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
    const cb = /** @type {HTMLInputElement|null} */ (document.getElementById("telemetryOptOut"));
    try {
      if (cb?.checked) localStorage.setItem("wedding_v1_telemetry_opt_out", "1");
      else localStorage.removeItem("wedding_v1_telemetry_opt_out");
    } catch {
      /* storage disabled — silent */
    }
    showToast(t("settings_saved"), "success");
  });
  on("addRegistryLink", () => {
    registrySection.addRegistryLink?.();
  });
  on("addRegistryPreset", (el) => {
    const platformId = el instanceof HTMLElement ? (el.dataset.actionArg ?? "") : "";
    if (platformId) registrySection.addRegistryPreset?.(platformId);
  });
  on("addApprovedEmail", () => {
    addApprovedEmail();
    logAdminAction("email:add", "");
  });
  on("removeApprovedEmail", (el) => removeApprovedEmail(el));
  on("clearAllData", () => clearAllData());
  on("switchLanguage", async (el) => {
    // Multi-locale selector passes lang code in data-action-arg; header toggle uses nextUiLanguage
    const argLang = el instanceof HTMLElement ? (el.dataset.actionArg ?? "") : "";
    const current = load("lang", "he");
    const next = argLang || nextUiLanguage(current);
    await switchLanguage(next);
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
  // Sprint 138 — Theme vars customizer
  on("resetThemeVars", () => resetThemeVars());
  on("exportThemeJson", () => exportThemeToJson());
  on("importThemeJson", () => importThemeFromJson());
  // Sprint 139 — Website builder
  on("saveWebsiteConfig", () => saveWebsiteConfig());
  on("previewWebsite", () => previewWebsite());
  // Sprint 141 — Plugin manager
  on("installPlugin", () => installPlugin());
  // S205 — Monitoring opt-in toggle
  on("toggleMonitoring", () => toggleMonitoring());
  // S432 — Observability DSN
  on("saveObservabilityDsn", () => {
    const input = /** @type {HTMLInputElement|null} */ (document.getElementById("observabilityDsn"));
    const statusEl = document.getElementById("observabilityDsnStatus");
    const dsn = input?.value?.trim() ?? "";
    if (!dsn) {
      try { localStorage.removeItem("wedding_v1_monitoring_dsn"); } catch { /* storage disabled */ }
      if (statusEl) statusEl.textContent = t("observability_dsn_cleared");
      return;
    }
    // Validate DSN format before saving
    try {
      const url = new URL(dsn);
      if (!url.username || !url.host || !url.pathname.replace(/^\/+/, "")) {
        if (statusEl) statusEl.textContent = t("observability_dsn_invalid");
        return;
      }
    } catch {
      if (statusEl) statusEl.textContent = t("observability_dsn_invalid");
      return;
    }
    try { localStorage.setItem("wedding_v1_monitoring_dsn", dsn); } catch { /* storage disabled */ }
    if (statusEl) statusEl.textContent = t("observability_dsn_saved");
    showToast(t("observability_dsn_saved"), "success");
    // S439: reset monitoring init so next boot (or test) uses the new DSN
    import("../services/observability.js").then(({ resetMonitoringInit }) => {
      resetMonitoringInit();
    }).catch(() => {});
  });
  on("testErrorReport", async () => {
    const { testErrorReport: _test, initMonitoring } = await import("../services/observability.js");
    await initMonitoring();
    const ok = await _test();
    const statusEl = document.getElementById("observabilityDsnStatus");
    if (statusEl) statusEl.textContent = ok ? t("observability_test_sent") : t("observability_test_no_dsn");
    showToast(ok ? t("observability_test_sent") : t("observability_test_no_dsn"), ok ? "success" : "error");
  });
  // S217 — Auto-backup
  on("startAutoBackup", () => {
    const intervalMin = parseInt(
      /** @type {HTMLInputElement|null} */ (document.getElementById("autoBackupInterval"))?.value ??
        "30",
      10,
    );
    startAutoBackup(isNaN(intervalMin) || intervalMin < 1 ? 30 : intervalMin);
    showToast(t("autobackup_started"), "success");
  });
  on("stopAutoBackup", () => {
    stopAutoBackup();
    showToast(t("autobackup_stopped"), "info");
  });
  on("downloadAutoBackup", () => downloadAutoBackup());
  on("restoreAutoBackup", () => {
    if (!confirm(t("autobackup_restore_confirm"))) return;
    restoreAutoBackup();
    showToast(t("autobackup_restored"), "success");
  });
  // S217 — Data tools
  on("exportAllCSV", async () => {
    showToast(t("export_all_csv"), "info");
    await exportAllCSV();
  });
  on("checkDataIntegrity", () => {
    const { ok, issues } = checkDataIntegrity();
    if (ok) {
      showToast(t("data_integrity_ok"), "success");
    } else {
      showToast(t("data_integrity_issues").replace("{n}", String(issues.length)), "error");
    }
  });
  on("exportDebugReport", () => exportDebugReport());
  // S231 — Show conflict resolution modal
  on("resolveConflicts", async () => {
    const conflicts = getPendingConflicts();
    if (!conflicts.length) return;
    await showConflictModal(conflicts);
    await awaitDialogClose("conflictModal");
  });
  // S231 — Auth / admin helpers
  on("startAdminSignIn", (el) =>
    startAdminSignIn(el.dataset.actionArg ?? "google").catch(() => {}),
  );
  on("refreshAdminList", () => refreshAdminList().catch(() => {}));
  on("checkIsApprovedAdmin", async () => {
    const input = /** @type {HTMLInputElement|null} */ (document.getElementById("newApproveEmail"));
    const email = input?.value?.trim() ?? "";
    if (email) await checkIsApprovedAdmin(email);
  });
  on("resetOnboarding", () => resetOnboarding());
  // S433 — WebAuthn passkey scaffold
  on("registerPasskey", async () => {
    await registerPasskey();
  });
  on("authenticatePasskey", async () => {
    await authenticatePasskey();
  });
  on("clearPasskeys", () => {
    clearPasskeys();
  });
  on("generateApiKey", () => { generateApiKey(); });
  on("copyApiKey", async () => { await copyApiKey(); });
  on("revokeApiKey", () => { revokeApiKey(); });
  on("requestGdprErasure", () => { requestGdprErasure(); });
  on("addWebhook", async () => { await addWebhook(); });
  on("removeWebhook", async (evt) => { const id = /** @type {HTMLElement} */ (evt?.target)?.closest("[data-id]")?.dataset?.id ?? ""; if (id) await removeWebhook(id); });
  on("pingWebhookById", async (evt) => { const id = /** @type {HTMLElement} */ (evt?.target)?.closest("[data-id]")?.dataset?.id ?? ""; if (id) await pingWebhookById(id); });
  on("refreshWebhooks", async () => { await refreshWebhooks(); });
  on("sendMagicLink", async () => {
    const input = /** @type {HTMLInputElement|null} */ (document.getElementById("magicLinkEmail"));
    const email = input?.value?.trim() ?? "";
    if (email) await sendMagicLink(email);
  });
  on("loginAnonymousSupabase", async () => {
    await loginSupabaseAnonymous();
  });

  // S427 — Send test Web Push notification
  on("sendTestPush", async () => {
    const result = document.getElementById("pushTestResult");
    if (result) result.textContent = t("push_test_sending");
    const { sendPushToAdmins } = await import("../services/notifications.js");
    const { storeGet: _sg } = await import("../core/store.js");
    const res = await sendPushToAdmins(
      { title: t("push_test_title"), body: t("push_test_body") },
      _sg,
    );
    const msg = res.sent > 0 ? t("push_test_sent", { sent: res.sent }) : t("push_test_no_sub");
    if (result) result.textContent = msg;
    showToast(msg, res.sent > 0 ? "success" : "warning");
  });
}
