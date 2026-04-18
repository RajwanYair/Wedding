/**
 * tests/unit/section-handlers.test.mjs — Sprint 199 + Sprint 6 (session)
 *
 * Expanded: tests now invoke handler callbacks to verify behavior.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/core/events.js", () => ({ on: vi.fn() }));
vi.mock("../../src/core/store.js", () => ({ storeGet: vi.fn(() => []), storeSet: vi.fn() }));
vi.mock("../../src/core/ui.js", () => ({
  showToast: vi.fn(), openModal: vi.fn(), closeModal: vi.fn(), showConfirmDialog: vi.fn(),
}));
vi.mock("../../src/core/i18n.js", () => ({ t: vi.fn((k) => k) }));
vi.mock("../../src/utils/form-helpers.js", () => ({ getVal: vi.fn(() => "") }));
vi.mock("../../src/sections/budget.js", () => ({
  deleteBudgetEntry: vi.fn(), renderBudgetProgress: vi.fn(),
}));
vi.mock("../../src/sections/analytics.js", () => ({
  renderBudgetChart: vi.fn(), exportAnalyticsPDF: vi.fn(), exportAnalyticsCSV: vi.fn(),
  exportMealPerTableCSV: vi.fn(), printMealPerTable: vi.fn(), renderSeatingMap: vi.fn(),
  exportEventSummary: vi.fn(), printDietaryCards: vi.fn(),
}));
vi.mock("../../src/sections/rsvp.js", () => ({
  submitRsvp: vi.fn(() => ({ ok: true })), lookupRsvpByPhone: vi.fn(),
}));
vi.mock("../../src/sections/gallery.js", () => ({
  handleGalleryUpload: vi.fn(), deleteGalleryPhoto: vi.fn(), openLightbox: vi.fn(),
}));
vi.mock("../../src/sections/whatsapp.js", () => ({
  sendWhatsAppAll: vi.fn(), sendWhatsAppAllViaApi: vi.fn(), checkGreenApiConnection: vi.fn(),
  saveGreenApiConfig: vi.fn(), updateWaPreview: vi.fn(), sendWhatsAppReminder: vi.fn(),
  sendThankYouMessages: vi.fn(), toggleUnsentFilter: vi.fn(), renderUnsentBadge: vi.fn(),
  toggleDeclinedFilter: vi.fn(), downloadCalendarInvite: vi.fn(), scheduleReminders: vi.fn(),
  cancelScheduledReminders: vi.fn(), getScheduledQueue: vi.fn(() => []),
}));
vi.mock("../../src/sections/timeline.js", () => ({
  saveTimelineItem: vi.fn(() => ({ ok: true })), deleteTimelineItem: vi.fn(),
  openTimelineForEdit: vi.fn(), printTimeline: vi.fn(),
  toggleTimelineDone: vi.fn(), exportTimelineCSV: vi.fn(),
}));

import { registerSectionHandlers } from "../../src/handlers/section-handlers.js";
import { on } from "../../src/core/events.js";
import { showToast, showConfirmDialog } from "../../src/core/ui.js";
import { renderBudgetProgress } from "../../src/sections/budget.js";
import {
  exportAnalyticsPDF, exportAnalyticsCSV, exportMealPerTableCSV,
  printMealPerTable, renderSeatingMap, exportEventSummary, printDietaryCards,
} from "../../src/sections/analytics.js";
import { openLightbox, handleGalleryUpload, deleteGalleryPhoto } from "../../src/sections/gallery.js";
import {
  sendWhatsAppAll, checkGreenApiConnection, toggleDeclinedFilter,
  downloadCalendarInvite, sendWhatsAppReminder,
} from "../../src/sections/whatsapp.js";
import { printTimeline, exportTimelineCSV, toggleTimelineDone } from "../../src/sections/timeline.js";

function getHandler(action) {
  const call = vi.mocked(on).mock.calls.find(([a]) => a === action);
  if (!call) throw new Error(`No handler for "${action}"`);
  return call[1];
}

describe("registerSectionHandlers — registration", () => {
  beforeEach(() => { vi.mocked(on).mockClear(); });

  it("is a function", () => { expect(typeof registerSectionHandlers).toBe("function"); });
  it("registers handlers via on()", () => {
    registerSectionHandlers();
    expect(vi.mocked(on).mock.calls.length).toBeGreaterThan(0);
  });
  it("does not throw", () => { expect(() => registerSectionHandlers()).not.toThrow(); });
  it("registers submitRSVP handler", () => {
    registerSectionHandlers();
    expect(vi.mocked(on).mock.calls.map((c) => c[0])).toContain("submitRSVP");
  });
  it("registers saveTimelineItem handler", () => {
    registerSectionHandlers();
    expect(vi.mocked(on).mock.calls.map((c) => c[0])).toContain("saveTimelineItem");
  });
});

describe("registerSectionHandlers — handler behavior", () => {
  beforeEach(() => {
    vi.mocked(on).mockClear();
    vi.mocked(showToast).mockReset();
    vi.mocked(showConfirmDialog).mockReset();
    registerSectionHandlers();
  });

  it("renderBudgetProgress handler calls renderBudgetProgress()", () => {
    getHandler("renderBudgetProgress")();
    expect(renderBudgetProgress).toHaveBeenCalledOnce();
  });

  it("exportAnalyticsPDF handler calls exportAnalyticsPDF()", () => {
    getHandler("exportAnalyticsPDF")();
    expect(exportAnalyticsPDF).toHaveBeenCalledOnce();
  });

  it("exportAnalyticsCSV handler calls exportAnalyticsCSV()", () => {
    getHandler("exportAnalyticsCSV")();
    expect(exportAnalyticsCSV).toHaveBeenCalledOnce();
  });

  it("exportMealPerTableCSV handler calls exportMealPerTableCSV()", () => {
    getHandler("exportMealPerTableCSV")();
    expect(exportMealPerTableCSV).toHaveBeenCalledOnce();
  });

  it("printMealPerTable handler calls printMealPerTable()", () => {
    getHandler("printMealPerTable")();
    expect(printMealPerTable).toHaveBeenCalledOnce();
  });

  it("renderSeatingMap handler calls renderSeatingMap()", () => {
    getHandler("renderSeatingMap")();
    expect(renderSeatingMap).toHaveBeenCalledOnce();
  });

  it("exportEventSummary handler calls exportEventSummary()", () => {
    getHandler("exportEventSummary")();
    expect(exportEventSummary).toHaveBeenCalledOnce();
  });

  it("printDietaryCards handler calls printDietaryCards()", () => {
    getHandler("printDietaryCards")();
    expect(printDietaryCards).toHaveBeenCalledOnce();
  });

  it("handleGalleryUpload handler calls handleGalleryUpload()", () => {
    const el = { files: [] };
    getHandler("handleGalleryUpload")(el);
    expect(handleGalleryUpload).toHaveBeenCalledWith(el);
  });

  it("openLightbox handler passes actionArg to openLightbox()", () => {
    const el = { dataset: { actionArg: "photo1.jpg" } };
    getHandler("openLightbox")(el);
    expect(openLightbox).toHaveBeenCalledWith("photo1.jpg");
  });

  it("deleteGalleryPhoto handler calls showConfirmDialog", () => {
    const el = { dataset: { actionArg: "p1" } };
    getHandler("deleteGalleryPhoto")(el);
    expect(showConfirmDialog).toHaveBeenCalled();
  });

  it("sendWhatsAppAll handler passes actionArg to sendWhatsAppAll()", () => {
    const el = { dataset: { actionArg: "confirmed" } };
    getHandler("sendWhatsAppAll")(el);
    expect(sendWhatsAppAll).toHaveBeenCalledWith("confirmed");
  });

  it("checkGreenApiConnection handler calls checkGreenApiConnection()", () => {
    getHandler("checkGreenApiConnection")();
    expect(checkGreenApiConnection).toHaveBeenCalledOnce();
  });

  it("toggleDeclinedFilter handler calls toggleDeclinedFilter()", () => {
    getHandler("toggleDeclinedFilter")();
    expect(toggleDeclinedFilter).toHaveBeenCalledOnce();
  });

  it("downloadCalendarInvite handler calls downloadCalendarInvite()", () => {
    getHandler("downloadCalendarInvite")();
    expect(downloadCalendarInvite).toHaveBeenCalledOnce();
  });

  it("printTimeline handler calls printTimeline()", () => {
    getHandler("printTimeline")();
    expect(printTimeline).toHaveBeenCalledOnce();
  });

  it("exportTimelineCSV handler calls exportTimelineCSV()", () => {
    getHandler("exportTimelineCSV")();
    expect(exportTimelineCSV).toHaveBeenCalledOnce();
  });
});

