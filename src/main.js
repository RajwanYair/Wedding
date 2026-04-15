/**
 * src/main.js — ES module entry point (S0.10 / S0.11)
 *
 * Full ESM bootstrap. Registers ALL data-action event handlers and wires
 * the 18 section modules with mount/unmount lifecycle + lazy template loading.
 * No window.* side effects — this is the v3 entry point.
 */

// ── Foundation layer ──────────────────────────────────────────────────────
import { initStore, storeGet, storeSet } from "./core/store.js";
import { initEvents, on } from "./core/events.js";
import { loadLocale, applyI18n, t } from "./core/i18n.js";
import { load } from "./core/state.js";
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
import {
  syncSheetsNow,
  sheetsCheckConnection,
  createMissingSheetTabs,
  onSyncStatus,
  initOnlineSync,
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
} from "./sections/guests.js";
import {
  saveTable,
  deleteTable,
  autoAssignTables,
  printSeatingChart,
  printPlaceCards,
  printTableSigns,
  openTableForEdit,
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
} from "./sections/checkin.js";
import { renderBudgetChart } from "./sections/analytics.js";
import { submitRsvp, lookupRsvpByPhone } from "./sections/rsvp.js";
import {
  sendWhatsAppAll,
  sendWhatsAppAllViaApi,
  checkGreenApiConnection,
  saveGreenApiConfig,
  updateWaPreview,
} from "./sections/whatsapp.js";
import {
  handleGalleryUpload,
  deleteGalleryPhoto,
  openLightbox,
} from "./sections/gallery.js";
import {
  saveTimelineItem,
  deleteTimelineItem,
  openTimelineForEdit,
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
};

/** @type {string|null} currently mounted section name */
let _activeSection = null;

// ── Bootstrap ─────────────────────────────────────────────────────────────
(async function bootstrap() {
  // 1. Language
  const lang = load("lang", "he") === "en" ? "en" : "he";
  await loadLocale(lang);

  // 2. Apply i18n bindings
  applyI18n();

  // 3. Reactive store — seed with persisted data from localStorage
  /** @type {Record<string,string>} */
  const _defaultWeddingInfo = {
    groom: "אליאור",
    bride: "טובה",
    date: "2026-05-07",
    time: "18:00",
    venue: "נוף הירדן",
    venueAddress: "מצפה יריחו",
  };
  const savedInfo = /** @type {Record<string,string>} */ (
    load("weddingInfo", {})
  );
  const weddingInfo = { ..._defaultWeddingInfo, ...savedInfo };

  initStore({
    guests: { value: load("guests", []), storageKey: "guests" },
    tables: { value: load("tables", []), storageKey: "tables" },
    vendors: { value: load("vendors", []), storageKey: "vendors" },
    expenses: { value: load("expenses", []), storageKey: "expenses" },
    weddingInfo: { value: weddingInfo, storageKey: "weddingInfo" },
    gallery: { value: load("gallery", []), storageKey: "gallery" },
    timeline: { value: load("timeline", []), storageKey: "timeline" },
    contacts: { value: load("contacts", []), storageKey: "contacts" },
    budget: { value: load("budget", []), storageKey: "budget" },
  });

  // 4. Theme restore (before paint to avoid flash)
  restoreTheme();

  // 4a. Populate shared header with wedding info for all users (including guests)
  dashboardSection.updateTopBar();
  dashboardSection.updateCountdown();

  // 5. Auth — restore session or sign in anonymously
  onAuthChange(_updateNavForAuth); // register BEFORE any login call
  const user = loadSession();
  if (!user) loginAnonymous(); // fires onAuthChange immediately

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

  // 11d. Service Worker — update detection + refresh banner
  initSW();
})();

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

  // ── Auth ──
  on("submitEmailLogin", (_el, e) => {
    const form = /** @type {HTMLFormElement|null} */ (
      /** @type {HTMLElement} */ (e.target).closest("form") ??
        document.getElementById("emailLoginForm")
    );
    const email =
      /** @type {HTMLInputElement|null} */ (
        form?.querySelector("[name='email'], #authEmailInput, #adminLoginEmail")
      )?.value?.trim() ?? "";
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
    openGuestForEdit(el.dataset.actionArg ?? "");
    openModal("guestModal");
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
  on("printSeatingChart", () => printSeatingChart());
  on("printPlaceCards", () => printPlaceCards());
  on("printTableSigns", () => printTableSigns());
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

// ── Section lifecycle ─────────────────────────────────────────────────────

// Public-facing sections (no auth required)
const PUBLIC_SECTIONS = new Set([
  "rsvp",
  "landing",
  "contact-form",
  "registry",
  "guest-landing",
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
  storeSet("activeSection", name);
}
