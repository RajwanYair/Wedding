/**
 * src/handlers/section-handlers.js — RSVP, gallery, WhatsApp, timeline,
 * invitation, contact-form, and landing action handlers
 */

import { on } from "../core/events.js";
import { t } from "../core/i18n.js";
import { showToast, openModal, closeModal, showConfirmDialog } from "../core/ui.js";
import { submitRsvp, lookupRsvpByPhone } from "../sections/rsvp.js";
import { handleGalleryUpload, deleteGalleryPhoto, openLightbox } from "../sections/gallery.js";
import {
  sendWhatsAppAll,
  sendWhatsAppAllViaApi,
  checkGreenApiConnection,
  saveGreenApiConfig,
  updateWaPreview,
  sendWhatsAppReminder,
} from "../sections/whatsapp.js";
import {
  saveTimelineItem,
  deleteTimelineItem,
  openTimelineForEdit,
  printTimeline,
  toggleTimelineDone,
} from "../sections/timeline.js";
import { setExpenseCategoryFilter } from "../sections/expenses.js";
import * as invitationSection from "../sections/invitation.js";
import * as contactSection from "../sections/contact-collector.js";
import * as landingSection from "../sections/landing.js";
import {
  toggleWorkspaceDropdown,
  selectWorkspace,
} from "../sections/workspace-switcher.js";
import {
  toggleNotifPanel,
  markAllNotifRead,
} from "../sections/notification-panel.js";
import {
  addItem as rosAddItem,
  resetDefault as rosResetDefault,
} from "../sections/run-of-show.js";
import { buildPreviewHtml, executePrint } from "../services/export.js";

/**
 * Register section-level `data-action` handlers (navigation, modals, etc).
 * Idempotent — call once at app boot.
 */
