/**
 * src/handlers/section-handlers.js — Budget · Analytics · RSVP · Gallery ·
 * WhatsApp · Timeline event handler registrations (F1.1)
 *
 * Extracted from main.js _registerHandlers().
 */

import { on } from "../core/events.js";
import { storeGet, storeSet } from "../core/store.js";
import { showToast, openModal, closeModal, showConfirmDialog } from "../core/ui.js";
import { t } from "../core/i18n.js";
import { getVal } from "../utils/form-helpers.js";
import { deleteBudgetEntry, renderBudgetProgress } from "../sections/budget.js";
import {
  renderBudgetChart,
  exportAnalyticsPDF,
  exportAnalyticsCSV,
  exportMealPerTableCSV,
  printMealPerTable,
  renderSeatingMap,
  exportEventSummary,
  printDietaryCards,
} from "../sections/analytics.js";
import { submitRsvp, lookupRsvpByPhone } from "../sections/rsvp.js";
import {
  handleGalleryUpload,
  deleteGalleryPhoto,
  openLightbox,
} from "../sections/gallery.js";
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
  toggleDeclinedFilter,
  downloadCalendarInvite,
} from "../sections/whatsapp.js";
import {
  saveTimelineItem,
  deleteTimelineItem,
  openTimelineForEdit,
  printTimeline,
  toggleTimelineDone,
} from "../sections/timeline.js";

/**
 * Register budget, analytics, RSVP, gallery, WhatsApp and timeline handlers.
 */
export function registerSectionHandlers() {
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

  // ── Analytics (S8.4) ──
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
      phone: getVal("rsvpPhone"),
      firstName: getVal("rsvpFirstName"),
      lastName: getVal("rsvpLastName"),
      side: getVal("rsvpSide") || "mutual",
      status: getVal("rsvpAttending") || "confirmed",
      count: getVal("rsvpGuests") || "1",
      children: getVal("rsvpChildren") || "0",
      meal: getVal("rsvpMeal") || "regular",
      accessibility: getVal("rsvpAccessibility"),
      transport: getVal("rsvpTransport"),
      notes: getVal("rsvpNotes"),
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
  on("toggleUnsentFilter", () => {
    toggleUnsentFilter();
    renderUnsentBadge();
  });
  on("toggleDeclinedFilter", () => toggleDeclinedFilter());
  on("downloadCalendarInvite", () => downloadCalendarInvite());
  on("saveGreenApiConfig", (_el, e) => {
    const form = /** @type {HTMLFormElement|null} */ (
      /** @type {HTMLElement} */ (e.target).closest("form")
    );
    saveGreenApiConfig(form);
    showToast(t("settings_saved"), "success");
  });

  // ── Timeline ──
  on("saveTimelineItem", () => {
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
  on("printTimeline", () => printTimeline());
  on("toggleTimelineDone", (el) =>
    toggleTimelineDone(el.dataset.actionArg ?? ""),
  );
}
