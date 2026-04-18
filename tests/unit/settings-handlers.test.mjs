/**
 * tests/unit/settings-handlers.test.mjs — Sprint 194 + Sprint 5 (session)
 *
 * Expanded: tests now invoke handler callbacks to verify behavior.
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/core/events.js", () => ({ on: vi.fn() }));
vi.mock("../../src/core/ui.js", () => ({
  showToast: vi.fn(), closeModal: vi.fn(), showConfirmDialog: vi.fn(),
}));
vi.mock("../../src/core/i18n.js", () => ({ t: vi.fn((k) => k) }));
vi.mock("../../src/core/state.js", () => ({ load: vi.fn(() => ""), save: vi.fn() }));
vi.mock("../../src/core/store.js", () => ({ storeSet: vi.fn() }));
vi.mock("../../src/core/constants.js", () => ({ STORAGE_KEYS: {} }));
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
  restoreAutoBackup: vi.fn(), exportAllCSV: vi.fn(), checkDataIntegrity: vi.fn(() => ({ ok: true })),
  exportDebugReport: vi.fn(),
}));
vi.mock("../../src/sections/invitation.js", () => ({}));
vi.mock("../../src/sections/contact-collector.js", () => ({}));
vi.mock("../../src/sections/registry.js", () => ({}));
vi.mock("../../src/sections/landing.js", () => ({}));

import { registerSettingsHandlers } from "../../src/handlers/settings-handlers.js";
import { on } from "../../src/core/events.js";
import { showToast } from "../../src/core/ui.js";
import {
  addApprovedEmail, clearAllData, exportJSON, importJSON, copyRsvpLink,
  copyContactLink, clearAuditLog, clearErrorLog, exportAllCSV,
  checkDataIntegrity, exportDebugReport, generateRsvpQrCode,
  startAutoBackup, stopAutoBackup, downloadAutoBackup,
} from "../../src/sections/settings.js";

const ctx = {
  pendingConflicts: vi.fn(() => []),
  applyConflictResolutions: vi.fn(),
};

function getHandler(action) {
  const call = vi.mocked(on).mock.calls.find(([a]) => a === action);
  if (!call) throw new Error(`No handler for "${action}"`);
  return call[1];
}

describe("registerSettingsHandlers — registration", () => {
  beforeEach(() => { vi.mocked(on).mockClear(); });

  it("is a function", () => { expect(typeof registerSettingsHandlers).toBe("function"); });
  it("registers handlers via on()", () => {
    registerSettingsHandlers(ctx);
    expect(vi.mocked(on).mock.calls.length).toBeGreaterThan(0);
  });
  it("does not throw", () => { expect(() => registerSettingsHandlers(ctx)).not.toThrow(); });
  it("registers syncSheetsNow handler", () => {
    registerSettingsHandlers(ctx);
    expect(vi.mocked(on).mock.calls.map((c) => c[0])).toContain("syncSheetsNow");
  });
  it("registers switchLanguage handler", () => {
    registerSettingsHandlers(ctx);
    expect(vi.mocked(on).mock.calls.map((c) => c[0])).toContain("switchLanguage");
  });
});

describe("registerSettingsHandlers — handler behavior", () => {
  beforeEach(() => {
    vi.mocked(on).mockClear();
    vi.mocked(showToast).mockReset();
    registerSettingsHandlers(ctx);
  });

  it("addApprovedEmail handler calls addApprovedEmail()", () => {
    getHandler("addApprovedEmail")();
    expect(addApprovedEmail).toHaveBeenCalledOnce();
  });

  it("clearAllData handler calls clearAllData()", () => {
    getHandler("clearAllData")();
    expect(clearAllData).toHaveBeenCalledOnce();
  });

  it("exportJSON handler calls exportJSON()", () => {
    getHandler("exportJSON")();
    expect(exportJSON).toHaveBeenCalledOnce();
  });

  it("importJSON handler passes element to importJSON()", () => {
    const el = { files: [] };
    getHandler("importJSON")(el);
    expect(importJSON).toHaveBeenCalledWith(el);
  });

  it("copyRsvpLink handler calls copyRsvpLink()", () => {
    getHandler("copyRsvpLink")();
    expect(copyRsvpLink).toHaveBeenCalledOnce();
  });

  it("copyContactLink handler calls copyContactLink()", () => {
    getHandler("copyContactLink")();
    expect(copyContactLink).toHaveBeenCalledOnce();
  });

  it("clearAuditLog handler calls clearAuditLog()", () => {
    getHandler("clearAuditLog")();
    expect(clearAuditLog).toHaveBeenCalledOnce();
  });

  it("clearErrorLog handler calls clearErrorLog()", () => {
    getHandler("clearErrorLog")();
    expect(clearErrorLog).toHaveBeenCalledOnce();
  });

  it("exportAllCSV handler calls exportAllCSV()", () => {
    getHandler("exportAllCSV")();
    expect(exportAllCSV).toHaveBeenCalledOnce();
  });

  it("checkDataIntegrity handler calls checkDataIntegrity()", () => {
    getHandler("checkDataIntegrity")();
    expect(checkDataIntegrity).toHaveBeenCalledOnce();
  });

  it("exportDebugReport handler calls exportDebugReport()", () => {
    getHandler("exportDebugReport")();
    expect(exportDebugReport).toHaveBeenCalledOnce();
  });

  it("generateRsvpQrCode handler calls generateRsvpQrCode()", () => {
    getHandler("generateRsvpQrCode")();
    expect(generateRsvpQrCode).toHaveBeenCalledOnce();
  });

  it("startAutoBackup handler calls startAutoBackup()", () => {
    getHandler("startAutoBackup")();
    expect(startAutoBackup).toHaveBeenCalledOnce();
  });

  it("stopAutoBackup handler calls stopAutoBackup()", () => {
    getHandler("stopAutoBackup")();
    expect(stopAutoBackup).toHaveBeenCalledOnce();
  });

  it("downloadAutoBackup handler calls downloadAutoBackup()", () => {
    getHandler("downloadAutoBackup")();
    expect(downloadAutoBackup).toHaveBeenCalledOnce();
  });
});

