/**
 * tests/unit/table-handlers.test.mjs — Sprint 193 + Sprint 2 (session)
 *
 * Expanded: tests now invoke handler callbacks to verify behavior.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/core/events.js", () => ({ on: vi.fn() }));
vi.mock("../../src/core/ui.js", () => ({
  showToast: vi.fn(), openModal: vi.fn(), closeModal: vi.fn(), showConfirmDialog: vi.fn(),
}));
vi.mock("../../src/core/i18n.js", () => ({ t: vi.fn((k) => k) }));
vi.mock("../../src/utils/form-helpers.js", () => ({ getVal: vi.fn(() => "") }));
vi.mock("../../src/sections/tables.js", () => ({
  saveTable: vi.fn(),
  deleteTable: vi.fn(),
  autoAssignTables: vi.fn(),
  renderTables: vi.fn(),
  printSeatingChart: vi.fn(),
  printPlaceCards: vi.fn(),
  printTableSigns: vi.fn(),
  openTableForEdit: vi.fn(),
  exportTransportCSV: vi.fn(),
  printTransportManifest: vi.fn(),
  smartAutoAssign: vi.fn().mockReturnValue(5),
  exportTableCSV: vi.fn(),
}));
vi.mock("../../src/sections/checkin.js", () => ({
  checkInGuest: vi.fn(),
  setCheckinSearch: vi.fn(),
  exportCheckinReport: vi.fn(),
  exportGiftsCSV: vi.fn(),
  resetAllCheckins: vi.fn(),
  toggleGiftMode: vi.fn(),
  startQrScan: vi.fn(),
  stopQrScan: vi.fn(),
  checkInByTable: vi.fn(),
  toggleAccessibilityFilter: vi.fn(),
}));

import { registerTableHandlers } from "../../src/handlers/table-handlers.js";
import { on } from "../../src/core/events.js";
import { showToast, closeModal, showConfirmDialog } from "../../src/core/ui.js";
import {
  saveTable, deleteTable, autoAssignTables, printSeatingChart,
  printPlaceCards, printTableSigns, exportTransportCSV, exportTableCSV,
  printTransportManifest, smartAutoAssign, renderTables,
} from "../../src/sections/tables.js";
import {
  checkInGuest, exportCheckinReport, exportGiftsCSV, resetAllCheckins,
  toggleGiftMode, startQrScan, stopQrScan, toggleAccessibilityFilter,
} from "../../src/sections/checkin.js";

function getHandler(action) {
  const call = vi.mocked(on).mock.calls.find(([a]) => a === action);
  if (!call) throw new Error(`No handler for "${action}"`);
  return call[1];
}

describe("registerTableHandlers — registration", () => {
  beforeEach(() => { vi.mocked(on).mockClear(); });

  it("is a function", () => { expect(typeof registerTableHandlers).toBe("function"); });
  it("registers handlers via on()", () => {
    registerTableHandlers();
    expect(vi.mocked(on).mock.calls.length).toBeGreaterThan(0);
  });
  it("does not throw", () => { expect(() => registerTableHandlers()).not.toThrow(); });
  it("registers saveTable handler", () => {
    registerTableHandlers();
    expect(vi.mocked(on).mock.calls.map((c) => c[0])).toContain("saveTable");
  });
  it("registers checkInGuest handler", () => {
    registerTableHandlers();
    expect(vi.mocked(on).mock.calls.map((c) => c[0])).toContain("checkInGuest");
  });
});

describe("registerTableHandlers — handler behavior", () => {
  beforeEach(() => {
    vi.mocked(on).mockClear();
    vi.mocked(saveTable).mockReset().mockReturnValue({ ok: true });
    vi.mocked(showToast).mockReset();
    vi.mocked(closeModal).mockReset();
    vi.mocked(showConfirmDialog).mockReset();
    registerTableHandlers();
  });

  it("saveTable handler calls saveTable() with form data", () => {
    getHandler("saveTable")();
    expect(saveTable).toHaveBeenCalled();
  });

  it("saveTable handler closes modal and shows success toast on ok", () => {
    getHandler("saveTable")();
    expect(closeModal).toHaveBeenCalledWith("tableModal");
    expect(showToast).toHaveBeenCalledWith(expect.anything(), "success");
  });

  it("saveTable handler shows error toast on failure", () => {
    vi.mocked(saveTable).mockReturnValue({ ok: false, errors: ["Name required"] });
    getHandler("saveTable")();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining("Name required"), "error");
  });

  it("autoAssignTables handler calls autoAssignTables()", () => {
    getHandler("autoAssignTables")();
    expect(autoAssignTables).toHaveBeenCalledOnce();
  });

  it("smartAutoAssign handler calls smartAutoAssign and shows toast", () => {
    vi.mocked(smartAutoAssign).mockReturnValue(3);
    getHandler("smartAutoAssign")();
    expect(smartAutoAssign).toHaveBeenCalledOnce();
    expect(showToast).toHaveBeenCalledWith(expect.anything(), "success");
    expect(renderTables).toHaveBeenCalledOnce();
  });

  it("printSeatingChart handler calls printSeatingChart()", () => {
    getHandler("printSeatingChart")();
    expect(printSeatingChart).toHaveBeenCalledOnce();
  });

  it("printPlaceCards handler calls printPlaceCards()", () => {
    getHandler("printPlaceCards")();
    expect(printPlaceCards).toHaveBeenCalledOnce();
  });

  it("printTableSigns handler calls printTableSigns()", () => {
    getHandler("printTableSigns")();
    expect(printTableSigns).toHaveBeenCalledOnce();
  });

  it("exportTransportCSV handler calls exportTransportCSV()", () => {
    getHandler("exportTransportCSV")();
    expect(exportTransportCSV).toHaveBeenCalledOnce();
  });

  it("exportTableCSV handler passes actionArg to exportTableCSV()", () => {
    const el = { dataset: { actionArg: "t1" } };
    getHandler("exportTableCSV")(el);
    expect(exportTableCSV).toHaveBeenCalledWith("t1");
  });

  it("printTransportManifest handler calls printTransportManifest()", () => {
    getHandler("printTransportManifest")();
    expect(printTransportManifest).toHaveBeenCalledOnce();
  });

  it("deleteTable handler calls showConfirmDialog", () => {
    const el = { dataset: { actionArg: "t1" } };
    getHandler("deleteTable")(el);
    expect(showConfirmDialog).toHaveBeenCalled();
  });

  it("deleteTable handler calls deleteTable() after confirm", () => {
    vi.mocked(showConfirmDialog).mockImplementation((_msg, cb) => cb());
    const el = { dataset: { actionArg: "t1" } };
    getHandler("deleteTable")(el);
    expect(deleteTable).toHaveBeenCalledWith("t1");
  });

  it("checkInGuest handler passes actionArg to checkInGuest()", () => {
    const el = { dataset: { actionArg: "g1" } };
    getHandler("checkInGuest")(el);
    expect(checkInGuest).toHaveBeenCalledWith("g1");
  });

  it("exportCheckinReport handler calls exportCheckinReport()", () => {
    getHandler("exportCheckinReport")();
    expect(exportCheckinReport).toHaveBeenCalledOnce();
  });

  it("exportGiftsCSV handler calls exportGiftsCSV()", () => {
    getHandler("exportGiftsCSV")();
    expect(exportGiftsCSV).toHaveBeenCalledOnce();
  });

  it("toggleGiftMode handler calls toggleGiftMode()", () => {
    getHandler("toggleGiftMode")();
    expect(toggleGiftMode).toHaveBeenCalledOnce();
  });

  it("startQrScan handler calls startQrScan()", () => {
    getHandler("startQrScan")();
    expect(startQrScan).toHaveBeenCalledOnce();
  });

  it("stopQrScan handler calls stopQrScan()", () => {
    getHandler("stopQrScan")();
    expect(stopQrScan).toHaveBeenCalledOnce();
  });

  it("toggleAccessibilityFilter handler calls toggleAccessibilityFilter()", () => {
    getHandler("toggleAccessibilityFilter")();
    expect(toggleAccessibilityFilter).toHaveBeenCalledOnce();
  });
});
