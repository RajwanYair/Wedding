/**
 * src/handlers/table-handlers.js — Table + Check-in event handler registrations (F1.1)
 *
 * Extracted from main.js _registerHandlers().
 */

import { on } from "../core/events.js";
import { showToast, openModal, closeModal, showConfirmDialog } from "../core/ui.js";
import { t } from "../core/i18n.js";
import { getVal } from "../utils/form-helpers.js";
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
  exportTableCSV,
} from "../sections/tables.js";
import {
  checkInGuest,
  setCheckinSearch,
  exportCheckinReport,
  exportGiftsCSV,
  resetAllCheckins,
  toggleGiftMode,
  startQrScan,
  stopQrScan,
  checkInByTable,
  toggleAccessibilityFilter,
} from "../sections/checkin.js";

/**
 * Register all table + check-in event handlers.
 */
export function registerTableHandlers() {
  on("saveTable", () => {
    const data = {
      name: getVal("tableName"),
      capacity: getVal("tableCapacity") || "10",
      shape: getVal("tableShape") || "round",
      notes: getVal("tableNotes") || "",
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
  on("printTablePlaceCards", (el) =>
    printPlaceCards(el.dataset.actionArg ?? ""),
  );
  on("exportTransportCSV", () => exportTransportCSV());
  on("exportTableCSV", (el) => exportTableCSV(el.dataset.actionArg ?? ""));
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
      (/** @type {HTMLElement|null} */ (e.target))?.tagName === "INPUT" ? e.target : null
    );
    setCheckinSearch(input?.value ?? "");
  });
  on("exportCheckinReport", () => exportCheckinReport());
  on("exportGiftsCSV", () => exportGiftsCSV());
  on("resetAllCheckins", () =>
    showConfirmDialog(t("confirm_reset_checkins"), () => resetAllCheckins()),
  );
  on("toggleGiftMode", () => toggleGiftMode());
  on("startQrScan", () => startQrScan());
  on("stopQrScan", () => stopQrScan());
  on("checkInByTable", (el) => {
    const tableId = el.dataset.actionArg ?? "";
    checkInByTable(tableId);
    showToast(t("checkin_table_all"), "success");
  });
  on("toggleAccessibilityFilter", () => toggleAccessibilityFilter());
}
