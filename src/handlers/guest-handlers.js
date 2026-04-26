/**
 * src/handlers/guest-handlers.js — Guest domain action handlers
 */

import { on } from "../core/events.js";
import { t } from "../core/i18n.js";
import { showToast, openModal, closeModal, showConfirmDialog } from "../core/ui.js";
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
} from "../sections/guests.js";

export function register() {
  on("saveGuest", () => {
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
  on("searchGuests", (_el, e) => {
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
}