export function register() {
  // ── RSVP ──
  on("submitRSVP", (_el, e) => {
    e.preventDefault();
    const g = (/** @type {string} */ id) =>
      /** @type {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement|null} */ (
        document.getElementById(id)
      );
    const data = {
      phone: /** @type {HTMLInputElement} */ (g("rsvpPhone"))?.value?.trim() ?? "",
      firstName: /** @type {HTMLInputElement} */ (g("rsvpFirstName"))?.value?.trim() ?? "",
      lastName: /** @type {HTMLInputElement} */ (g("rsvpLastName"))?.value?.trim() ?? "",
      side: /** @type {HTMLSelectElement} */ (g("rsvpSide"))?.value ?? "mutual",
      status: /** @type {HTMLSelectElement} */ (g("rsvpAttending"))?.value ?? "confirmed",
      count: /** @type {HTMLInputElement} */ (g("rsvpGuests"))?.value ?? "1",
      children: /** @type {HTMLInputElement} */ (g("rsvpChildren"))?.value ?? "0",
      meal: /** @type {HTMLSelectElement} */ (g("rsvpMeal"))?.value ?? "regular",
      accessibility: /** @type {HTMLInputElement} */ (g("rsvpAccessibility"))?.checked
        ? "true"
        : "",
      transport: /** @type {HTMLSelectElement} */ (g("rsvpTransport"))?.value ?? "",
      notes: /** @type {HTMLTextAreaElement} */ (g("rsvpNotes"))?.value?.trim() ?? "",
    };
    const result = submitRsvp(data);
    if (!result.ok) showToast(result.errors?.join(", ") ?? t("error_save"), "error");
  });
  on("lookupRsvpByPhone", (_el, e) => {
    const input = e.target instanceof HTMLInputElement ? e.target : null;
    if (!input) return;
    const result = lookupRsvpByPhone(input.value);
    const statusEl = document.getElementById("rsvpLookupStatus");
    if (statusEl) {
      statusEl.classList.remove("u-hidden");
      statusEl.textContent = result.found ? t("rsvp_lookup_found") : t("rsvp_lookup_new");
    }
    if (!result.found && input.value.replace(/\D/g, "").length >= 9) {
      const details = document.getElementById("rsvpDetails");
      if (details) details.classList.remove("u-hidden");
    }
  });

  // ── Gallery ──
  on("handleGalleryUpload", (triggerEl) => {
    handleGalleryUpload(/** @type {HTMLInputElement} */ (triggerEl));
  });
  on("deleteGalleryPhoto", (el) =>
    showConfirmDialog(t("confirm_delete"), () => deleteGalleryPhoto(el.dataset.actionArg ?? "")),
  );
  on("openLightbox", (el) => openLightbox(el.dataset.actionArg ?? ""));
  on("closeGalleryLightbox", () => {
    closeModal("galleryLightbox");
  });

  // ── WhatsApp / Green API ──
  on("sendWhatsAppAll", (el) => sendWhatsAppAll(el.dataset.actionArg ?? "all"));
  on("sendWhatsAppAllViaApi", (el) => sendWhatsAppAllViaApi(el.dataset.actionArg ?? "all"));
  on("updateWaPreview", (_el, e) => {
    const input = e.target instanceof HTMLTextAreaElement ? e.target : null;
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
  on("saveTimelineItem", () => {
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
  on("toggleTimelineDone", (el) => toggleTimelineDone(el.dataset.actionArg ?? ""));
  on("setExpenseCategoryFilter", (el) => setExpenseCategoryFilter(el.dataset.actionArg ?? "all"));

  // ── Invitation ──
  on("updateWeddingDetails", () => invitationSection.updateWeddingDetails?.());
  on("handleInvitationUpload", (_el, e) => {
    const input = e.target instanceof HTMLInputElement ? e.target : null;
    if (input) invitationSection.handleInvitationUpload?.(input);
  });

  // ── Contact form ──
  on("submitContactForm", () => {
    const g = (/** @type {string} */ id) =>
      /** @type {HTMLInputElement|HTMLSelectElement|null} */ (document.getElementById(id));
    const data = {
      firstName: /** @type {HTMLInputElement} */ (g("ccFirstName"))?.value?.trim() ?? "",
      lastName: /** @type {HTMLInputElement} */ (g("ccLastName"))?.value?.trim() ?? "",
      phone: /** @type {HTMLInputElement} */ (g("ccPhone"))?.value?.trim() ?? "",
      email: /** @type {HTMLInputElement} */ (g("ccEmail"))?.value?.trim() ?? "",
      side: /** @type {HTMLSelectElement} */ (g("ccSide"))?.value ?? "mutual",
      dietaryNotes: "",
    };
    const result = contactSection.submitContactForm(data);
    if (!result.ok) showToast(result.errors?.join(", ") ?? t("error_save"), "error");
    else showToast(t("contact_sent"), "success");
  });
  on("exportContactsCSV", () => contactSection.exportContactsCSV());

  // ── Landing table finder ──
  on("findTable", () => {
    const input =
      /** @type {HTMLInputElement|null} */ (document.getElementById("tablefinderInput")) ??
      /** @type {HTMLInputElement|null} */ (document.getElementById("findTableInput"));
    landingSection.showTableFinder(input?.value?.trim() ?? "");
  });

  // ── Workspace switcher (S140) ──
  on("toggleWorkspaceDropdown", () => toggleWorkspaceDropdown());
  on("selectWorkspace", (_el) => {
    const id = _el?.getAttribute?.("data-action-arg") ?? "";
    selectWorkspace(id);
  });

  // ── Notification centre (S143) ──
  on("toggleNotifPanel", () => toggleNotifPanel());
  on("markAllNotifRead", () => markAllNotifRead());

  // ── Run-of-show editor (S144) ──
  on("rosAddItem", () => rosAddItem());
  on("rosResetDefault", () => rosResetDefault());

  // ── Print preview modal (S149 / S204) ──
  on("openPrintPreview", () => {
    openModal("printPreviewModal");
    // Auto-render first section after modal DOM is injected.
    requestAnimationFrame(() => {
      const sel = /** @type {HTMLSelectElement|null} */ (
        document.getElementById("printSectionSelect")
      );
      const pane = document.getElementById("printPreviewPane");
      if (sel && pane) pane.innerHTML = buildPreviewHtml(sel.value);
    });
  });
  on("previewPrintSection", () => {
    const sel = /** @type {HTMLSelectElement|null} */ (
      document.getElementById("printSectionSelect")
    );
    const pane = document.getElementById("printPreviewPane");
    if (sel && pane) pane.innerHTML = buildPreviewHtml(sel.value);
  });
  on("executePrint", () => {
    const sel = /** @type {HTMLSelectElement|null} */ (
      document.getElementById("printSectionSelect")
    );
    if (sel) executePrint(sel.value);
  });
}
