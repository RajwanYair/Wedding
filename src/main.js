/**
 * src/main.js — ES module entry point (v6.0 — Phase 6.3)
 *
 * Pure orchestration: initStorage → initStore → initAuth → initRouter → initEvents.
 * Business logic extracted to handler modules and src/core/section-resolver.js.
 * Target: ≤200 lines.
 */

// ── Foundation ────────────────────────────────────────────────────────────
import { PUBLIC_SECTIONS } from "./core/constants.js";
import { initStorage, migrateFromLocalStorage } from "./core/storage.js";
import { initStore, storeGet, storeSet } from "./core/store.js";
import { initEvents, on } from "./core/events.js";
import { loadLocale, applyI18n, t, preloadLocale } from "./core/i18n.js";
import { initErrorMonitor } from "./utils/error-monitor.js";
import { load, restoreActiveEvent, getActiveEventId } from "./core/state.js";
import {
  initRouter, initSwipe, initPullToRefresh,
  initKeyboardShortcuts, initShortcutsHelp,
} from "./core/nav.js";
import {
  showToast, openModal, closeModal,
  cycleTheme, toggleLightMode, toggleMobileNav,
  restoreTheme, initSW, initInstallPrompt,
} from "./core/ui.js";
import { prefetchTemplates } from "./core/template-loader.js";
import { fetchGasVersion } from "./core/status-bar.js";
import { applyConflictResolutions, getPendingConflicts } from "./core/conflict-resolver.js";

// ── Handlers ──────────────────────────────────────────────────────────────
import { registerGuestHandlers } from "./handlers/guest-handlers.js";
import { registerTableHandlers } from "./handlers/table-handlers.js";
import { registerVendorHandlers } from "./handlers/vendor-handlers.js";
import { registerSectionHandlers } from "./handlers/section-handlers.js";
import { registerSettingsHandlers } from "./handlers/settings-handlers.js";
import { registerEventHandlers, renderEventSwitcher } from "./handlers/event-handlers.js";
import { registerAuthHandlers } from "./handlers/auth-handlers.js";
import { openAddModal } from "./utils/form-helpers.js";

// ── Services ──────────────────────────────────────────────────────────────
import {
  loadSession, loginAnonymous, maybeRotateSession,
  onAuthChange, currentUser,
} from "./services/auth.js";
import { startPresence, onPresenceChange } from "./services/presence.js";
import { syncSheetsNow, onSyncStatus, initOnlineSync, startLiveSync } from "./services/sheets.js";

// ── Section lifecycle (extracted to section-resolver.js) ──────────────────
import { resolveSection, switchSection, preloadSections } from "./core/section-resolver.js";
import { updateNavForAuth } from "./core/nav-auth.js";

// ── Bootstrap-time section exports ────────────────────────────────────────
import { startTimelineAlarms } from "./sections/timeline.js";
import { initQueueMonitor } from "./sections/settings.js";
import { popUndo } from "./utils/undo.js";
import { buildStoreDefs, defaultWeddingInfo } from "./core/defaults.js";

