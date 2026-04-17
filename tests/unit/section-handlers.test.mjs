/**
 * tests/unit/section-handlers.test.mjs — Sprint 199
 */

import { describe, it, expect, vi } from "vitest";

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
  submitRsvp: vi.fn(), lookupRsvpByPhone: vi.fn(),
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
  saveTimelineItem: vi.fn(), deleteTimelineItem: vi.fn(), openTimelineForEdit: vi.fn(),
  printTimeline: vi.fn(), toggleTimelineDone: vi.fn(), exportTimelineCSV: vi.fn(),
}));

import { registerSectionHandlers } from "../../src/handlers/section-handlers.js";
import { on } from "../../src/core/events.js";

describe("registerSectionHandlers", () => {
  it("is a function", () => {
    expect(typeof registerSectionHandlers).toBe("function");
  });

  it("registers handlers via on()", () => {
    vi.mocked(on).mockClear();
    registerSectionHandlers();
    expect(vi.mocked(on).mock.calls.length).toBeGreaterThan(0);
  });

  it("does not throw", () => {
    expect(() => registerSectionHandlers()).not.toThrow();
  });

  it("registers submitRsvp handler", () => {
    vi.mocked(on).mockClear();
    registerSectionHandlers();
    const actions = vi.mocked(on).mock.calls.map((c) => c[0]);
    expect(actions).toContain("submitRSVP");
  });

  it("registers saveTimelineItem handler", () => {
    vi.mocked(on).mockClear();
    registerSectionHandlers();
    const actions = vi.mocked(on).mock.calls.map((c) => c[0]);
    expect(actions).toContain("saveTimelineItem");
  });
});
