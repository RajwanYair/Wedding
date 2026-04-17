/**
 * tests/unit/table-handlers.test.mjs — Sprint 193
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/core/events.js", () => ({ on: vi.fn() }));
vi.mock("../../src/core/ui.js", () => ({
  showToast: vi.fn(), openModal: vi.fn(), closeModal: vi.fn(), showConfirmDialog: vi.fn(),
}));
vi.mock("../../src/core/i18n.js", () => ({ t: vi.fn((k) => k) }));
vi.mock("../../src/utils/form-helpers.js", () => ({ getVal: vi.fn(() => "") }));
vi.mock("../../src/sections/tables.js", () => ({
  saveTable: vi.fn(), deleteTable: vi.fn(), autoAssignTables: vi.fn(),
  renderTables: vi.fn(), printSeatingChart: vi.fn(), printPlaceCards: vi.fn(),
  printTableSigns: vi.fn(), openTableForEdit: vi.fn(), exportTransportCSV: vi.fn(),
  printTransportManifest: vi.fn(), smartAutoAssign: vi.fn(), exportTableCSV: vi.fn(),
}));
vi.mock("../../src/sections/checkin.js", () => ({
  checkInGuest: vi.fn(), setCheckinSearch: vi.fn(), exportCheckinReport: vi.fn(),
  exportGiftsCSV: vi.fn(), resetAllCheckins: vi.fn(), toggleGiftMode: vi.fn(),
  startQrScan: vi.fn(), stopQrScan: vi.fn(), checkInByTable: vi.fn(),
  toggleAccessibilityFilter: vi.fn(),
}));

import { registerTableHandlers } from "../../src/handlers/table-handlers.js";
import { on } from "../../src/core/events.js";

describe("registerTableHandlers", () => {
  it("is a function", () => {
    expect(typeof registerTableHandlers).toBe("function");
  });

  it("registers handlers via on()", () => {
    vi.mocked(on).mockClear();
    registerTableHandlers();
    expect(vi.mocked(on).mock.calls.length).toBeGreaterThan(0);
  });

  it("does not throw", () => {
    expect(() => registerTableHandlers()).not.toThrow();
  });

  it("registers saveTable handler", () => {
    vi.mocked(on).mockClear();
    registerTableHandlers();
    const actions = vi.mocked(on).mock.calls.map((c) => c[0]);
    expect(actions).toContain("saveTable");
  });

  it("registers checkInGuest handler", () => {
    vi.mocked(on).mockClear();
    registerTableHandlers();
    const actions = vi.mocked(on).mock.calls.map((c) => c[0]);
    expect(actions).toContain("checkInGuest");
  });
});