// ── Bootstrap ─────────────────────────────────────────────────────────────
(async function bootstrap() {
  performance.mark("bootstrap-start");
  initErrorMonitor();

  const lang = /** @type {"he"|"en"|"ar"|"ru"} */ (load("lang", "he") ?? "he");
  await loadLocale(lang);
  applyI18n();
  restoreActiveEvent();

  const adapterType = await initStorage();
  if (adapterType === "indexeddb") {
    const migrated = await migrateFromLocalStorage();
    if (migrated > 0)
      console.warn(`[storage] Migrated ${migrated} keys from localStorage to IndexedDB`);
  }

  initStore(buildStoreDefs());

  if (getActiveEventId() === "default") {
    const info = /** @type {Record<string, string>} */ (storeGet("weddingInfo") ?? {});
    if (!info.groom) {
      storeSet("weddingInfo", {
        ...defaultWeddingInfo,
        groom: "אליאור", bride: "טובה",
        groomEn: "Elior", brideEn: "Tova",
        date: "2026-05-07", venue: "נוף הירדן",
        venueAddress: "מצפה יריחו", ...info,
      });
    }
  }

  renderEventSwitcher();
  restoreTheme();

  const dash = /** @type {any} */ (await resolveSection("dashboard"));
  dash?.updateTopBar?.();
  dash?.updateCountdown?.();

  onAuthChange(updateNavForAuth);
  if (!loadSession()) loginAnonymous();

  if (currentUser()?.isAdmin) startPresence();
  onPresenceChange((users) => {
    const badge = document.getElementById("presenceBadge");
    if (!badge) return;
    const others = users.filter((u) => u.email !== currentUser()?.email);
    badge.classList.toggle("u-hidden", others.length === 0);
    if (others.length > 0) {
      badge.textContent = `\uD83D\uDC65 ${others.length}`;
      badge.title = others.map((u) => u.name).join(", ");
    }
  });

  initEvents();
  _registerHandlers();
  initRouter();

  updateNavForAuth(currentUser());
  if (!currentUser()?.isAdmin) {
    const hashSection = location.hash.slice(1).trim();
    if (!PUBLIC_SECTIONS.has(hashSection)) await switchSection("landing");
  }

  setInterval(maybeRotateSession, 15 * 60 * 1000);
  initSwipe();
  initPullToRefresh(() => syncSheetsNow());
  initKeyboardShortcuts();
  initShortcutsHelp();

  document.addEventListener("keydown", (e) => {
    const isField = ["INPUT", "TEXTAREA"].includes(/** @type {HTMLElement} */ (e.target).tagName);
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey && !isField) {
      e.preventDefault();
      const entry = popUndo();
      if (entry) { storeSet(entry.key, entry.snapshot); showToast(t("undo_success").replace("{label}", entry.label), "info"); }
    }
    if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey && !isField) {
      e.preventDefault();
      openModal("shortcutsModal");
    }
  });

  onSyncStatus((status) => {
    const badge = document.getElementById("syncStatusBadge");
    const btn   = document.getElementById("topBarSyncBtn");
    const labels = { idle: "", syncing: t("syncing"), synced: t("synced"), error: t("error_save") };
    if (badge) { badge.textContent = labels[status] ?? ""; badge.className = `sync-badge sync-badge--${status}`; badge.hidden = status === "idle"; }
    if (btn)   { btn.classList.toggle("sync-btn--spinning", status === "syncing"); btn.title = labels[status] || t("sync_now") || "Sync Now"; }
  });

  initOnlineSync();
  if (load("liveSync", false)) startLiveSync();
  initSW();
  initInstallPrompt();
  fetchGasVersion(currentUser());
  startTimelineAlarms();
  initQueueMonitor();
  prefetchTemplates(["guests", "tables", "rsvp", "analytics"]);
  preloadSections(["landing", "rsvp", "dashboard"]);
  preloadLocale(lang === "he" ? "en" : "he");

  performance.mark("bootstrap-end");
  performance.measure("bootstrap", "bootstrap-start", "bootstrap-end");
})();

// ── Handler registration ──────────────────────────────────────────────────

function _registerHandlers() {
  on("showSection", (el) => switchSection(/** @type {HTMLElement} */ (el).dataset.actionArg || "dashboard"));

  registerEventHandlers();
  registerAuthHandlers();

  on("cycleTheme", () => cycleTheme());
  on("toggleLightMode", () => toggleLightMode());
  on("toggleMobileNav", () => toggleMobileNav());

  on("closeModal", (el) => closeModal(/** @type {HTMLElement} */ (el).dataset.actionArg ?? ""));
  on("closeGalleryLightbox", () => document.getElementById("galleryLightbox")?.remove());
  on("openAddGuestModal",    () => openAddModal("guestModal",    "guestModalId",    "guestModalTitle",    "modal_add_guest",  openModal));
  on("openAddTableModal",    () => openAddModal("tableModal",    "tableModalId",    "tableModalTitle",    "modal_add_table",  openModal));
  on("openAddVendorModal",   () => openAddModal("vendorModal",   "vendorModalId",   "vendorModalTitle",   "modal_add_vendor", openModal));
  on("openAddExpenseModal",  () => openAddModal("expenseModal",  "expenseModalId",  "expenseModalTitle",  "expense_add",      openModal));
  on("openAddTimelineModal", () => openAddModal("timelineModal", "timelineModalId", "timelineModalTitle", "timeline_add",     openModal));

  registerGuestHandlers();
  registerTableHandlers();
  registerVendorHandlers();
  registerSectionHandlers();
  registerSettingsHandlers({ pendingConflicts: () => getPendingConflicts(), applyConflictResolutions });
}
