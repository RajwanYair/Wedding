/**
 * tests/unit/guest-handlers.test.mjs — Sprint 191 + Sprint 1 (session)
 *
 * Expanded: tests now invoke handler callbacks to verify behavior.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/core/events.js", () => ({ on: vi.fn() }));
vi.mock("../../src/core/store.js", () => ({ storeGet: vi.fn(() => []) }));
vi.mock("../../src/core/ui.js", () => ({
  showToast: vi.fn(),
  openModal: vi.fn(),
  closeModal: vi.fn(),
  showConfirmDialog: vi.fn(),
}));
vi.mock("../../src/core/i18n.js", () => ({ t: vi.fn((k) => k) }));
vi.mock("../../src/utils/form-helpers.js", () => ({ getVal: vi.fn(() => "") }));
vi.mock("../../src/sections/guests.js", () => ({
  saveGuest: vi.fn(),
  deleteGuest: vi.fn(),
  setFilter: vi.fn(),
  setSideFilter: vi.fn(),
  setSortField: vi.fn(),
  setSearchQuery: vi.fn(),
  exportGuestsCSV: vi.fn(),
  printGuests: vi.fn(),
  downloadCSVTemplate: vi.fn(),
  importGuestsCSV: vi.fn(),
  openGuestForEdit: vi.fn(),
  toggleSelectAll: vi.fn(),
  batchSetStatus: vi.fn(),
  batchDeleteGuests: vi.fn(),
  batchSetMeal: vi.fn(),
  batchMarkUnsent: vi.fn(),
  renderDuplicates: vi.fn(),
  mergeGuests: vi.fn(),
  addGuestNote: vi.fn(),
  renderGuestHistory: vi.fn(),
  setMultiFilter: vi.fn(),
  addGuestTag: vi.fn(),
  removeGuestTag: vi.fn(),
  toggleGuestVip: vi.fn(),
  toggleVipFilter: vi.fn(),
  printGuestBadges: vi.fn(),
  printGuestsByTable: vi.fn(),
  exportGuestsByGroup: vi.fn(),
}));

import { getHandler } from "./helpers.js";
import { registerGuestHandlers } from "../../src/handlers/guest-handlers.js";
import { on } from "../../src/core/events.js";
import { showToast, closeModal, showConfirmDialog } from "../../src/core/ui.js";
import {
  saveGuest, deleteGuest, exportGuestsCSV, printGuests, toggleSelectAll,
  exportGuestsByGroup, setFilter, setSideFilter, batchMarkUnsent, renderDuplicates,
  printGuestBadges, printGuestsByTable, setSortField, toggleVipFilter, downloadCSVTemplate,
} from "../../src/sections/guests.js";

describe("registerGuestHandlers — registration", () => {
  beforeEach(() => { vi.mocked(on).mockClear(); });

  it("is a function", () => {
    expect(typeof registerGuestHandlers).toBe("function");
  });

  it("registers event handlers via on()", () => {
    registerGuestHandlers();
    expect(vi.mocked(on).mock.calls.length).toBeGreaterThan(0);
  });

  it("does not throw on call", () => {
    expect(() => registerGuestHandlers()).not.toThrow();
  });

  it("registers a handler for saveGuest action", () => {
    registerGuestHandlers();
    const actions = vi.mocked(on).mock.calls.map((c) => c[0]);
    expect(actions).toContain("saveGuest");
  });

  it("registers a handler for deleteGuest action", () => {
    registerGuestHandlers();
    const actions = vi.mocked(on).mock.calls.map((c) => c[0]);
    expect(actions).toContain("deleteGuest");
  });
});

describe("registerGuestHandlers — handler behavior", () => {
  beforeEach(() => {
    vi.mocked(on).mockClear();
    vi.mocked(saveGuest).mockReset();
    vi.mocked(showToast).mockReset();
    vi.mocked(closeModal).mockReset();
    vi.mocked(showConfirmDialog).mockReset();
    registerGuestHandlers();
  });

  it("saveGuest handler calls saveGuest() with form data", () => {
    vi.mocked(saveGuest).mockReturnValue({ ok: true });
    getHandler(on, "saveGuest")();
    expect(saveGuest).toHaveBeenCalled();
  });

  it("saveGuest handler closes modal and shows success toast on ok", () => {
    vi.mocked(saveGuest).mockReturnValue({ ok: true });
    getHandler(on, "saveGuest")();
    expect(closeModal).toHaveBeenCalledWith("guestModal");
    expect(showToast).toHaveBeenCalledWith(expect.anything(), "success");
  });

  it("saveGuest handler shows error toast on failure", () => {
    vi.mocked(saveGuest).mockReturnValue({ ok: false, errors: ["Name required"] });
    getHandler(on, "saveGuest")();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining("Name required"), "error");
  });

  it("exportGuestsCSV handler calls exportGuestsCSV()", () => {
    getHandler(on, "exportGuestsCSV")();
    expect(exportGuestsCSV).toHaveBeenCalledOnce();
  });

  it("printGuests handler calls printGuests()", () => {
    getHandler(on, "printGuests")();
    expect(printGuests).toHaveBeenCalledOnce();
  });

  it("toggleSelectAll handler calls toggleSelectAll()", () => {
    getHandler(on, "toggleSelectAll")();
    expect(toggleSelectAll).toHaveBeenCalledOnce();
  });

  it("setFilter handler passes dataset.filter to setFilter()", () => {
    const el = { dataset: { filter: "confirmed" } };
    getHandler(on, "setFilter")(el);
    expect(setFilter).toHaveBeenCalledWith("confirmed");
  });

  it("setFilter handler defaults to 'all' when dataset.filter is absent", () => {
    const el = { dataset: {} };
    getHandler(on, "setFilter")(el);
    expect(setFilter).toHaveBeenCalledWith("all");
  });

  it("setSideFilter handler passes dataset.side to setSideFilter()", () => {
    const el = { dataset: { side: "bride" } };
    getHandler(on, "setSideFilter")(el);
    expect(setSideFilter).toHaveBeenCalledWith("bride");
  });

  it("deleteGuest handler calls showConfirmDialog", () => {
    const el = { dataset: { actionArg: "g1" } };
    getHandler(on, "deleteGuest")(el);
    expect(showConfirmDialog).toHaveBeenCalled();
  });

  it("deleteGuest handler calls deleteGuest() after confirm", () => {
    // Make showConfirmDialog invoke its callback immediately
    vi.mocked(showConfirmDialog).mockImplementation((_msg, cb) => cb());
    const el = { dataset: { actionArg: "g1" } };
    getHandler(on, "deleteGuest")(el);
    expect(deleteGuest).toHaveBeenCalledWith("g1");
  });

  it("printGuestBadges handler calls printGuestBadges()", () => {
    getHandler(on, "printGuestBadges")();
    expect(printGuestBadges).toHaveBeenCalledOnce();
  });

  it("printGuestsByTable handler calls printGuestsByTable()", () => {
    getHandler(on, "printGuestsByTable")();
    expect(printGuestsByTable).toHaveBeenCalledOnce();
  });

  it("scanDuplicates handler calls renderDuplicates()", () => {
    getHandler(on, "scanDuplicates")();
    expect(renderDuplicates).toHaveBeenCalledOnce();
  });

  it("sortGuestsBy handler passes actionArg to setSortField()", () => {
    const el = { dataset: { actionArg: "firstName" } };
    getHandler(on, "sortGuestsBy")(el);
    expect(setSortField).toHaveBeenCalledWith("firstName");
  });

  it("toggleVipFilter handler calls toggleVipFilter()", () => {
    getHandler(on, "toggleVipFilter")();
    expect(toggleVipFilter).toHaveBeenCalledOnce();
  });

  it("downloadCSVTemplate handler calls downloadCSVTemplate()", () => {
    getHandler(on, "downloadCSVTemplate")();
    expect(downloadCSVTemplate).toHaveBeenCalledOnce();
  });

  it("exportGuestsByGroup handler passes actionArg to exportGuestsByGroup()", () => {
    const el = { dataset: { actionArg: "family" } };
    getHandler(on, "exportGuestsByGroup")(el);
    expect(exportGuestsByGroup).toHaveBeenCalledWith("family");
  });

  it("batchMarkUnsent handler calls batchMarkUnsent and shows toast", () => {
    getHandler(on, "batchMarkUnsent")();
    expect(batchMarkUnsent).toHaveBeenCalledOnce();
    expect(showToast).toHaveBeenCalledWith(expect.anything(), "success");
  });
});

