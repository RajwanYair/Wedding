/**
 * src/main.js — ES module entry point (S0.10 / S0.11)
 *
 * Full ESM bootstrap. Registers ALL data-action event handlers and wires
 * the 18 section modules with mount/unmount lifecycle + lazy template loading.
 * No window.* side effects — this is the v3 entry point.
 */

// ── Foundation layer ──────────────────────────────────────────────────────
import { APP_VERSION } from "./core/config.js";
import { PUBLIC_SECTIONS } from "./core/constants.js";
import { initStore, reinitStore, storeGet, storeSet } from "./core/store.js";
import { initEvents, on } from "./core/events.js";
import { loadLocale, applyI18n, t } from "./core/i18n.js";
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

// ── Extracted handler modules ─────────────────────────────────────────────
import { registerGuestHandlers } from "./handlers/guest-handlers.js";
import { registerTableHandlers } from "./handlers/table-handlers.js";
import { registerVendorHandlers } from "./handlers/vendor-handlers.js";
import { registerSectionHandlers } from "./handlers/section-handlers.js";
import { registerSettingsHandlers } from "./handlers/settings-handlers.js";

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

// ── Named imports for event handlers ─────────────────────────────────────
// Handler-specific imports moved to src/handlers/*.js
import { popUndo } from "./utils/undo.js";
import { startTimelineAlarms } from "./sections/timeline.js";
import { initQueueMonitor } from "./sections/settings.js";

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
    timelineDone: { value: load("timelineDone", {}), storageKey: "timelineDone" },
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
        groomEn: "Elior",
        brideEn: "Tova",
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

    // S25.1 — Animate the top-bar sync button
    const btn = document.getElementById("topBarSyncBtn");
    if (btn) {
      btn.classList.toggle("sync-btn--spinning", status === "syncing");
      btn.title = labels[status] || t("sync_now") || "Sync Now";
    }
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

  // ── Sync ──
  on("syncSheetsNow", async () => {
    try {
      await syncSheetsNow();
      showToast(t("synced"), "success");
    } catch (_err) {
      showToast(t("error_save"), "error");
    }
  });

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

  // ── Guests (extracted to src/handlers/guest-handlers.js) ──
  registerGuestHandlers();

  // ── Tables + Check-in (extracted to src/handlers/table-handlers.js) ──
  registerTableHandlers();

  // ── Vendors + Expenses (extracted to src/handlers/vendor-handlers.js) ──
  registerVendorHandlers();

  // ── Budget + Analytics + RSVP + Gallery + WhatsApp + Timeline ──
  registerSectionHandlers();

  // ── Settings + Sheets + Misc ──
  registerSettingsHandlers({
    pendingConflicts: () => _pendingConflicts,
    applyConflictResolutions: _applyConflictResolutions,
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
// PUBLIC_SECTIONS imported from src/core/constants.js

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
