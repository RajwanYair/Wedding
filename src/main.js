/**
 * src/main.js — ES module entry point (S0.10 / S0.11)
 *
 * Full ESM bootstrap. Registers ALL data-action event handlers and wires
 * the 18 section modules with mount/unmount lifecycle + lazy template loading.
 * No window.* side effects — this is the v3 entry point.
 */

// ── Foundation layer ──────────────────────────────────────────────────────
import { PUBLIC_SECTIONS, STORAGE_KEYS } from "./core/constants.js";
import { buildStoreDefs, defaultWeddingInfo } from "./core/defaults.js";
import { initStore, reinitStore, storeGet, storeSet, storeSubscribe } from "./core/store.js";
import { initEvents, on } from "./core/events.js";
import {
  loadLocale,
  applyI18n,
  t,
  normalizeUiLanguage,
  nextUiLanguage,
  loadFallbackLocale,
} from "./core/i18n.js";
import { resolveAppLocale, detectLocale } from "./utils/locale-detector.js";
import { getCountdown, isOverdue } from "./utils/rsvp-deadline.js";
import { updateNavForAuth } from "./core/nav-auth.js";
import {
  initStorage,
  migrateFromLocalStorage,
  getAdapterType,
  readBrowserStorage,
  writeBrowserStorage,
} from "./core/storage.js";
import {
  load,
  save,
  restoreActiveEvent,
  setActiveEvent,
  getActiveEventId,
  listEvents,
  addEvent,
  removeEvent,
  clearEventData,
} from "./core/state.js";
import {
  initRouter,
  initSwipe,
  initPullToRefresh,
  initKeyboardShortcuts,
  initShortcutsHelp,
  initCommandPaletteTrigger,
} from "./core/nav.js";
import {
  showToast,
  openModal,
  closeModal,
  cycleTheme,
  toggleLightMode,
  toggleMobileNav,
  restoreTheme,
  showConfirmDialog,
  initSW,
  initInstallPrompt,
  announce,
} from "./core/ui.js";
import { fetchGasVersion } from "./core/status-bar.js";
import { injectTemplate } from "./core/template-loader.js";

// ── Services ──────────────────────────────────────────────────────────────
import {
  loadSession,
  loginAnonymous,
  loginOAuth,
  clearSession,
  maybeRotateSession,
  isSessionExpired,
  onAuthChange,
  currentUser,
} from "./services/auth.js";
import { startPresence, onPresenceChange } from "./services/presence.js";
import { initMonitoring, initWebVitals, captureException } from "./services/monitoring.js";
import {
  syncSheetsNow,
  sheetsCheckConnection,
  createMissingSheetTabs,
  onSyncStatus,
  initOnlineSync,
  pullFromSheets,
  pushAllToSheets,
  sheetsPost,
  startLiveSync,
  stopLiveSync,
} from "./services/sheets.js";

// ── Section modules (lifecycle) ───────────────────────────────────────────
import * as dashboardSection from "./sections/dashboard.js";
import * as guestsSection from "./sections/guests.js";
import * as tablesSection from "./sections/tables.js";
import * as settingsSection from "./sections/settings.js";
import * as vendorsSection from "./sections/vendors.js";
import * as expensesSection from "./sections/expenses.js";
import * as budgetSection from "./sections/budget.js";
import * as analyticsSection from "./sections/analytics.js";
import * as rsvpSection from "./sections/rsvp.js";
import * as checkinSection from "./sections/checkin.js";
import * as gallerySection from "./sections/gallery.js";
import * as timelineSection from "./sections/timeline.js";
import * as invitationSection from "./sections/invitation.js";
import * as whatsappSection from "./sections/whatsapp.js";
import * as landingSection from "./sections/landing.js";
import * as contactSection from "./sections/contact-collector.js";
import * as registrySection from "./sections/registry.js";
import * as guestLandingSection from "./sections/guest-landing.js";
import * as changelogSection from "./sections/changelog.js";

// ── Named imports for event handlers ─────────────────────────────────────
import {
  saveGuest,
  deleteGuest,
  setFilter,
  setSideFilter,
  setSortField,
  setSearchQuery,
  exportGuestsCSV,
  printGuests,
  downloadCSVTemplate,
  importGuestsCSV,
  openGuestForEdit,
  toggleSelectAll,
  batchSetStatus,
  batchDeleteGuests,
  renderDuplicates,
  mergeGuests,
} from "./sections/guests.js";
import {
  saveTable,
  deleteTable,
  autoAssignTables,
  printSeatingChart,
  printPlaceCards,
  printTableSigns,
  openTableForEdit,
  exportTransportCSV,
  printTransportManifest,
} from "./sections/tables.js";
import {
  saveVendor,
  deleteVendor,
  exportVendorsCSV,
  exportVendorPaymentsCSV,
  filterVendorsByCategory,
  openVendorForEdit,
} from "./sections/vendors.js";
import {
  saveExpense,
  deleteExpense,
  exportExpensesCSV,
  openExpenseForEdit,
} from "./sections/expenses.js";
import { deleteBudgetEntry, renderBudgetProgress } from "./sections/budget.js";
import {
  checkInGuest,
  setCheckinSearch,
  exportCheckinReport,
  resetAllCheckins,
  toggleGiftMode,
  startQrScan,
  stopQrScan,
  startNFCCheckin,
  stopNFCCheckin,
} from "./sections/checkin.js";
import {
  renderBudgetChart,
  exportAnalyticsPDF,
  exportAnalyticsCSV,
  exportMealPerTableCSV,
  printMealPerTable,
} from "./sections/analytics.js";
import { submitRsvp, lookupRsvpByPhone } from "./sections/rsvp.js";
import {
  sendWhatsAppAll,
  sendWhatsAppAllViaApi,
  checkGreenApiConnection,
  saveGreenApiConfig,
  updateWaPreview,
  sendWhatsAppReminder,
} from "./sections/whatsapp.js";
import { handleGalleryUpload, deleteGalleryPhoto, openLightbox } from "./sections/gallery.js";
import {
  saveTimelineItem,
  deleteTimelineItem,
  openTimelineForEdit,
  printTimeline,
} from "./sections/timeline.js";
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
} from "./sections/settings.js";
// registry.js addRegistryLink — added inline below (section handles its own form)

