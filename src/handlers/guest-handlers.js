/**
 * src/handlers/guest-handlers.js — Guest event handler registrations (F1.1)
 *
 * Extracted from main.js _registerHandlers() to reduce god-module size.
 */

import { on } from "../core/events.js";
import { storeGet } from "../core/store.js";
import { showToast, openModal, closeModal, showConfirmDialog } from "../core/ui.js";
import { t } from "../core/i18n.js";
import { getVal } from "../utils/form-helpers.js";
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
  batchMarkUnsent,
  renderDuplicates,
  mergeGuests,
  addGuestNote,
  renderGuestHistory,
  setMultiFilter,
  addGuestTag,
  removeGuestTag,
  toggleGuestVip,
  toggleVipFilter,
  printGuestBadges,
  printGuestsByTable,  exportGuestsByGroup,} from "../sections/guests.js";

/**
 * Register all guest-related event handlers.
 */
export function registerGuestHandlers() {
  on("saveGuest", () => {
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
      rsvpSource: getVal("guestRsvpSource") || "manual",
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
      /** @type {HTMLElement|null} */ (e.target)?.tagName === "INPUT"
        ? e.target
        : null
    );
    setSearchQuery(input?.value ?? "");
  });

  on("openEditGuestModal", (el) => {
    const gid = el.dataset.actionArg ?? "";
    openGuestForEdit(gid);
    openModal("guestModal");
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

  on("toggleGuestVip", (actionEl) =>
    toggleGuestVip(actionEl.dataset.actionArg ?? ""),
  );
  on("toggleVipFilter", () => toggleVipFilter());

  on("toggleGuestNotes", (actionEl) => {
    const guestId = actionEl.dataset.actionArg ?? "";
    const tr = actionEl.closest("tr");
    const existingRow = document.getElementById(`notes-row-${guestId}`);
    if (existingRow) {
      existingRow.remove();
      return;
    }
    const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
    const g = guests.find((gst) => gst.id === guestId);
    if (!g?.notes) return;
    const notesRow = document.createElement("tr");
    notesRow.id = `notes-row-${guestId}`;
    notesRow.className = "guest-notes-row";
    const td = document.createElement("td");
    td.colSpan = 11;
    td.className = "guest-notes-cell";
    td.textContent = g.notes;
    notesRow.appendChild(td);
    if (tr) tr.after(notesRow);
  });

  on("batchMarkUnsent", () => {
    batchMarkUnsent();
    showToast(t("batch_success"), "success");
  });

  on("printGuestBadges", () => printGuestBadges());
  on("printGuestsByTable", () => printGuestsByTable());
  on("scanDuplicates", () => renderDuplicates());

  on("mergeGuests", (el) => {
    mergeGuests(el.dataset.keepId ?? "", el.dataset.mergeId ?? "");
    showToast(t("merge_success") || "Merged", "success");
    renderDuplicates();
  });

  on("addGuestNote", () => {
    const guestId = /** @type {HTMLInputElement|null} */ (
      document.getElementById("guestModalId")
    )?.value;
    const noteInput = /** @type {HTMLInputElement|null} */ (
      document.getElementById("guestNoteInput")
    );
    if (!guestId || !noteInput?.value?.trim()) return;
    addGuestNote(guestId, noteInput.value);
    noteInput.value = "";
    renderGuestHistory(guestId);
    showToast(t("guest_note_added"), "success");
  });

  on("setMultiFilter", (el) => {
    const field = el.dataset.filterField ?? "";
    const value = /** @type {HTMLSelectElement} */ (el).value ?? "all";
    setMultiFilter(field, value);
  });

  on("addGuestTag", () => {
    const guestId = /** @type {HTMLInputElement|null} */ (
      document.getElementById("guestModalId")
    )?.value;
    const tagInput = /** @type {HTMLInputElement|null} */ (
      document.getElementById("guestTagInput")
    );
    if (!guestId || !tagInput?.value?.trim()) return;
    addGuestTag(guestId, tagInput.value);
    tagInput.value = "";
    showToast(t("tag_added"), "success");
  });

  on("removeGuestTag", (el) => {
    const guestId = /** @type {HTMLInputElement|null} */ (
      document.getElementById("guestModalId")
    )?.value;
    if (!guestId) return;
    removeGuestTag(guestId, el.dataset.tag ?? "");
  });

  // Sprint 7: Export by group
  on("exportGuestsByGroup", (el) =>
    exportGuestsByGroup(el.dataset.actionArg ?? "all"),
  );
}
