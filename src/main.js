/**
 * src/main.js — ES module entry point (S0.10 / S0.11)
 *
 * Full ESM bootstrap. Registers ALL data-action event handlers and wires
 * the 18 section modules with mount/unmount lifecycle + lazy template loading.
 * No window.* side effects — this is the v3 entry point.
 */

// ── Foundation layer ──────────────────────────────────────────────────────
import { APP_VERSION } from "./core/config.js";
import { initStore, reinitStore, storeGet, storeSet } from "./core/store.js";
import { initEvents, on } from "./core/events.js";
import { loadLocale, applyI18n, t } from "./core/i18n.js";
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
} from "./core/ui.js";
import { injectTemplate } from "./core/template-loader.js";

// ── Services ──────────────────────────────────────────────────────────────
import {
  loadSession,
  loginAnonymous,
  loginOAuth,
  clearSession,
  maybeRotateSession,
  onAuthChange,
  currentUser,
} from "./services/auth.js";
import { startPresence, onPresenceChange } from "./services/presence.js";
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
  batchSetMeal,
  renderDuplicates,
  mergeGuests,
  addGuestNote,
  renderGuestHistory,
  setMultiFilter,
  addGuestTag,
  removeGuestTag,
} from "./sections/guests.js";
import {
  saveTable,
  deleteTable,
  autoAssignTables,
  renderTables,
  printSeatingChart,
  printPlaceCards,
  printTableSigns,
  openTableForEdit,
  exportTransportCSV,
  printTransportManifest,
  smartAutoAssign,
} from "./sections/tables.js";
import {
  saveVendor,
  deleteVendor,
  exportVendorsCSV,
  filterVendorsByCategory,
  openVendorForEdit,
} from "./sections/vendors.js";
import {
  saveExpense,
  deleteExpense,
  exportExpensesCSV,
  filterExpensesByCategory,
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
  checkInByTable,
} from "./sections/checkin.js";
import {
  renderBudgetChart,
  exportAnalyticsPDF,
  exportAnalyticsCSV,
  exportMealPerTableCSV,
  printMealPerTable,
  renderSeatingMap,
  exportEventSummary,
  printDietaryCards,
} from "./sections/analytics.js";
import { submitRsvp, lookupRsvpByPhone } from "./sections/rsvp.js";
import {
  sendWhatsAppAll,
  sendWhatsAppAllViaApi,
  checkGreenApiConnection,
  saveGreenApiConfig,
  updateWaPreview,
  sendWhatsAppReminder,
  sendThankYouMessages,
  toggleUnsentFilter,
  renderUnsentBadge,
} from "./sections/whatsapp.js";
import {
  handleGalleryUpload,
  deleteGalleryPhoto,
  openLightbox,
} from "./sections/gallery.js";
import { popUndo } from "./utils/undo.js";
import {
  saveTimelineItem,
  deleteTimelineItem,
  openTimelineForEdit,
  startTimelineAlarms,
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
  startAutoBackup,
  stopAutoBackup,
  downloadAutoBackup,
  restoreAutoBackup,
  initQueueMonitor,
} from "./sections/settings.js";
// registry.js addRegistryLink — added inline below (section handles its own form)

/** Map of section name → module (provides mount/unmount lifecycle). */
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

// ── Default data factories ────────────────────────────────────────────────

/** @type {Record<string,string>} */
const _defaultWeddingInfo = {
  groom: "",
  bride: "",
  groomEn: "",
  brideEn: "",
  date: "",
  hebrewDate: "",
  time: "18:00",
  ceremonyTime: "19:30",
  rsvpDeadline: "",
  venue: "",
  venueAddress: "",
  venueWaze: "",
  venueMapLink: "",
  budgetTarget: "",
};

const _defaultTimeline = [
  { id: "tl_invite", time: "18:00", title: "קבלת פנים" },
  { id: "tl_bedeken", time: "18:40", title: "כיסוי כלה בהינומה" },
  { id: "tl_chuppah", time: "18:50", title: "חופה" },
];

/**
 * Build store definitions from the CURRENT event's localStorage.
 * @returns {Record<string, { value: unknown, storageKey?: string }>}
 */
