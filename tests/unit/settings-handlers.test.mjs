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
vi.mock("../../src/core/i18n.js", () => ({
  t: vi.fn((k) => k),
  normalizeUiLanguage: vi.fn((lang) => (lang === "en" ? "en" : "he")),
  nextUiLanguage: vi.fn((lang) => (lang === "he" ? "en" : "he")),
}));
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

import { getHandler, assertHandlerRegistration } from "./helpers.js";
import { registerSettingsHandlers } from "../../src/handlers/settings-handlers.js";
import { on } from "../../src/core/events.js";
import { showToast } from "../../src/core/ui.js";
import { load } from "../../src/core/state.js";
import {
  addApprovedEmail, clearAllData, exportJSON, importJSON, copyRsvpLink,
  copyContactLink, clearAuditLog, clearErrorLog, exportAllCSV,
  checkDataIntegrity, exportDebugReport, generateRsvpQrCode,
  startAutoBackup, stopAutoBackup, downloadAutoBackup, switchLanguage,
} from "../../src/sections/settings.js";

const ctx = {
  pendingConflicts: vi.fn(() => []),
  applyConflictResolutions: vi.fn(),
};

describe("registerSettingsHandlers — registration", () => {
  beforeEach(() => { vi.mocked(on).mockClear(); });

  it("registers all required handlers", () => {
    expect(assertHandlerRegistration({
      name: "registerSettingsHandlers",
      register: registerSettingsHandlers,
      on, vi,
      actions: ["syncSheetsNow", "switchLanguage"],
      args: [ctx],
    })).toBe(true);
  });
});

describe("registerSettingsHandlers — handler behavior", () => {
  beforeEach(() => {
    vi.mocked(on).mockClear();
    vi.mocked(showToast).mockReset();
    vi.mocked(load).mockReset();
    vi.mocked(load).mockReturnValue("he");
    vi.mocked(switchLanguage).mockReset();
    registerSettingsHandlers(ctx);
  });

  it("addApprovedEmail handler calls addApprovedEmail()", () => {
    getHandler(on, "addApprovedEmail")();
    expect(addApprovedEmail).toHaveBeenCalledOnce();
  });

  it("clearAllData handler calls clearAllData()", () => {
    getHandler(on, "clearAllData")();
    expect(clearAllData).toHaveBeenCalledOnce();
  });

  it("exportJSON handler calls exportJSON()", () => {
    getHandler(on, "exportJSON")();
    expect(exportJSON).toHaveBeenCalledOnce();
  });

  it("importJSON handler passes element to importJSON()", () => {
    const el = { files: [] };
    getHandler(on, "importJSON")(el);
    expect(importJSON).toHaveBeenCalledWith(el);
  });

  it("copyRsvpLink handler calls copyRsvpLink()", () => {
    getHandler(on, "copyRsvpLink")();
    expect(copyRsvpLink).toHaveBeenCalledOnce();
  });

  it("copyContactLink handler calls copyContactLink()", () => {
    getHandler(on, "copyContactLink")();
    expect(copyContactLink).toHaveBeenCalledOnce();
  });

  it("clearAuditLog handler calls clearAuditLog()", () => {
    getHandler(on, "clearAuditLog")();
    expect(clearAuditLog).toHaveBeenCalledOnce();
  });

  it("clearErrorLog handler calls clearErrorLog()", () => {
    getHandler(on, "clearErrorLog")();
    expect(clearErrorLog).toHaveBeenCalledOnce();
  });

  it("exportAllCSV handler calls exportAllCSV()", () => {
    getHandler(on, "exportAllCSV")();
    expect(exportAllCSV).toHaveBeenCalledOnce();
  });

  it("checkDataIntegrity handler calls checkDataIntegrity()", () => {
    getHandler(on, "checkDataIntegrity")();
    expect(checkDataIntegrity).toHaveBeenCalledOnce();
  });

  it("exportDebugReport handler calls exportDebugReport()", () => {
    getHandler(on, "exportDebugReport")();
    expect(exportDebugReport).toHaveBeenCalledOnce();
  });

  it("generateRsvpQrCode handler calls generateRsvpQrCode()", () => {
    getHandler(on, "generateRsvpQrCode")();
    expect(generateRsvpQrCode).toHaveBeenCalledOnce();
  });

  it("startAutoBackup handler calls startAutoBackup()", () => {
    getHandler(on, "startAutoBackup")();
    expect(startAutoBackup).toHaveBeenCalledOnce();
  });

  it("stopAutoBackup handler calls stopAutoBackup()", () => {
    getHandler(on, "stopAutoBackup")();
    expect(stopAutoBackup).toHaveBeenCalledOnce();
  });

  it("downloadAutoBackup handler calls downloadAutoBackup()", () => {
    getHandler(on, "downloadAutoBackup")();
    expect(downloadAutoBackup).toHaveBeenCalledOnce();
  });

  it("switchLanguage handler toggles from Hebrew to English", async () => {
    vi.mocked(load).mockReturnValue("he");
    await getHandler(on, "switchLanguage")();
    expect(switchLanguage).toHaveBeenCalledWith("en");
    expect(showToast).toHaveBeenCalledWith("language_switched", "info");
  });

  it("toggleLanguage handler toggles from English to Hebrew", async () => {
    vi.mocked(load).mockReturnValue("en");
    await getHandler(on, "toggleLanguage")();
    expect(switchLanguage).toHaveBeenCalledWith("he");
    expect(showToast).toHaveBeenCalledWith("language_switched", "info");
  });
});

