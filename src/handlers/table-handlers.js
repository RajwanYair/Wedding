/**
 * src/handlers/table-handlers.js — Table domain action handlers
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
  openTableForEdit,
  exportTransportCSV,
  printTransportManifest,
} from "../sections/tables.js";

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
  on("exportTransportCSV", () => exportTransportCSV());
  on("printTransportManifest", () => printTransportManifest());
  on("deleteTable", (el) =>
    showConfirmDialog(t("confirm_delete"), () => deleteTable(el.dataset.actionArg ?? "")),
  );
  on("openEditTableModal", (el) => {
    openTableForEdit(el.dataset.actionArg ?? "");
    openModal("tableModal");
  });
}