function _buildStoreDefs() {
  const savedInfo = /** @type {Record<string,string>} */ (
    load("weddingInfo", {})
  );
  const weddingInfo = { ..._defaultWeddingInfo, ...savedInfo };

  const savedTimeline = load("timeline", null);
  const timeline =
    savedTimeline && /** @type {any[]} */ (savedTimeline).length > 0
      ? savedTimeline
      : _defaultTimeline;

  return {
    guests: { value: load("guests", []), storageKey: "guests" },
    tables: { value: load("tables", []), storageKey: "tables" },
    vendors: { value: load("vendors", []), storageKey: "vendors" },
    expenses: { value: load("expenses", []), storageKey: "expenses" },
    weddingInfo: { value: weddingInfo, storageKey: "weddingInfo" },
    gallery: { value: load("gallery", []), storageKey: "gallery" },
    timeline: { value: timeline, storageKey: "timeline" },
    contacts: { value: load("contacts", []), storageKey: "contacts" },
    budget: { value: load("budget", []), storageKey: "budget" },
  };
}

// ── Bootstrap ─────────────────────────────────────────────────────────────
(async function bootstrap() {
  // 1. Language
  const lang = load("lang", "he") === "en" ? "en" : "he";
  await loadLocale(lang);

  // 2. Apply i18n bindings
  applyI18n();

  // 2a. Restore active event (S9.1) — must be before initStore
  restoreActiveEvent();

  // 3. Reactive store — seed with persisted data from localStorage
  initStore(_buildStoreDefs());

  // 3a. Seed default weddingInfo for the "default" event if empty
  if (getActiveEventId() === "default") {
    const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo") ?? {});
    if (!info.groom) {
      storeSet("weddingInfo", {
        ..._defaultWeddingInfo,
        groom: "אליאור",
        bride: "טובה",
        date: "2026-05-07",
        venue: "נוף הירדן",
        venueAddress: "מצפה יריחו",
        ...info,
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
  onAuthChange(_updateNavForAuth); // register BEFORE any login call
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
  _updateNavForAuth(currentUser());
  if (!currentUser()?.isAdmin) {
    const hashSection = location.hash.slice(1).trim();
    if (!PUBLIC_SECTIONS.has(hashSection)) {
      await _switchSection("landing");
    }
  }

  // 9. Session rotation (every 15 min)
  setInterval(maybeRotateSession, 15 * 60 * 1000);

  // 10. Swipe gesture navigation (S2.7)
  initSwipe();

  // 11a. Pull-to-refresh on mobile (S2.8) — triggers immediate Sheets sync
  initPullToRefresh(() => syncSheetsNow());
  initKeyboardShortcuts();

  // S15.1 — Ctrl+Z undo for reversible operations
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
      const tag = /** @type {HTMLElement} */ (e.target).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      const entry = popUndo();
      if (entry) {
        storeSet(entry.key, entry.snapshot);
        showToast(t("undo_success").replace("{label}", entry.label), "info");
      }
    }
  });

  // S15.2 — "?" key opens keyboard shortcuts help overlay
  document.addEventListener("keydown", (e) => {
    if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const tag = /** @type {HTMLElement} */ (e.target).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      openModal("shortcutsModal");
    }
  });

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
  _fetchGasVersion();

  // S18.4 — Start timeline alarms after app is ready
  startTimelineAlarms();

  // S18.1 — Init queue monitor (updates badge live)
  initQueueMonitor();
})();

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
    opt.textContent =
      evt.label || (evt.id === "default" ? t("event_default") : evt.id);
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
  if (_activeSection && SECTIONS[_activeSection]?.unmount) {
    SECTIONS[_activeSection].unmount();
  }
  // switch
  setActiveEvent(eventId);
  reinitStore(_buildStoreDefs());
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
    row.innerHTML = `
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
  const guests = /** @type {any[]} */ ([...(storeGet("guests") ?? [])]);
  for (let i = 0; i < _pendingConflicts.length; i++) {
    if (choices[i] === "remote") {
      const c = _pendingConflicts[i];
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
  on("showSection", (el) =>
    _switchSection(el.dataset.actionArg || "dashboard"),
  );

  // ── S9.2 Event switcher ──
  on("switchEvent", (el) => {
    const val = /** @type {HTMLSelectElement} */ (el).value;
    _doSwitchEvent(val);
  });
  on("addNewEvent", () => _doAddEvent());
  on("deleteEvent", () => _doDeleteEvent());

  // ── Auth ──
  on("submitEmailLogin", () => {
    const input = /** @type {HTMLInputElement|null} */ (
      document.getElementById("adminLoginEmail")
    );
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
      (response) => {
        if (response.authResponse) {
          fb.api("/me", { fields: "name,email,picture" }, (profile) => {
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
      .then((response) => {
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
    const idEl = /** @type {HTMLInputElement|null} */ (
      document.getElementById("guestModalId")
    );
    if (idEl) idEl.value = "";
    const title = document.getElementById("guestModalTitle");
    if (title) title.setAttribute("data-i18n", "modal_add_guest");
    openModal("guestModal");
  });
  on("openAddTableModal", () => {
    const idEl = /** @type {HTMLInputElement|null} */ (
      document.getElementById("tableModalId")
    );
    if (idEl) idEl.value = "";
    const title = document.getElementById("tableModalTitle");
    if (title) title.setAttribute("data-i18n", "modal_add_table");
    openModal("tableModal");
  });
  on("openAddVendorModal", () => {
    const idEl = /** @type {HTMLInputElement|null} */ (
      document.getElementById("vendorModalId")
    );
    if (idEl) idEl.value = "";
    const title = document.getElementById("vendorModalTitle");
    if (title) title.setAttribute("data-i18n", "modal_add_vendor");
    openModal("vendorModal");
  });
  on("openAddExpenseModal", () => {
    const idEl = /** @type {HTMLInputElement|null} */ (
      document.getElementById("expenseModalId")
    );
    if (idEl) idEl.value = "";
    const title = document.getElementById("expenseModalTitle");
    if (title) title.setAttribute("data-i18n", "expense_add");
    openModal("expenseModal");
  });
  on("openAddTimelineModal", () => {
    const idEl = /** @type {HTMLInputElement|null} */ (
      document.getElementById("timelineModalId")
    );
    if (idEl) idEl.value = "";
    const title = document.getElementById("timelineModalTitle");
    if (title) title.setAttribute("data-i18n", "timeline_add");
    openModal("timelineModal");
  });

  // ── Guests ──
  on("saveGuest", (_el, _e) => {
    /** @param {string} id @returns {string} */
    const getVal = (id) => {
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
        showToast(
          t("guests_imported", { added: added ?? 0, updated: updated ?? 0 }),
          "success",
        );
      },
      { once: true },
    );
  });
  on("deleteGuest", (el) =>
    showConfirmDialog(t("confirm_delete"), () =>
      deleteGuest(el.dataset.actionArg ?? ""),
    ),
  );
  on("searchGuests", (_triggerEl, e) => {
    const input = /** @type {HTMLInputElement|null} */ (
      e.target?.tagName === "INPUT" ? e.target : null
    );
    setSearchQuery(input?.value ?? "");
  });
  on("openEditGuestModal", (el) => {
    const gid = el.dataset.actionArg ?? "";
    openGuestForEdit(gid);
    openModal("guestModal");
    // S13.5 + S14.5 — render history + tags
    renderGuestHistory(gid);
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
  // S17.2 Batch meal assignment
  on("batchSetMeal", () => {
    const select = /** @type {HTMLSelectElement|null} */ (
      document.getElementById("batchMealSelect")
    );
    const meal = select?.value ?? "";
    if (meal) {
      batchSetMeal(meal);
      showToast(t("batch_success"), "success");
    }
  });
  on("scanDuplicates", () => renderDuplicates());
  on("mergeGuests", (el) => {
    mergeGuests(el.dataset.keepId ?? "", el.dataset.mergeId ?? "");
    showToast(t("merge_success") || "Merged", "success");
    renderDuplicates();
  });

  // ── S13.5 Guest notes ──
  on("addGuestNote", () => {
    const guestId = /** @type {HTMLInputElement|null} */ (document.getElementById("guestModalId"))?.value;
    const noteInput = /** @type {HTMLInputElement|null} */ (document.getElementById("guestNoteInput"));
    if (!guestId || !noteInput?.value?.trim()) return;
    addGuestNote(guestId, noteInput.value);
    noteInput.value = "";
    renderGuestHistory(guestId);
    showToast(t("guest_note_added"), "success");
  });

  // ── S14.1 Multi-criteria filter ──
  on("setMultiFilter", (el) => {
    const field = el.dataset.filterField ?? "";
    const value = /** @type {HTMLSelectElement} */ (el).value ?? "all";
    setMultiFilter(field, value);
  });

  // ── S14.5 Guest tags ──
  on("addGuestTag", () => {
    const guestId = /** @type {HTMLInputElement|null} */ (document.getElementById("guestModalId"))?.value;
    const tagInput = /** @type {HTMLInputElement|null} */ (document.getElementById("guestTagInput"));
    if (!guestId || !tagInput?.value?.trim()) return;
    addGuestTag(guestId, tagInput.value);
    tagInput.value = "";
    showToast(t("tag_added"), "success");
  });
  on("removeGuestTag", (el) => {
    const guestId = /** @type {HTMLInputElement|null} */ (document.getElementById("guestModalId"))?.value;
    if (!guestId) return;
    removeGuestTag(guestId, el.dataset.tag ?? "");
  });

  // ── Tables ──
  on("saveTable", (_el, _e) => {
    const getVal = (id) =>
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
  on("smartAutoAssign", () => {
    const n = smartAutoAssign();
    showToast(t("smart_assign_result").replace("{n}", String(n)), "success");
    renderTables();
  });
  on("printSeatingChart", () => printSeatingChart());
  on("printPlaceCards", () => printPlaceCards());
  on("printTableSigns", () => printTableSigns());
  on("exportTransportCSV", () => exportTransportCSV());
  on("printTransportManifest", () => printTransportManifest());
  on("deleteTable", (el) =>
    showConfirmDialog(t("confirm_delete"), () =>
      deleteTable(el.dataset.actionArg ?? ""),
    ),
  );
  on("openEditTableModal", (el) => {
    openTableForEdit(el.dataset.actionArg ?? "");
    openModal("tableModal");
  });

  // ── Check-in ──
  on("checkInGuest", (el) => checkInGuest(el.dataset.actionArg ?? ""));
  on("checkinSearch", (_el, e) => {
    const input = /** @type {HTMLInputElement|null} */ (
      e.target?.tagName === "INPUT" ? e.target : null
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
  // S18.3 Batch check-in by table
  on("checkInByTable", (el) => {
    const tableId = el.dataset.actionArg ?? "";
    checkInByTable(tableId);
    showToast(t("checkin_table_all"), "success");
  });

  // ── Vendors ──
  on("saveVendor", (_el, _e) => {
    const getVal = (id) =>
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
      dueDate: getVal("vendorDueDate") || "",
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
    showConfirmDialog(t("confirm_delete"), () =>
      deleteVendor(el.dataset.actionArg ?? ""),
    ),
  );
  on("exportVendorsCSV", () => exportVendorsCSV());
  on("filterVendorsByCategory", (el) =>
    filterVendorsByCategory(el.dataset.category ?? "all"),
  );
  on("openEditVendorModal", (el) => {
    openVendorForEdit(el.dataset.actionArg ?? "");
    openModal("vendorModal");
  });

  // ── Expenses ──
  on("saveExpense", (_el, _e) => {
    const getVal = (id) =>
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
    showConfirmDialog(t("confirm_delete"), () =>
      deleteExpense(el.dataset.actionArg ?? ""),
    ),
  );
  on("exportExpensesCSV", () => exportExpensesCSV());
  on("filterExpensesByCategory", (el) =>
    filterExpensesByCategory(el.dataset.category ?? "all"),
  );
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
    const current = /** @type {Record<string,unknown>} */ (
      storeGet("weddingInfo") ?? {}
    );
    storeSet("weddingInfo", { ...current, budgetTarget: val });
    renderBudgetProgress();
    showToast(t("settings_saved"), "success");
  });
  on("deleteBudgetEntry", (el) =>
    showConfirmDialog(t("confirm_delete"), () =>
      deleteBudgetEntry(el.dataset.actionArg ?? ""),
    ),
  );
  on("renderBudgetProgress", () => renderBudgetProgress());
  on("renderBudgetChart", () => renderBudgetChart());

  // ── Analytics exports (S8.4) ──
  on("exportAnalyticsPDF", () => exportAnalyticsPDF());
  on("exportAnalyticsCSV", () => exportAnalyticsCSV());
  on("exportMealPerTableCSV", () => exportMealPerTableCSV());
  on("printMealPerTable", () => printMealPerTable());
  on("renderSeatingMap", () => renderSeatingMap());
  on("exportEventSummary", () => exportEventSummary());
  on("printDietaryCards", () => printDietaryCards());

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
        /** @type {HTMLSelectElement|null} */ (
          document.getElementById("rsvpSide")
        )?.value ?? "mutual",
      status:
        /** @type {HTMLSelectElement|null} */ (
          document.getElementById("rsvpAttending")
        )?.value ?? "confirmed",
      count:
        /** @type {HTMLInputElement|null} */ (
          document.getElementById("rsvpGuests")
        )?.value ?? "1",
      children:
        /** @type {HTMLInputElement|null} */ (
          document.getElementById("rsvpChildren")
        )?.value ?? "0",
      meal:
        /** @type {HTMLSelectElement|null} */ (
          document.getElementById("rsvpMeal")
        )?.value ?? "regular",
      accessibility: /** @type {HTMLInputElement|null} */ (
        document.getElementById("rsvpAccessibility")
      )?.checked
        ? "true"
        : "",
      transport:
        /** @type {HTMLSelectElement|null} */ (
          document.getElementById("rsvpTransport")
        )?.value ?? "",
      notes:
        /** @type {HTMLTextAreaElement|null} */ (
          document.getElementById("rsvpNotes")
        )?.value?.trim() ?? "",
    };
    const result = submitRsvp(data);
    if (!result.ok)
      showToast(result.errors?.join(", ") ?? t("error_save"), "error");
  });
  on("lookupRsvpByPhone", (_el, e) => {
    const input = /** @type {HTMLInputElement|null} */ (
      e.target?.tagName === "INPUT" ? e.target : null
    );
    if (!input) return;
    const result = lookupRsvpByPhone(input.value);
    const statusEl = document.getElementById("rsvpLookupStatus");
    if (statusEl) {
      statusEl.classList.remove("u-hidden");
      statusEl.textContent = result.found
        ? t("rsvp_lookup_found")
        : t("rsvp_lookup_new");
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
    showConfirmDialog(t("confirm_delete"), () =>
      deleteGalleryPhoto(el.dataset.actionArg ?? ""),
    ),
  );
  on("openLightbox", (el) => openLightbox(el.dataset.actionArg ?? ""));

  // ── WhatsApp / Green API ──
  on("sendWhatsAppAll", (el) => sendWhatsAppAll(el.dataset.actionArg ?? "all"));
  on("sendWhatsAppAllViaApi", (el) =>
    sendWhatsAppAllViaApi(el.dataset.actionArg ?? "all"),
  );
  on("updateWaPreview", (_triggerEl, e) => {
    const input = /** @type {HTMLTextAreaElement|null} */ (
      e.target?.tagName === "TEXTAREA" ? e.target : null
    );
    updateWaPreview(input?.value ?? "");
  });
  on("checkGreenApiConnection", () => checkGreenApiConnection());
  on("sendWhatsAppReminder", () => sendWhatsAppReminder());
  on("sendThankYouMessages", () => {
    sendThankYouMessages();
    showToast(t("wa_thankyou_sent"), "success");
  });
  // S18.5 Unsent filter shortcut
  on("toggleUnsentFilter", () => {
    toggleUnsentFilter();
    renderUnsentBadge();
  });
  on("saveGreenApiConfig", (_el, e) => {
    const form = /** @type {HTMLFormElement|null} */ (
      /** @type {HTMLElement} */ (e.target).closest("form")
    );
    saveGreenApiConfig(form);
    showToast(t("settings_saved"), "success");
  });

  // ── Timeline ──
  on("saveTimelineItem", (_el, _e) => {
    const getVal = (id) =>
      /** @type {HTMLInputElement|null} */ (
        document.getElementById(id)
      )?.value?.trim() ?? "";
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
    showConfirmDialog(t("confirm_delete"), () =>
      deleteTimelineItem(el.dataset.actionArg ?? ""),
    ),
  );
  on("openEditTimelineModal", (el) => {
    openTimelineForEdit(el.dataset.actionArg ?? "");
    openModal("timelineModal");
  });

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
    closeModal();
    showToast(t("conflict_kept_local"), "info");
  });
  on("conflictAcceptAllRemote", () => {
    // Apply all pending remote values
    if (_pendingConflicts.length > 0) {
      _applyConflictResolutions(_pendingConflicts.map(() => "remote"));
    }
    closeModal();
  });
  on("conflictApplySelected", () => {
    const list = document.getElementById("conflictList");
    if (!list) return;
    const radios = list.querySelectorAll('input[type="radio"]:checked');
    const choices = /** @type {string[]} */ ([]);
    radios.forEach((r) => choices.push(/** @type {HTMLInputElement} */ (r).value));
    _applyConflictResolutions(choices);
    closeModal();
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
      await import("./services/supabase.js");
    const ok = await sbCheck();
    showToast(
      ok ? t("supabase_connected") : t("supabase_not_connected"),
      ok ? "success" : "error",
    );
  });

  // ── Settings / Misc ──
  on("saveTransportSettings", (_el, e) => {
    const form = /** @type {HTMLFormElement|null} */ (
      /** @type {HTMLElement} */ (e.target).closest("form")
    );
    saveTransportSettings(form);
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
    const current = load("lang", "he");
    await switchLanguage(current === "he" ? "en" : "he");
    showToast(t("language_switched"), "info");
  });
  on("toggleLanguage", async () => {
    const current = load("lang", "he");
    const next = current === "he" ? "en" : "he";
    await switchLanguage(next);
    const btn = document.getElementById("btnLang");
    if (btn) btn.textContent = next === "he" ? "EN" : "\u05E2\u05D1";
    showToast(t("language_switched"), "info");
  });
  on("clearAuditLog", () => clearAuditLog());
  on("clearErrorLog", () => clearErrorLog());
  on("exportJSON", () => exportJSON());
  on("importJSON", (el) => importJSON(el));
  on("startAutoBackup", () => {
    const interval = Number(document.getElementById("autoBackupInterval")?.value) || 30;
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
  on("printRsvpQr", () => window.print());
  on("printGuestCards", () => window.print());

  // ── Invitation detail form ──
  on("updateWeddingDetails", () => invitationSection.updateWeddingDetails?.());
  on("handleInvitationUpload", (_triggerEl, e) => {
    const input = /** @type {HTMLInputElement|null} */ (
      e.target?.tagName === "INPUT" ? e.target : null
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
  on("findTable", (_findTableEl) => {
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

// ── Status Bar ────────────────────────────────────────────────────────────

/** @type {string} */
let _gasVersion = "";

/**
 * Fetch the GAS version once (fire-and-forget) and update the status bar.
 */
async function _fetchGasVersion() {
  try {
    const url =
      load("sheetsWebAppUrl", "") ||
      (await import("./core/config.js")).SHEETS_WEBAPP_URL;
    if (!url) return;
    const resp = await fetch(/** @type {string} */ (url), { method: "GET", cache: "no-store" });
    if (!resp.ok) return;
    const data = await resp.json();
    _gasVersion = data?.version ?? "";
  } catch {
    _gasVersion = "";
  }
  _updateStatusBar(currentUser());
}

/**
 * Populate the footer status bar with app version, GAS version and user role.
 * @param {import('./services/auth.js').AuthUser | null} user
 */
function _updateStatusBar(user) {
  const verEl = document.getElementById("statusVersion");
  const gasEl = document.getElementById("statusGas");
  const roleEl = document.getElementById("statusRole");
  if (verEl) verEl.textContent = `v${APP_VERSION}`;
  if (gasEl) gasEl.textContent = _gasVersion ? `GAS v${_gasVersion}` : "";
  if (roleEl) {
    roleEl.textContent = user?.isAdmin
      ? `\u2705 ${t("role_admin")}`
      : `\uD83D\uDC64 ${t("role_guest") || "Guest"}`;
  }
}

// ── What's New popup ──────────────────────────────────────────────────────

/** Storage key for last-seen version */
const _LAST_SEEN_KEY = "wedding_v1_lastSeenVersion";

/**
 * Show What's New dialog if the user hasn't seen the current version.
 * Only shown for admin users.
 * @param {import('./services/auth.js').AuthUser | null} user
 */
function _maybeShowWhatsNew(user) {
  if (!user?.isAdmin) return;
  const lastSeen = localStorage.getItem(_LAST_SEEN_KEY) ?? "";
  if (lastSeen === APP_VERSION) return;

  // Build content from the latest changelog entries
  const items = [
    "\uD83D\uDCCA Budget sync to Google Sheets (two-way)",
    "\u2705 Check-in status synced to Sheets",
    "\uD83D\uDCF1 Richer WhatsApp templates (Hebrew + English)",
    "\uD83D\uDCCB Status bar with version & GAS info",
    "\uD83C\uDD95 What's New popup on login",
    "\uD83D\uDCC4 Changelog tab for all users",
  ];

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.style.cssText = "display:flex;z-index:10000;position:fixed;inset:0;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px)";
  const card = document.createElement("div");
  card.className = "card";
  card.style.cssText = "max-width:420px;width:90%;padding:1.5rem;max-height:80vh;overflow-y:auto";
  card.innerHTML = "";

  const title = document.createElement("h3");
  title.style.cssText = "margin:0 0 0.75rem;text-align:center";
  title.textContent = `\uD83C\uDD95 ${t("whats_new_title") || "What's New"} \u2014 v${APP_VERSION}`;
  card.appendChild(title);

  const list = document.createElement("ul");
  list.style.cssText = "padding-inline-start:1.2rem;margin:0 0 1rem;line-height:1.8";
  items.forEach((txt) => {
    const li = document.createElement("li");
    li.textContent = txt;
    list.appendChild(li);
  });
  card.appendChild(list);

  const btn = document.createElement("button");
  btn.className = "btn btn-primary";
  btn.style.cssText = "display:block;margin:0 auto";
  btn.textContent = t("whats_new_dismiss") || "Got it!";
  btn.addEventListener("click", () => {
    localStorage.setItem(_LAST_SEEN_KEY, APP_VERSION);
    overlay.remove();
  });
  card.appendChild(btn);
  overlay.appendChild(card);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      localStorage.setItem(_LAST_SEEN_KEY, APP_VERSION);
      overlay.remove();
    }
  });
  document.body.appendChild(overlay);
}

// ── Section lifecycle ─────────────────────────────────────────────────────

// Public-facing sections (no auth required)
const PUBLIC_SECTIONS = new Set([
  "rsvp",
  "landing",
  "contact-form",
  "registry",
  "guest-landing",
  "changelog",
]);

/**
 * Update nav visibility and user-bar chip based on current auth state.
 * Called during bootstrap and on every auth state change.
 * @param {import('./services/auth.js').AuthUser | null} user
 */
function _updateNavForAuth(user) {
  const isAdmin = user?.isAdmin ?? false;

  // Show/hide admin-only nav items
  document.querySelectorAll("[data-admin-only]").forEach((el) => {
    el.classList.toggle("u-hidden", !isAdmin);
  });

  // Update user-bar chip
  const btnSignIn = document.getElementById("btnSignIn");
  const btnSignOut = document.getElementById("btnSignOut");
  const userAvatar = /** @type {HTMLImageElement|null} */ (
    document.getElementById("userAvatar")
  );
  const userDisplayName = document.getElementById("userDisplayName");
  const userRoleBadge = document.getElementById("userRoleBadge");

  if (btnSignIn) btnSignIn.classList.toggle("u-hidden", isAdmin);
  if (btnSignOut) btnSignOut.classList.toggle("u-hidden", !isAdmin);
  if (userDisplayName)
    userDisplayName.textContent = isAdmin ? (user?.name ?? "") : "";
  if (userRoleBadge) userRoleBadge.textContent = isAdmin ? t("role_admin") : "";
  if (userAvatar) {
    const hasPic = isAdmin && !!user?.picture;
    userAvatar.classList.toggle("u-hidden", !hasPic);
    if (hasPic) userAvatar.src = user?.picture ?? "";
  }

  // Update footer status bar and show What's New on admin login
  _updateStatusBar(user);
  _maybeShowWhatsNew(user);
}

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
    btn.setAttribute("aria-selected", String(active));
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

  storeSet("activeSection", name);
}
