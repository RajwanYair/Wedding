/**
 * @module handlers/table-handlers
 * @description Table/seating domain action handlers.
 *
 * Contract: register() → on(actionName, callback) → section function → repository.
 * Each handler reads DOM state, delegates to a section/service function,
 * then shows user feedback (toast/modal/vibrate).
 *
 * @owner tables
 */

import { on } from "../core/events.js";
import { t } from "../core/i18n.js";
import { showToast, openModal, closeModal, showConfirmDialog } from "../core/ui.js";
import {
  saveTable,
  deleteTable,
  autoAssignTables,
  printSeatingChart,
  printPlaceCards,
  printTableSigns,
  printQrTableCards,
  openTableForEdit,
  exportTransportCSV,
  printTransportManifest,
  exportSeatMapCsv,
  exportSeatMapJson,
} from "../sections/tables.js";

/**
 * Register `data-action` handlers for the seating/tables section.
 * Idempotent — call once at app boot.
 * @returns {void}
 */
export function register() {
  on("saveTable", () => {
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
  // S422: QR table cards
  on("printQrTableCards", () => printQrTableCards());
  on("exportTransportCSV", () => exportTransportCSV());
  on("printTransportManifest", () => printTransportManifest());
  on("exportSeatMapCsv", () => exportSeatMapCsv());
  on("exportSeatMapJson", () => exportSeatMapJson());
  on("printTableLayout", () =>
    import("../utils/pdf-export.js").then(({ printTableLayout }) => printTableLayout()),
  );
  on("deleteTable", (el) =>
    showConfirmDialog(t("confirm_delete"), () => deleteTable(el.dataset.actionArg ?? "")),
  );
  on("openEditTableModal", (el) => {
    openTableForEdit(el.dataset.actionArg ?? "");
    openModal("tableModal");
  });
}
