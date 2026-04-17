/**
 * tests/unit/guest-handlers.test.mjs — Sprint 191
 */

import { describe, it, expect, vi } from "vitest";

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

import { registerGuestHandlers } from "../../src/handlers/guest-handlers.js";
import { on } from "../../src/core/events.js";

describe("registerGuestHandlers", () => {
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
    vi.mocked(on).mockClear();
    registerGuestHandlers();
    const actions = vi.mocked(on).mock.calls.map((c) => c[0]);
    expect(actions).toContain("saveGuest");
  });

  it("registers a handler for deleteGuest action", () => {
    vi.mocked(on).mockClear();
    registerGuestHandlers();
    const actions = vi.mocked(on).mock.calls.map((c) => c[0]);
    expect(actions).toContain("deleteGuest");
  });
});
