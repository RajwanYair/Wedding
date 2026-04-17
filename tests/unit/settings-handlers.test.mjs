/**
 * tests/unit/settings-handlers.test.mjs — Sprint 194
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/core/events.js", () => ({ on: vi.fn() }));
vi.mock("../../src/core/ui.js", () => ({
  showToast: vi.fn(), closeModal: vi.fn(), showConfirmDialog: vi.fn(),
}));
vi.mock("../../src/core/i18n.js", () => ({ t: vi.fn((k) => k) }));
vi.mock("../../src/core/state.js", () => ({ load: vi.fn(() => ""), save: vi.fn() }));
vi.mock("../../src/core/store.js", () => ({ storeSet: vi.fn() }));
vi.mock("../../src/services/sheets.js", () => ({
  syncSheetsNow: vi.fn(), sheetsCheckConnection: vi.fn(), createMissingSheetTabs: vi.fn(),
  pullFromSheets: vi.fn(), pushAllToSheets: vi.fn(), sheetsPost: vi.fn(),
  startLiveSync: vi.fn(), stopLiveSync: vi.fn(),
}));
vi.mock("../../src/sections/settings.js", () => ({
  switchLanguage: vi.fn(), clearAllData: vi.fn(), exportJSON: vi.fn(),
  importJSON: vi.fn(), copyRsvpLink: vi.fn(), copyContactLink: vi.fn(),
  saveWebAppUrl: vi.fn(), saveSupabaseConfig: vi.fn(), saveBackendType: vi.fn(),
  saveTransportSettings: vi.fn(), addApprovedEmail: vi.fn(), clearAuditLog: vi.fn(),
  clearErrorLog: vi.fn(), refreshAuditLog: vi.fn(), generateRsvpQrCode: vi.fn(),
  startAutoBackup: vi.fn(), stopAutoBackup: vi.fn(), downloadAutoBackup: vi.fn(),
  restoreAutoBackup: vi.fn(), exportAllCSV: vi.fn(), checkDataIntegrity: vi.fn(),
  exportDebugReport: vi.fn(),
}));
vi.mock("../../src/sections/invitation.js", () => ({}));
vi.mock("../../src/sections/contact-collector.js", () => ({}));
vi.mock("../../src/sections/registry.js", () => ({}));
vi.mock("../../src/sections/landing.js", () => ({}));

import { registerSettingsHandlers } from "../../src/handlers/settings-handlers.js";
import { on } from "../../src/core/events.js";

const ctx = {
  pendingConflicts: vi.fn(() => []),
  applyConflictResolutions: vi.fn(),
};

describe("registerSettingsHandlers", () => {
  it("is a function", () => {
    expect(typeof registerSettingsHandlers).toBe("function");
  });

  it("registers handlers via on()", () => {
    vi.mocked(on).mockClear();
    registerSettingsHandlers(ctx);
    expect(vi.mocked(on).mock.calls.length).toBeGreaterThan(0);
  });

  it("does not throw", () => {
    expect(() => registerSettingsHandlers(ctx)).not.toThrow();
  });

  it("registers syncSheetsNow handler", () => {
    vi.mocked(on).mockClear();
    registerSettingsHandlers(ctx);
    const actions = vi.mocked(on).mock.calls.map((c) => c[0]);
    expect(actions).toContain("syncSheetsNow");
  });

  it("registers switchLanguage handler", () => {
    vi.mocked(on).mockClear();
    registerSettingsHandlers(ctx);
    const actions = vi.mocked(on).mock.calls.map((c) => c[0]);
    expect(actions).toContain("switchLanguage");
  });
});