/** Map of section name → module (provides mount/unmount lifecycle). */
/** @type {Record<string, { mount?: (el: HTMLElement) => void | Promise<void>, unmount?: () => void }>} */
const SECTIONS = {
  dashboard: dashboardSection,
  guests: guestsSection,
  tables: tablesSection,
  settings: settingsSection,
  vendors: vendorsSection,
  expenses: expensesSection,
  budget: budgetSection,
  analytics: analyticsSection,
  rsvp: rsvpSection,
  checkin: checkinSection,
  gallery: gallerySection,
  timeline: timelineSection,
  invitation: invitationSection,
  whatsapp: whatsappSection,
  landing: landingSection,
  "contact-form": contactSection,
  registry: registrySection,
  "guest-landing": guestLandingSection,
  changelog: changelogSection,
};

/** @type {string|null} currently mounted section name */
let _activeSection = null;

// ── Bootstrap ─────────────────────────────────────────────────────────────
(async function bootstrap() {
  // 0. Storage layer — initialise IndexedDB / localStorage / memory adapter
  await initStorage();

  // 0a. One-time migration from localStorage → IndexedDB (S16)
  if (getAdapterType() === "indexeddb" && readBrowserStorage(STORAGE_KEYS.IDB_MIGRATED) !== "1") {
    const migrated = await migrateFromLocalStorage();
    if (migrated > 0) {
      writeBrowserStorage(STORAGE_KEYS.IDB_MIGRATED, "1");
    }
  }

  // 0b. Production monitoring — opt-in via VITE_SENTRY_DSN. No-op without DSN.
  // Wires window error/unhandledrejection listeners so silent failures surface.
  // (ROADMAP Phase A2: zero plaintext credentials, observable error stream.)
  initMonitoring().catch(() => {
    /* monitoring must never break the app */
  });
  // Web Vitals beacons (LCP / INP / CLS) — forwarded as breadcrumbs and to
  // remote transport when configured. Pure no-op without PerformanceObserver.
  try {
    initWebVitals();
  } catch {
    /* never break the app for telemetry */
  }
  if (typeof window !== "undefined") {
    window.addEventListener("error", (event) => {
      captureException(event.error ?? new Error(String(event.message)), {
        section: "window",
        action: "error",
        filename: event.filename,
        lineno: event.lineno,
      });
    });
    window.addEventListener("unhandledrejection", (event) => {
      captureException(event.reason ?? new Error("unhandledrejection"), {
        section: "window",
        action: "unhandledrejection",
      });
    });
  }

  // 1. Language — use stored preference; auto-detect browser locale for new users (Phase 4.3)
  const _storedLang = load("lang");
  const lang = /** @type {'he'|'en'|'ar'|'ru'} */ (
    _storedLang
      ? normalizeUiLanguage(String(_storedLang))
      : resolveAppLocale(detectLocale(), ["he", "en", "ar", "ru"], "he")
  );
  await loadLocale(lang);
  // Load English fallback dict for non-English locales (Sprint 13)
  if (lang !== "en") loadFallbackLocale().catch(() => {});

  // 2. Apply i18n bindings
  applyI18n();

  // 2a. Restore active event (S9.1) — must be before initStore
  restoreActiveEvent();

  // 3. Reactive store — seed with persisted data from localStorage
  initStore(buildStoreDefs());

  // 3a. Seed default weddingInfo for the "default" event if empty.
  // Source-of-truth defaults live in `public/wedding.json` (deploy-time config).
  // Falls back silently if the fetch fails (offline / file missing).
  if (getActiveEventId() === "default") {
    const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo") ?? {});
    if (!info.groom) {
      /** @type {Record<string, string>} */
      let publicDefaults = {};
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}wedding.json`, {
          cache: "no-cache",
        });
        if (res.ok) {
          const json = /** @type {Record<string, unknown>} */ (await res.json());
          // Coerce to string map and drop the comment / non-string fields.
          publicDefaults = Object.fromEntries(
            Object.entries(json)
              .filter(([k, v]) => !k.startsWith("_") && typeof v === "string")
              .map(([k, v]) => [k, /** @type {string} */ (v)]),
          );
        }
      } catch {
        /* network or parse error — keep built-in defaults */
      }
      // Drop empty-string fields from saved info so they don't override the
      // public defaults during the merge.
      const overrides = Object.fromEntries(
        Object.entries(info).filter(([, v]) => typeof v === "string" && v !== ""),
      );
      storeSet("weddingInfo", {
        ...defaultWeddingInfo,
        ...publicDefaults,
        ...overrides,
      });
    }
  }

  // 3b. Populate event switcher UI (S9.2)
  _renderEventSwitcher();

  // 4. Theme restore (before paint to avoid flash)
  restoreTheme();

  // 4a. Populate shared header with wedding info for all users (including guests)
  dashboardSection.updateTopBar();
  dashboardSection.updateCountdown();

  // 5. Auth — restore session or sign in anonymously
  onAuthChange(updateNavForAuth); // register BEFORE any login call
  const user = loadSession();
  if (!user) loginAnonymous(); // fires onAuthChange immediately

  // 5a. S10.3 — Presence indicator for admins
  if (currentUser()?.isAdmin) startPresence();
  onPresenceChange((users) => {
    const badge = document.getElementById("presenceBadge");
    if (!badge) return;
    const others = users.filter((u) => u.email !== currentUser()?.email);
    if (others.length === 0) {
      badge.classList.add("u-hidden");
    } else {
      badge.classList.remove("u-hidden");
      badge.textContent = `👥 ${others.length}`;
      badge.title = others.map((u) => u.name).join(", ");
    }
  });

  // 6. Event delegation hub
  initEvents();

  // 7. Register ALL data-action handlers
  _registerHandlers();

  // 8. Start hash router — fires "showSection" for initial hash
  initRouter();

  // 8a. Apply initial nav state and redirect guest to landing
  updateNavForAuth(currentUser());
  if (!currentUser()?.isAdmin) {
    const hashSection = location.hash.slice(1).trim();
    if (!PUBLIC_SECTIONS.has(hashSection)) {
      await _switchSection("landing");
    }
  }

  // 9. Session rotation (every 15 min) + expiry enforcement
  setInterval(
    () => {
      if (isSessionExpired()) {
        clearSession();
        showToast(t("session_expired"), "warning");
        // Redirect to landing section
        window.location.hash = "#landing";
      } else {
        maybeRotateSession();
      }
    },
    15 * 60 * 1000,
  );

  // 10. Swipe gesture navigation (S2.7)
  initSwipe();

  // 11a. Pull-to-refresh on mobile (S2.8) — triggers immediate Sheets sync
  initPullToRefresh(() => syncSheetsNow());
  initKeyboardShortcuts();
  initShortcutsHelp();
  // Sprint 15: Ctrl+K / Cmd+K opens the search/command palette modal
  initCommandPaletteTrigger(() => openModal("searchModal"));

  // 11b. Wire sync status indicator (S3.6)
  onSyncStatus((status) => {
    const badge = document.getElementById("syncStatusBadge");
    if (!badge) return;
    const labels = {
      idle: "",
      syncing: t("syncing"),
      synced: t("synced"),
      error: t("error_save"),
    };
    badge.textContent = labels[status] ?? "";
    badge.className = `sync-badge sync-badge--${status}`;
    badge.hidden = status === "idle";
  });

  // 11c. S3.9 — Resume queued writes when back online
  initOnlineSync();

  // 11c2. S10.1 — Restore live sync if it was active
  if (load("liveSync", false)) {
    startLiveSync();
  }

  // 11d. Service Worker — update detection + refresh banner
  initSW();

  // 11e. PWA install prompt — invite browser users to install the app
  initInstallPrompt();

  // 11f. Fetch GAS version for status bar (fire-and-forget)
  fetchGasVersion(currentUser());

  // 11g. Network status — offline/online indicator
  import("./utils/network-status.js").then(({ initNetworkStatus, onStatusChange }) => {
    initNetworkStatus();
    onStatusChange((/** @type {boolean} */ online) => {
      if (online) {
        showToast(t("network_back_online"), "success");
      } else {
        showToast(t("network_offline"), "warning", 0);
      }
    });
  });

  // 11h. S17 — Activate Supabase Realtime when backend is configured
  import("./services/supabase-realtime.js").then(({ activateRealtimeSync }) => {
    activateRealtimeSync(["guests", "tables", "config"]).catch(() => {});
  });

  // 11i. Phase 4.2 — App Badging API: badge icon with pending RSVP count
  import("./utils/app-badge.js").then(({ updateBadge }) => {
    const _refreshBadge = () => {
      const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
      const pendingCount = guests.filter((g) => g.status === "pending").length;
      updateBadge(pendingCount);
    };
    _refreshBadge();
    storeSubscribe("guests", _refreshBadge);
  });

  // 11j. Sprint 17 — App-level RSVP deadline banner (persistent across all sections)
  _updateAppRsvpDeadlineBanner();
  storeSubscribe("weddingInfo", _updateAppRsvpDeadlineBanner);

  // 11k. Phase 4.2 — File Handling API: open CSV/XLSX files launched from OS
  const _launchQueue = /** @type {any} */ (window).launchQueue;
  if (_launchQueue && typeof _launchQueue.setConsumer === "function") {
    _launchQueue.setConsumer((/** @type {any} */ launchParams) => {
      if (!launchParams.files?.length) return;
      // Route the first file to the CSV import section
      launchParams.files[0]
        .getFile()
        .then((/** @type {File} */ file) => {
          _switchSection("guests");
          // Dispatch a custom event so the guests section can pick up the file
          window.dispatchEvent(new CustomEvent("launchFile", { detail: { file } }));
        })
        .catch(() => {});
    });
  }
})();

// ── Sprint 17: App-level RSVP deadline banner ────────────────────────────

/**
 * Show or hide the persistent app-level RSVP deadline banner.
 * Uses #appRsvpDeadlineBanner in index.html (outside any section template).
 */
function _updateAppRsvpDeadlineBanner() {
  const banner = document.getElementById("appRsvpDeadlineBanner");
  if (!banner) return;
  const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo") ?? {});
  const deadline = info.rsvpDeadline;
  if (!deadline) {
    banner.hidden = true;
    return;
  }
  const { days } = getCountdown(deadline);
  const overdue = isOverdue(deadline);
  if (overdue) {
    banner.textContent = t("rsvp_deadline_passed");
    banner.className = "rsvp-deadline-banner rsvp-deadline-banner--late";
    banner.hidden = false;
  } else if (days <= 7) {
    banner.textContent = t("rsvp_deadline_soon").replace("{days}", String(days));
    banner.className = "rsvp-deadline-banner rsvp-deadline-banner--soon";
    banner.hidden = false;
  } else {
    banner.hidden = true;
  }
}

// ── S9.2 Event Switcher ──────────────────────────────────────────────────

/**
 * Render the event switcher dropdown.
 */
function _renderEventSwitcher() {
  const select = document.getElementById("eventSelect");
  if (!select) return;
  const events = listEvents();
  const activeId = getActiveEventId();
  select.textContent = "";
  events.forEach((evt) => {
    const opt = document.createElement("option");
    opt.value = evt.id;
    opt.textContent = evt.label || (evt.id === "default" ? t("event_default") : evt.id);
    if (evt.id === activeId) opt.selected = true;
    select.appendChild(opt);
  });
}

/**
 * Switch to a different event — reloads all store data from localStorage.
 * @param {string} eventId
 */
async function _doSwitchEvent(eventId) {
  if (eventId === getActiveEventId()) return;
  // unmount active section
  if (_activeSection) {
    SECTIONS[_activeSection]?.unmount?.();
  }
  // switch
  setActiveEvent(eventId);
  reinitStore(buildStoreDefs());
  // refresh UI
  dashboardSection.updateTopBar();
  dashboardSection.updateCountdown();
  _renderEventSwitcher();
  // navigate to dashboard (or landing if guest)
  const target = currentUser()?.isAdmin ? "dashboard" : "landing";
  await _switchSection(target);
  showToast(t("event_switched"));
}

/**
 * Create a new event.
 */
function _doAddEvent() {
  const id = `evt_${Date.now().toString(36)}`;
  const label = prompt(t("event_name_prompt")) ?? "";
  if (!label.trim()) return;
  addEvent(id, label.trim());
  _doSwitchEvent(id);
}

/**
 * Delete the current event (if not "default").
 */
async function _doDeleteEvent() {
  const eid = getActiveEventId();
  if (eid === "default") {
    showToast(t("event_cannot_delete_default"));
    return;
  }
  const ok = await showConfirmDialog(t("event_delete_confirm"));
  if (!ok) return;
  clearEventData(eid);
  removeEvent(eid);
  await _doSwitchEvent("default");
}

// ── S10.2 Conflict Resolution State ──────────────────────────────────────

/** @type {Array<{ id: string, field: string, localVal: unknown, remoteVal: unknown }>} */
let _pendingConflicts = [];

/**
 * Show the conflict resolution modal with the given conflicts.
 * @param {Array<{ id: string, field: string, localVal: unknown, remoteVal: unknown }>} conflicts
 */
async function _showConflictModal(conflicts) {
  _pendingConflicts = conflicts;
  await openModal("conflictModal");
  const list = document.getElementById("conflictList");
  if (!list) return;
  list.textContent = "";
  conflicts.forEach((c, i) => {
    const row = document.createElement("div");
    row.className = "conflict-row";
    row.innerHTML = `  // nosec — all interpolations use _escHtml() or t()
      <strong>${_escHtml(c.id)} → ${_escHtml(c.field)}</strong>
      <label><input type="radio" name="conflict_${i}" value="local" checked>
        ${t("conflict_local")}: <code>${_escHtml(String(c.localVal ?? ""))}</code></label>
      <label><input type="radio" name="conflict_${i}" value="remote">
        ${t("conflict_remote")}: <code>${_escHtml(String(c.remoteVal ?? ""))}</code></label>`;
    list.appendChild(row);
  });
}

/**
 * Apply conflict resolutions. Each choice is "local" or "remote".
 * @param {string[]} choices
 */
function _applyConflictResolutions(choices) {
  const guests = /** @type {any[]} */ (
    Array.from(/** @type {Iterable<any>} */ (storeGet("guests") ?? []))
  );
  for (let i = 0; i < _pendingConflicts.length; i++) {
    if (choices[i] === "remote") {
      const c = _pendingConflicts[i];
      if (!c) continue;
      const guest = guests.find((g) => String(g.id) === c.id);
      if (guest) guest[c.field] = c.remoteVal;
    }
  }
  storeSet("guests", guests);
  _pendingConflicts = [];
}

/** @param {string} s */
function _escHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

// ── Handler registration ──────────────────────────────────────────────────

/**
 * Register all data-action event handlers with the event delegation hub.
 * Called once at bootstrap.
 */
function _registerHandlers() {
  // ── Navigation ──
  on("showSection", (el) => {
    const name = el.dataset.actionArg || "dashboard";
    // Keep URL hash in sync so deep-links, browser back/forward, and external
    // tools observe the active section. pushState does NOT fire hashchange,
    // so this is safe to do alongside the explicit _switchSection call.
    if (typeof location !== "undefined" && location.hash !== `#${name}`) {
      try {
        history.pushState(null, "", `#${name}`);
      } catch {
        /* SecurityError in sandboxed contexts — fall back silently */
      }
    }
    _switchSection(name);
  });

  // ── S9.2 Event switcher ──
  on("switchEvent", (el) => {
    const val = /** @type {HTMLSelectElement} */ (el).value;
    _doSwitchEvent(val);
  });
  on("addNewEvent", () => _doAddEvent());
  on("deleteEvent", () => _doDeleteEvent());

  // ── Auth ──
  on("submitEmailLogin", () => {
    const input = /** @type {HTMLInputElement|null} */ (document.getElementById("adminLoginEmail"));
    const email = input?.value?.trim() ?? "";
    const result = loginOAuth(email, email, "", "email");
    if (!result) showToast(t("auth_email_not_approved"), "error");
    else {
      closeModal("authOverlay");
      _switchSection("dashboard");
      showToast(t("auth_welcome", { name: result.name }), "success");
    }
  });
  on("loginFacebook", () => {
    const fb = /** @type {any} */ (window).FB;
    if (!fb) return;
    fb.login(
      (/** @type {any} */ response) => {
        if (response.authResponse) {
          fb.api("/me", { fields: "name,email,picture" }, (/** @type {any} */ profile) => {
            const result = loginOAuth(
              profile.email || "",
              profile.name,
              profile.picture?.data?.url || "",
              "facebook",
            );
            if (result) {
              closeModal("authOverlay");
              _switchSection("dashboard");
              showToast(t("auth_welcome", { name: result.name }), "success");
            }
          });
        }
      },
      { scope: "public_profile,email" },
    );
  });
  on("loginApple", () => {
    const AppleID = /** @type {any} */ (window).AppleID;
    if (!AppleID) return;
    AppleID.auth
      .signIn()
      .then((/** @type {any} */ response) => {
        const email = response?.user?.email ?? "";
        const name =
          `${response?.user?.name?.firstName ?? ""} ${response?.user?.name?.lastName ?? ""}`.trim();
        const result = loginOAuth(email, name, "", "apple");
        if (result) {
          closeModal("authOverlay");
          _switchSection("dashboard");
          showToast(t("auth_welcome", { name: result.name }), "success");
        }
      })
      .catch(() => {});
  });
  on("signOut", () => {
    clearSession();
    loginAnonymous(); // fires onAuthChange → hides admin nav
    _switchSection("landing");
    showToast(t("auth_signed_out"), "info");
  });
  on("showAuthOverlay", () => openModal("authOverlay"));
  on("hideAuthOverlay", () => closeModal("authOverlay"));

  // ── Theme / UI ──
  on("cycleTheme", () => cycleTheme());
  on("toggleLightMode", () => toggleLightMode());
  on("toggleMobileNav", () => toggleMobileNav());

  // ── Modals ──
  on("closeModal", (el) => closeModal(el.dataset.actionArg ?? ""));
  on("closeGalleryLightbox", () => {
    const lb = document.getElementById("galleryLightbox");
    if (lb) lb.remove();
  });
  on("openAddGuestModal", () => {
    const idEl = /** @type {HTMLInputElement|null} */ (document.getElementById("guestModalId"));
    if (idEl) idEl.value = "";
    const title = document.getElementById("guestModalTitle");
    if (title) title.setAttribute("data-i18n", "modal_add_guest");
    openModal("guestModal");
  });
  on("openAddTableModal", () => {
    const idEl = /** @type {HTMLInputElement|null} */ (document.getElementById("tableModalId"));
    if (idEl) idEl.value = "";
    const title = document.getElementById("tableModalTitle");
    if (title) title.setAttribute("data-i18n", "modal_add_table");
    openModal("tableModal");
  });
  on("openAddVendorModal", () => {
    const idEl = /** @type {HTMLInputElement|null} */ (document.getElementById("vendorModalId"));
    if (idEl) idEl.value = "";
    const title = document.getElementById("vendorModalTitle");
    if (title) title.setAttribute("data-i18n", "modal_add_vendor");
    openModal("vendorModal");
  });
  on("openAddExpenseModal", () => {
    const idEl = /** @type {HTMLInputElement|null} */ (document.getElementById("expenseModalId"));
    if (idEl) idEl.value = "";
    const title = document.getElementById("expenseModalTitle");
    if (title) title.setAttribute("data-i18n", "expense_add");
    openModal("expenseModal");
  });
  on("openAddTimelineModal", () => {
    const idEl = /** @type {HTMLInputElement|null} */ (document.getElementById("timelineModalId"));
    if (idEl) idEl.value = "";
    const title = document.getElementById("timelineModalTitle");
    if (title) title.setAttribute("data-i18n", "timeline_add");
    openModal("timelineModal");
  });

  // ── Guests ──
  on("saveGuest", (_el, _e) => {
    /** @param {string} id @returns {string} */
    const getVal = (/** @type {string} */ id) => {
      const inp = document.getElementById(id);
      if (!inp) return "";
      if (/** @type {HTMLInputElement} */ (inp).type === "checkbox")
        return /** @type {HTMLInputElement} */ (inp).checked ? "true" : "";
      return /** @type {HTMLInputElement} */ (inp).value?.trim() ?? "";
    };
    const data = {
      firstName: getVal("guestFirstName"),
      lastName: getVal("guestLastName"),
      phone: getVal("guestPhone"),
      email: getVal("guestEmail"),
      count: getVal("guestCount2") || "1",
      children: getVal("guestChildren") || "0",
      status: getVal("guestStatus") || "pending",
      side: getVal("guestSide") || "mutual",
      group: getVal("guestGroup") || "friends",
      meal: getVal("guestMeal") || "regular",
      accessibility: getVal("guestAccessibility"),
      transport: getVal("guestTransport"),
      mealNotes: getVal("guestMealNotes"),
      tableId: getVal("guestTableSelect"),
      gift: getVal("guestGift"),
      notes: getVal("guestNotes"),
    };
    const id = getVal("guestModalId") || null;
    const result = saveGuest(data, id);
    if (result.ok) {
      closeModal("guestModal");
      showToast(t("guest_saved"), "success");
    } else showToast(result.errors?.join(", ") ?? t("error_save"), "error");
  });
  on("setFilter", (el) => setFilter(el.dataset.filter || "all"));
  on("setSideFilter", (el) => setSideFilter(el.dataset.side || "all"));
  on("sortGuestsBy", (el) => setSortField(el.dataset.actionArg || "lastName"));
  on("exportGuestsCSV", () => exportGuestsCSV());
  on("printGuests", () => printGuests());
  on("downloadCSVTemplate", () => downloadCSVTemplate());
  on("importGuestsCSV", () => {
    importGuestsCSV();
    document.addEventListener(
      "csvImportDone",
      (e) => {
        const { added, updated } = /** @type {CustomEvent} */ (e).detail ?? {};
        showToast(t("guests_imported", { added: added ?? 0, updated: updated ?? 0 }), "success");
      },
      { once: true },
    );
  });
  on("deleteGuest", (el) =>
    showConfirmDialog(t("confirm_delete"), () => deleteGuest(el.dataset.actionArg ?? "")),
  );
  on("searchGuests", (_triggerEl, e) => {
    const input = /** @type {HTMLInputElement|null} */ (
      e.target instanceof HTMLInputElement ? e.target : null
    );
    setSearchQuery(input?.value ?? "");
  });
  on("openEditGuestModal", (el) => {
    openGuestForEdit(el.dataset.actionArg ?? "");
    openModal("guestModal");
  });
  on("toggleSelectAll", () => toggleSelectAll());
  on("batchSetStatus", () => {
    const select = /** @type {HTMLSelectElement|null} */ (
      document.getElementById("batchStatusSelect")
    );
    const status = select?.value ?? "";
    if (status) {
      batchSetStatus(status);
      showToast(t("batch_success"), "success");
    }
  });
  on("batchDeleteGuests", () =>
    showConfirmDialog(t("confirm_delete"), () => {
      batchDeleteGuests();
      showToast(t("batch_deleted"), "success");
    }),
  );
  on("scanDuplicates", () => renderDuplicates());
  on("mergeGuests", (el) => {
    mergeGuests(el.dataset.keepId ?? "", el.dataset.mergeId ?? "");
    showToast(t("merge_success") || "Merged", "success");
    renderDuplicates();
  });

  // ── Tables ──
  on("saveTable", (_el, _e) => {
    const getVal = (/** @type {string} */ id) =>
      /** @type {HTMLInputElement|HTMLSelectElement|null} */ (
        document.getElementById(id)
      )?.value?.trim() ?? "";
    const data = {
      name: getVal("tableName"),
      capacity: getVal("tableCapacity") || "10",
      shape: getVal("tableShape") || "round",
    };
    const id = getVal("tableModalId") || null;
    const result = saveTable(data, id);
    if (result.ok) {
      closeModal("tableModal");
      showToast(t("table_saved"), "success");
    } else showToast(result.errors?.join(", ") ?? t("error_save"), "error");
  });
  on("autoAssignTables", () => autoAssignTables());
  on("printSeatingChart", () => printSeatingChart());
  on("printPlaceCards", () => printPlaceCards());
  on("printTableSigns", () => printTableSigns());
  on("exportTransportCSV", () => exportTransportCSV());
  on("printTransportManifest", () => printTransportManifest());
  on("deleteTable", (el) =>
    showConfirmDialog(t("confirm_delete"), () => deleteTable(el.dataset.actionArg ?? "")),
  );
  on("openEditTableModal", (el) => {
    openTableForEdit(el.dataset.actionArg ?? "");
    openModal("tableModal");
  });

  // ── Check-in ──
  on("checkInGuest", (el) => checkInGuest(el.dataset.actionArg ?? ""));
  on("checkinSearch", (_el, e) => {
    const input = /** @type {HTMLInputElement|null} */ (
      e.target instanceof HTMLInputElement ? e.target : null
    );
    setCheckinSearch(input?.value ?? "");
  });
  on("exportCheckinReport", () => exportCheckinReport());
  on("resetAllCheckins", () =>
    showConfirmDialog(t("confirm_reset_checkins"), () => resetAllCheckins()),
  );
  on("toggleGiftMode", () => toggleGiftMode());
  on("startQrScan", () => startQrScan());
  on("stopQrScan", () => stopQrScan());
  // Sprint 16 — NFC check-in actions
  on("startNFCCheckin", () => startNFCCheckin());
  on("stopNFCCheckin", () => stopNFCCheckin());
  on("writeNFCForGuest", (el) =>
    import("./services/nfc.js").then(({ writeNFCTag }) =>
      writeNFCTag(el.dataset.actionArg ?? "").catch(() => {}),
    ),
  );

  // ── Vendors ──
  on("saveVendor", (_el, _e) => {
    const getVal = (/** @type {string} */ id) =>
      /** @type {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement|null} */ (
        document.getElementById(id)
      )?.value?.trim() ?? "";
    const data = {
      category: getVal("vendorCategory"),
      name: getVal("vendorName"),
      contact: getVal("vendorContact"),
      phone: getVal("vendorPhone"),
      price: getVal("vendorPrice") || "0",
      paid: getVal("vendorPaid") || "0",
      notes: getVal("vendorNotes"),
    };
    const id = getVal("vendorModalId") || null;
    const result = saveVendor(data, id);
    if (result.ok) {
      closeModal("vendorModal");
      showToast(t("vendor_saved"), "success");
    } else showToast(result.errors?.join(", ") ?? t("error_save"), "error");
  });
  on("deleteVendor", (el) =>
    showConfirmDialog(t("confirm_delete"), () => deleteVendor(el.dataset.actionArg ?? "")),
  );
  on("exportVendorsCSV", () => exportVendorsCSV());
  on("exportVendorPaymentsCSV", () => exportVendorPaymentsCSV());
  on("filterVendorsByCategory", (el) => filterVendorsByCategory(el.dataset.category ?? "all"));
  on("openEditVendorModal", (el) => {
    openVendorForEdit(el.dataset.actionArg ?? "");
    openModal("vendorModal");
  });

  // ── Expenses ──
  on("saveExpense", (_el, _e) => {
    const getVal = (/** @type {string} */ id) =>
      /** @type {HTMLInputElement|HTMLSelectElement|null} */ (
        document.getElementById(id)
      )?.value?.trim() ?? "";
    const data = {
      category: getVal("expenseCategory"),
      amount: getVal("expenseAmount") || "0",
      description: getVal("expenseDescription"),
      date: getVal("expenseDate"),
    };
    const id = getVal("expenseModalId") || null;
    const result = saveExpense(data, id);
    if (result.ok) {
      closeModal("expenseModal");
      showToast(t("expense_saved"), "success");
    } else showToast(result.errors?.join(", ") ?? t("error_save"), "error");
  });
  on("deleteExpense", (el) =>
    showConfirmDialog(t("confirm_delete"), () => deleteExpense(el.dataset.actionArg ?? "")),
  );
  on("exportExpensesCSV", () => exportExpensesCSV());
  on("openEditExpenseModal", (el) => {
    openExpenseForEdit(el.dataset.actionArg ?? "");
    openModal("expenseModal");
  });

  // ── Budget ──
  on("saveBudgetTarget", (_el, e) => {
    e.preventDefault();
    const input = /** @type {HTMLInputElement|null} */ (
      document.getElementById("budgetTargetInput")
    );
    const val = Number(input?.value ?? 0);
    if (isNaN(val) || val < 0) {
      showToast(t("error_invalid_amount"), "error");
      return;
    }
    const current = /** @type {Record<string,unknown>} */ (storeGet("weddingInfo") ?? {});
    storeSet("weddingInfo", { ...current, budgetTarget: val });
    renderBudgetProgress();
    showToast(t("settings_saved"), "success");
  });
  on("deleteBudgetEntry", (el) =>
    showConfirmDialog(t("confirm_delete"), () => deleteBudgetEntry(el.dataset.actionArg ?? "")),
  );
  on("renderBudgetProgress", () => renderBudgetProgress());
  on("renderBudgetChart", () => renderBudgetChart());

  // ── Analytics exports (S8.4) ──
  on("exportAnalyticsPDF", () => exportAnalyticsPDF());
  on("exportAnalyticsCSV", () => exportAnalyticsCSV());
  on("exportMealPerTableCSV", () => exportMealPerTableCSV());
  on("printMealPerTable", () => printMealPerTable());

  // ── RSVP ──
  on("submitRSVP", (_el, e) => {
    e.preventDefault();
    const data = {
      phone:
        /** @type {HTMLInputElement|null} */ (
          document.getElementById("rsvpPhone")
        )?.value?.trim() ?? "",
      firstName:
        /** @type {HTMLInputElement|null} */ (
          document.getElementById("rsvpFirstName")
        )?.value?.trim() ?? "",
      lastName:
        /** @type {HTMLInputElement|null} */ (
          document.getElementById("rsvpLastName")
        )?.value?.trim() ?? "",
      side:
        /** @type {HTMLSelectElement|null} */ (document.getElementById("rsvpSide"))?.value ??
        "mutual",
      status:
        /** @type {HTMLSelectElement|null} */ (document.getElementById("rsvpAttending"))?.value ??
        "confirmed",
      count:
        /** @type {HTMLInputElement|null} */ (document.getElementById("rsvpGuests"))?.value ?? "1",
      children:
        /** @type {HTMLInputElement|null} */ (document.getElementById("rsvpChildren"))?.value ??
        "0",
      meal:
        /** @type {HTMLSelectElement|null} */ (document.getElementById("rsvpMeal"))?.value ??
        "regular",
      accessibility: /** @type {HTMLInputElement|null} */ (
        document.getElementById("rsvpAccessibility")
      )?.checked
        ? "true"
        : "",
      transport:
        /** @type {HTMLSelectElement|null} */ (document.getElementById("rsvpTransport"))?.value ??
        "",
      notes:
        /** @type {HTMLTextAreaElement|null} */ (
          document.getElementById("rsvpNotes")
        )?.value?.trim() ?? "",
    };
    const result = submitRsvp(data);
    if (!result.ok) showToast(result.errors?.join(", ") ?? t("error_save"), "error");
  });
  on("lookupRsvpByPhone", (_el, e) => {
    const input = /** @type {HTMLInputElement|null} */ (
      e.target instanceof HTMLInputElement ? e.target : null
    );
    if (!input) return;
    const result = lookupRsvpByPhone(input.value);
    const statusEl = document.getElementById("rsvpLookupStatus");
    if (statusEl) {
      statusEl.classList.remove("u-hidden");
      statusEl.textContent = result.found ? t("rsvp_lookup_found") : t("rsvp_lookup_new");
    }
    // Also reveal the form for new guests once a valid-looking phone is entered
    if (!result.found && input.value.replace(/\D/g, "").length >= 9) {
      const details = document.getElementById("rsvpDetails");
      if (details) details.classList.remove("u-hidden");
    }
  });

  // ── Gallery ──
  on("handleGalleryUpload", (triggerEl) => {
    const input = /** @type {HTMLInputElement} */ (triggerEl);
    handleGalleryUpload(input);
  });
  on("deleteGalleryPhoto", (el) =>
    showConfirmDialog(t("confirm_delete"), () => deleteGalleryPhoto(el.dataset.actionArg ?? "")),
  );
  on("openLightbox", (el) => openLightbox(el.dataset.actionArg ?? ""));

  // ── WhatsApp / Green API ──
  on("sendWhatsAppAll", (el) => sendWhatsAppAll(el.dataset.actionArg ?? "all"));
  on("sendWhatsAppAllViaApi", (el) => sendWhatsAppAllViaApi(el.dataset.actionArg ?? "all"));
  on("updateWaPreview", (_triggerEl, e) => {
    const input = /** @type {HTMLTextAreaElement|null} */ (
      e.target instanceof HTMLTextAreaElement ? e.target : null
    );
    updateWaPreview(input?.value ?? "");
  });
  on("checkGreenApiConnection", () => checkGreenApiConnection());
  on("sendWhatsAppReminder", () => sendWhatsAppReminder());
  on("saveGreenApiConfig", (_el, e) => {
    const form = /** @type {HTMLFormElement|null} */ (
      /** @type {HTMLElement} */ (e.target).closest("form")
    );
    saveGreenApiConfig(form);
    showToast(t("settings_saved"), "success");
  });

  // ── Timeline ──
  on("saveTimelineItem", (_el, _e) => {
    const getVal = (/** @type {string} */ id) =>
      /** @type {HTMLInputElement|null} */ (document.getElementById(id))?.value?.trim() ?? "";
    const data = {
      time: getVal("timelineTime"),
      icon: getVal("timelineIcon"),
      title: getVal("timelineTitle"),
      note: getVal("timelineDesc"),
    };
    const id = getVal("timelineModalId") || null;
    const result = saveTimelineItem(data, id);
    if (result.ok) {
      closeModal("timelineModal");
      showToast(t("saved"), "success");
    } else showToast(result.errors?.join(", ") ?? t("error_save"), "error");
  });
  on("deleteTimelineItem", (el) =>
    showConfirmDialog(t("confirm_delete"), () => deleteTimelineItem(el.dataset.actionArg ?? "")),
  );
  on("openEditTimelineModal", (el) => {
    openTimelineForEdit(el.dataset.actionArg ?? "");
    openModal("timelineModal");
  });
  on("printTimeline", () => printTimeline());

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

  // S10.1 Live sync toggle
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

  // S10.2 Conflict resolution
  on("conflictAcceptAllLocal", () => {
    closeModal("conflictModal");
    showToast(t("conflict_kept_local"), "info");
  });
  on("conflictAcceptAllRemote", () => {
    // Apply all pending remote values
    if (_pendingConflicts.length > 0) {
      _applyConflictResolutions(_pendingConflicts.map(() => "remote"));
    }
    closeModal("conflictModal");
  });
  on("conflictApplySelected", () => {
    const list = document.getElementById("conflictList");
    if (!list) return;
    const radios = list.querySelectorAll('input[type="radio"]:checked');
    const choices = /** @type {string[]} */ ([]);
    radios.forEach((r) => choices.push(/** @type {HTMLInputElement} */ (r).value));
    _applyConflictResolutions(choices);
    closeModal("conflictModal");
    showToast(t("conflict_resolved"), "success");
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
    const { supabaseCheckConnection: sbCheck } = await import("./services/supabase.js");
    const ok = await sbCheck();
    showToast(ok ? t("supabase_connected") : t("supabase_not_connected"), ok ? "success" : "error");
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
    // Use registry section's module directly
    registrySection.addLink?.({ url, name: nameInput?.value?.trim() || url });
    if (urlInput) urlInput.value = "";
    if (nameInput) nameInput.value = "";
  });
  on("addApprovedEmail", () => {
    addApprovedEmail();
  });
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
  on("printRsvpQr", () => window.print());
  on("printGuestCards", () => window.print());

  // ── Invitation detail form ──
  on("updateWeddingDetails", () => invitationSection.updateWeddingDetails?.());
  on("handleInvitationUpload", (_triggerEl, e) => {
    const input = /** @type {HTMLInputElement|null} */ (
      e.target instanceof HTMLInputElement ? e.target : null
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
        /** @type {HTMLInputElement|null} */ (document.getElementById("ccPhone"))?.value?.trim() ??
        "",
      email:
        /** @type {HTMLInputElement|null} */ (document.getElementById("ccEmail"))?.value?.trim() ??
        "",
      side:
        /** @type {HTMLSelectElement|null} */ (document.getElementById("ccSide"))?.value ??
        "mutual",
      dietaryNotes: "",
    };
    const result = contactSection.submitContactForm(data);
    if (!result.ok) showToast(result.errors?.join(", ") ?? t("error_save"), "error");
    else showToast(t("contact_sent"), "success");
  });

  // ── Landing table finder ──
  on("findTable", (_findTableEl) => {
    const input =
      /** @type {HTMLInputElement|null} */ (document.getElementById("tablefinderInput")) ??
      /** @type {HTMLInputElement|null} */ (document.getElementById("findTableInput"));
    landingSection.showTableFinder(input?.value?.trim() ?? "");
  });
}

