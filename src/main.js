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
import { initEvents, on, alias } from "./core/events.js";
import { registerNamespacedActionAliases } from "./core/action-registry.js";
import {
  loadLocale,
  applyI18n,
  t,
  normalizeUiLanguage,
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
  navigate,
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
  onSyncStatus,
  initOnlineSync,
  startLiveSync,
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

// ── Domain action handlers (extracted) ───────────────────────────────────
import { register as registerGuestHandlers } from "./handlers/guest-handlers.js";
import { register as registerTableHandlers } from "./handlers/table-handlers.js";
import { register as registerCheckinHandlers } from "./handlers/checkin-handlers.js";
import { register as registerVendorHandlers } from "./handlers/vendor-handlers.js";
import { register as registerSectionHandlers } from "./handlers/section-handlers.js";
import { register as registerSettingsHandlers } from "./handlers/settings-handlers.js";

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

  // 7a. Register namespaced action aliases (ADR-022 — modal: namespace)
  try {
    registerNamespacedActionAliases(alias);
  } catch (e) {
    console.warn("[main] registerNamespacedActionAliases failed:", e);
  }

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
        // Redirect to landing section (ADR-025 R2)
        navigate("landing");
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

// ── Handler registration ──────────────────────────────────────────────────

/**
 * Register all data-action event handlers with the event delegation hub.
 * Called once at bootstrap.
 */
function _registerHandlers() {
  // ── Navigation ──
  on("showSection", (el) => {
    const name = el.dataset.actionArg || "dashboard";
    // ADR-025 R2: route through navigate() so onRouteChange subscribers
    // and the SECTION_LIST guard handle URL writes. Falls back silently
    // for sandboxed contexts (try/catch).
    if (typeof location !== "undefined" && location.hash !== `#${name}`) {
      try {
        navigate(name);
      } catch {
        /* unknown section / sandboxed context — ignore */
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

  // ── Domain handlers ──
  registerGuestHandlers();
  registerTableHandlers();
  registerCheckinHandlers();
  registerVendorHandlers();
  registerSectionHandlers();
  registerSettingsHandlers();
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