// ── Section lifecycle ─────────────────────────────────────────────────────

/**
 * Unmount the current section, lazy-load template if needed, then mount.
 * @param {string} name
 */
async function _switchSection(name) {
  // Auth guard — non-public sections require admin login
  if (!PUBLIC_SECTIONS.has(name)) {
    const user = currentUser();
    if (!user?.isAdmin) {
      // Guest users silently land on landing — no auth popup
      if (_activeSection !== "landing") {
        return _switchSection("landing");
      }
      return;
    }
  }

  if (_activeSection && _activeSection !== name) {
    SECTIONS[_activeSection]?.unmount?.();
    // Expenses is embedded in budget — unmount alongside it
    if (_activeSection === "budget") {
      SECTIONS.expenses?.unmount?.();
    }
  }
  _activeSection = name;

  const container = document.getElementById(`sec-${name}`);
  if (!container) {
    showToast(`Section not found: ${name}`, "error");
    return;
  }

  // Update active states on nav tabs
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    const active = /** @type {HTMLElement} */ (btn).dataset.tab === name;
    btn.classList.toggle("active", active);
    // aria-selected is only valid on role=tab; bottom-nav buttons have no role
    // so signal active state via aria-current=page there.
    if (btn.getAttribute("role") === "tab") {
      btn.setAttribute("aria-selected", String(active));
    } else if (active) {
      btn.setAttribute("aria-current", "page");
    } else {
      btn.removeAttribute("aria-current");
    }
  });

  // Show/hide section panes
  document.querySelectorAll(".section").forEach((sec) => {
    const isTarget = sec.id === `sec-${name}`;
    sec.classList.toggle("active", isTarget);
    sec.setAttribute("aria-hidden", String(!isTarget));
  });

  // Lazy-load template on first visit
  if (container.dataset.template && container.dataset.loaded !== "1") {
    await injectTemplate(container, name);
  }

  // Mount section module
  SECTIONS[name]?.mount?.(container);

  // Expenses is a sub-section embedded inside budget — mount alongside it
  if (name === "budget") {
    SECTIONS.expenses?.mount?.(container);
  }

  // Sprint 18: announce section title for screen readers (WCAG 2.4.2)
  announce(t(`nav_${name}`) || name);

  storeSet("activeSection", name);
}
