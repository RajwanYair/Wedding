/**
 * tests/unit/settings-handlers.test.mjs — S329: coverage for src/handlers/settings-handlers.js
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Capture registered handlers ──────────────────────────────────────────

/** @type {Map<string, Function>} */
const _handlers = new Map();

vi.mock("../../src/core/events.js", () => ({
  on: vi.fn((action, fn) => _handlers.set(action, fn)),
}));

// ── Mock all dependencies ─────────────────────────────────────────────────

const _toastCalls = [];
const _closeModalMock = vi.fn();
const _applyThemeMock = vi.fn();

vi.mock("../../src/core/ui.js", () => ({
  showToast: vi.fn((msg, type) => _toastCalls.push({ msg, type })),
  closeModal: (...a) => _closeModalMock(...a),
  applyTheme: (...a) => _applyThemeMock(...a),
}));

vi.mock("../../src/core/i18n.js", () => ({
  t: (k, _opts) => k,
  normalizeUiLanguage: (v) => v,
  nextUiLanguage: (v) => (v === "he" ? "en" : "he"),
}));

vi.mock("../../src/core/state.js", () => ({
  save: vi.fn(),
  load: vi.fn((k, def) => def),
}));

vi.mock("../../src/core/dialog.js", () => ({
  awaitDialogClose: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../src/services/compliance.js", () => ({
  logAdminAction: vi.fn(),
}));

const _syncSheetsMock = vi.fn(() => Promise.resolve());
const _sheetsCheckMock = vi.fn(() => Promise.resolve(true));
const _createTabsMock = vi.fn(() => Promise.resolve());
const _pullFromSheetsMock = vi.fn(() => Promise.resolve());
const _pushAllMock = vi.fn(() => Promise.resolve({ guests: 5 }));
const _startLiveSyncMock = vi.fn();
const _stopLiveSyncMock = vi.fn();
const _sheetsPostMock = vi.fn(() => Promise.resolve({ removed: 2 }));

vi.mock("../../src/services/sheets.js", () => ({
  syncSheetsNow: () => _syncSheetsMock(),
  sheetsCheckConnection: () => _sheetsCheckMock(),
  createMissingSheetTabs: () => _createTabsMock(),
  pullFromSheets: () => _pullFromSheetsMock(),
  pushAllToSheets: () => _pushAllMock(),
  startLiveSync: () => _startLiveSyncMock(),
  stopLiveSync: () => _stopLiveSyncMock(),
  sheetsPost: (...a) => _sheetsPostMock(...a),
}));

const _applyConflictResolutionsMock = vi.fn();
const _getPendingConflictsMock = vi.fn(() => []);
const _showConflictModalMock = vi.fn(() => Promise.resolve());

vi.mock("../../src/core/conflict-resolver.js", () => ({
  applyConflictResolutions: (...a) => _applyConflictResolutionsMock(...a),
  getPendingConflicts: () => _getPendingConflictsMock(),
  showConflictModal: (...a) => _showConflictModalMock(...a),
}));

const _switchLanguageMock = vi.fn(() => Promise.resolve());
const _clearAllDataMock = vi.fn();
const _exportJSONMock = vi.fn();
const _importJSONMock = vi.fn();
const _copyRsvpLinkMock = vi.fn();
const _copyContactLinkMock = vi.fn();
const _saveWebAppUrlMock = vi.fn();
const _saveSupabaseConfigMock = vi.fn();
const _saveBackendTypeMock = vi.fn();
const _saveTransportSettingsMock = vi.fn();
const _addApprovedEmailMock = vi.fn();
const _removeApprovedEmailMock = vi.fn();
const _clearAuditLogMock = vi.fn();
const _clearErrorLogMock = vi.fn();
const _generateRsvpQrCodeMock = vi.fn();
const _resetThemeVarsMock = vi.fn();
const _exportThemeMock = vi.fn();
const _importThemeMock = vi.fn();
const _installPluginMock = vi.fn();
const _toggleMonitoringMock = vi.fn();
const _startAutoBackupMock = vi.fn();
const _stopAutoBackupMock = vi.fn();
const _downloadAutoBackupMock = vi.fn();
const _restoreAutoBackupMock = vi.fn();
const _exportAllCSVMock = vi.fn(() => Promise.resolve());
const _checkDataIntegrityMock = vi.fn(() => ({ ok: true, issues: [] }));
const _exportDebugReportMock = vi.fn();
const _startAdminSignInMock = vi.fn(() => Promise.resolve());
const _refreshAdminListMock = vi.fn(() => Promise.resolve());
const _checkIsApprovedAdminMock = vi.fn(() => Promise.resolve());
const _resetOnboardingMock = vi.fn();

vi.mock("../../src/sections/settings.js", () => ({
  switchLanguage: (...a) => _switchLanguageMock(...a),
  clearAllData: () => _clearAllDataMock(),
  exportJSON: () => _exportJSONMock(),
  importJSON: (...a) => _importJSONMock(...a),
  copyRsvpLink: () => _copyRsvpLinkMock(),
  copyContactLink: () => _copyContactLinkMock(),
  saveWebAppUrl: (...a) => _saveWebAppUrlMock(...a),
  saveSupabaseConfig: () => _saveSupabaseConfigMock(),
  saveBackendType: () => _saveBackendTypeMock(),
  saveTransportSettings: () => _saveTransportSettingsMock(),
  addApprovedEmail: () => _addApprovedEmailMock(),
  removeApprovedEmail: (...a) => _removeApprovedEmailMock(...a),
  clearAuditLog: () => _clearAuditLogMock(),
  clearErrorLog: () => _clearErrorLogMock(),
  generateRsvpQrCode: () => _generateRsvpQrCodeMock(),
  resetThemeVars: () => _resetThemeVarsMock(),
  exportThemeToJson: () => _exportThemeMock(),
  importThemeFromJson: () => _importThemeMock(),
  installPlugin: () => _installPluginMock(),
  toggleMonitoring: () => _toggleMonitoringMock(),
  startAutoBackup: (...a) => _startAutoBackupMock(...a),
  stopAutoBackup: () => _stopAutoBackupMock(),
  downloadAutoBackup: () => _downloadAutoBackupMock(),
  restoreAutoBackup: () => _restoreAutoBackupMock(),
  exportAllCSV: () => _exportAllCSVMock(),
  checkDataIntegrity: () => _checkDataIntegrityMock(),
  exportDebugReport: () => _exportDebugReportMock(),
  startAdminSignIn: (...a) => _startAdminSignInMock(...a),
  refreshAdminList: () => _refreshAdminListMock(),
  checkIsApprovedAdmin: (...a) => _checkIsApprovedAdminMock(...a),
  resetOnboarding: () => _resetOnboardingMock(),
  registerPasskey: () => _registerPasskeyMock(),
  authenticatePasskey: () => _authenticatePasskeyMock(),
  clearPasskeys: () => _clearPasskeysMock(),
  generateApiKey: () => _generateApiKeyMock(),
  copyApiKey: () => _copyApiKeyMock(),
  revokeApiKey: () => _revokeApiKeyMock(),
  requestGdprErasure: () => _requestGdprErasureMock(),
  exportPersonalData: () => _exportPersonalDataMock(),
  addWebhook: () => _addWebhookMock(),
  removeWebhook: () => _removeWebhookMock(),
  pingWebhookById: () => _pingWebhookByIdMock(),
  refreshWebhooks: () => _refreshWebhooksMock(),
  installThemeById: (_id) => _installThemeByIdMock(_id),
  renderThemeMarketplace: () => {},
  exportAuditLog: () => _exportAuditLogMock(),
  saveAiSettings: () => _saveAiSettingsMock(),
  testAiConnection: () => _testAiConnectionMock(),
  importGuestsCsvFile: (el) => _importGuestsCsvFileMock(el),
}));

const _registerPasskeyMock = vi.fn(() => Promise.resolve());
const _authenticatePasskeyMock = vi.fn(() => Promise.resolve());
const _clearPasskeysMock = vi.fn();
const _generateApiKeyMock = vi.fn();
const _copyApiKeyMock = vi.fn(() => Promise.resolve());
const _revokeApiKeyMock = vi.fn();
const _requestGdprErasureMock = vi.fn();
const _exportPersonalDataMock = vi.fn();
const _addWebhookMock = vi.fn(() => Promise.resolve());
const _removeWebhookMock = vi.fn(() => Promise.resolve());
const _pingWebhookByIdMock = vi.fn(() => Promise.resolve());
const _refreshWebhooksMock = vi.fn(() => Promise.resolve());
const _installThemeByIdMock = vi.fn();
const _exportAuditLogMock = vi.fn();
const _saveAiSettingsMock = vi.fn();
const _testAiConnectionMock = vi.fn(() => Promise.resolve());
const _importGuestsCsvFileMock = vi.fn();
const _addLinkMock = vi.fn();
const _addRegistryLinkMock = vi.fn();
const _addRegistryPresetMock = vi.fn();
vi.mock("../../src/sections/registry.js", () => ({
  addLink: (...a) => _addLinkMock(...a),
  addRegistryLink: (...a) => _addRegistryLinkMock(...a),
  addRegistryPreset: (...a) => _addRegistryPresetMock(...a),
}));

const _saveWebsiteConfigMock = vi.fn();
const _previewWebsiteMock = vi.fn();
vi.mock("../../src/sections/website-builder.js", () => ({
  saveWebsiteConfig: () => _saveWebsiteConfigMock(),
  previewWebsite: () => _previewWebsiteMock(),
}));

const _sendMagicLinkMock = vi.fn(() => Promise.resolve());
const _loginAnonMock = vi.fn(() => Promise.resolve());

vi.mock("../../src/services/auth.js", () => ({
  sendMagicLink: (...a) => _sendMagicLinkMock(...a),
  loginSupabaseAnonymous: () => _loginAnonMock(),
}));

// supabaseCheckConnection is loaded dynamically — stub via mock
vi.mock("../../src/services/supabase.js", () => ({
  supabaseCheckConnection: vi.fn(() => Promise.resolve(true)),
}));

// ── Import after mocks ────────────────────────────────────────────────────

import { register } from "../../src/handlers/settings-handlers.js";

// ── Helpers ───────────────────────────────────────────────────────────────

function dispatch(action, dataset = {}, eventTarget = null) {
  const fn = _handlers.get(action);
  if (!fn) throw new Error(`Handler not registered: ${action}`);
  const el = document.createElement("button");
  for (const [k, v] of Object.entries(dataset)) el.dataset[k] = v;
  const evt = new MouseEvent("click");
  if (eventTarget) Object.defineProperty(evt, "target", { value: eventTarget });
  return fn(el, evt);
}

function addInput(id, value, tag = "input") {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement(tag);
    el.id = id;
    document.body.appendChild(el);
  }
  el.value = value;
  return el;
}

// Override window.confirm to return true
vi.stubGlobal("confirm", vi.fn(() => true));

// ── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  _handlers.clear();
  _toastCalls.length = 0;
  vi.clearAllMocks();
  _sheetsCheckMock.mockResolvedValue(true);
  _checkDataIntegrityMock.mockReturnValue({ ok: true, issues: [] });
  _getPendingConflictsMock.mockReturnValue([]);
  vi.stubGlobal("confirm", vi.fn(() => true));
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("S329 — settingsHandlers — register()", () => {
  it("registers all expected handlers", () => {
    register();
    const expected = [
      "syncSheetsNow", "sheetsCheckConnection", "createMissingSheetTabs",
      "pullFromSheets", "toggleLiveSync", "pushAllToSheets", "cleanConfigDuplicates",
      "saveWebAppUrl", "saveSupabaseConfig", "saveBackendType", "supabaseCheckConnection",
      "conflictAcceptAllLocal", "conflictAcceptAllRemote", "conflictApplySelected",
      "saveTransportSettings", "saveTelemetryOptOut", "addRegistryLink", "addRegistryPreset",
      "saveObservabilityDsn",
      "registerPasskey", "authenticatePasskey", "clearPasskeys",
      "generateApiKey", "copyApiKey", "revokeApiKey",
      "requestGdprErasure",
      "exportPersonalData",
      "testErrorReport",
      "addWebhook", "removeWebhook", "pingWebhookById", "refreshWebhooks",
      "installThemeById",
      "exportAuditLog",
      "saveAiSettings", "testAiConnection", "importGuestsCSV",
      "addApprovedEmail", "removeApprovedEmail", "clearAllData",
      "switchLanguage", "toggleLanguage", "clearAuditLog", "clearErrorLog",
      "exportJSON", "importJSON", "copyRsvpLink", "copyContactLink",
      "generateRsvpQrCode", "printRsvpQr", "printGuestCards",
      "setTheme", "resetThemeVars", "exportThemeJson", "importThemeJson",
      "saveWebsiteConfig", "previewWebsite", "installPlugin", "toggleMonitoring",
      "startAutoBackup", "stopAutoBackup", "downloadAutoBackup", "restoreAutoBackup",
      "exportAllCSV", "checkDataIntegrity", "exportDebugReport",
      "resolveConflicts", "startAdminSignIn", "refreshAdminList",
      "checkIsApprovedAdmin", "resetOnboarding", "sendMagicLink", "loginAnonymousSupabase",
    ];
    for (const action of expected) {
      expect(_handlers.has(action), `missing: ${action}`).toBe(true);
    }
  });

  it("syncSheetsNow calls syncSheetsNow and toasts success", async () => {
    register();
    await dispatch("syncSheetsNow");
    expect(_syncSheetsMock).toHaveBeenCalledTimes(1);
    expect(_toastCalls.at(-1)?.type).toBe("success");
  });

  it("sheetsCheckConnection toasts success when ok=true", async () => {
    register();
    _sheetsCheckMock.mockResolvedValue(true);
    await dispatch("sheetsCheckConnection");
    expect(_toastCalls.at(-1)?.type).toBe("success");
  });

  it("sheetsCheckConnection toasts error when ok=false", async () => {
    register();
    _sheetsCheckMock.mockResolvedValue(false);
    await dispatch("sheetsCheckConnection");
    expect(_toastCalls.at(-1)?.type).toBe("error");
  });

  it("createMissingSheetTabs calls createMissingSheetTabs and toasts", async () => {
    register();
    await dispatch("createMissingSheetTabs");
    expect(_createTabsMock).toHaveBeenCalledTimes(1);
    expect(_toastCalls[0]?.type).toBe("success");
  });

  it("pullFromSheets calls pullFromSheets when confirm=true", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    register();
    await dispatch("pullFromSheets");
    expect(_pullFromSheetsMock).toHaveBeenCalledTimes(1);
    expect(_toastCalls.at(-1)?.type).toBe("success");
  });

  it("pullFromSheets aborts when confirm=false", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    register();
    await dispatch("pullFromSheets");
    expect(_pullFromSheetsMock).not.toHaveBeenCalled();
  });

  it("pullFromSheets toasts error on exception", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    _pullFromSheetsMock.mockRejectedValueOnce(new Error("fail"));
    register();
    await dispatch("pullFromSheets");
    expect(_toastCalls.at(-1)?.type).toBe("error");
  });

  it("toggleLiveSync starts live sync when checked=true", () => {
    register();
    const fn = _handlers.get("toggleLiveSync");
    const el = document.createElement("input");
    el.type = "checkbox";
    el.checked = true;
    fn(el);
    expect(_startLiveSyncMock).toHaveBeenCalledTimes(1);
    expect(_toastCalls[0]?.type).toBe("success");
  });

  it("toggleLiveSync stops live sync when checked=false", () => {
    register();
    const fn = _handlers.get("toggleLiveSync");
    const el = document.createElement("input");
    el.type = "checkbox";
    el.checked = false;
    fn(el);
    expect(_stopLiveSyncMock).toHaveBeenCalledTimes(1);
    expect(_toastCalls[0]?.type).toBe("info");
  });

  it("pushAllToSheets toasts success with count", async () => {
    register();
    _pushAllMock.mockResolvedValue({ guests: 10, vendors: 5 });
    await dispatch("pushAllToSheets");
    expect(_pushAllMock).toHaveBeenCalledTimes(1);
    expect(_toastCalls.at(-1)?.type).toBe("success");
  });

  it("pushAllToSheets toasts error on exception", async () => {
    register();
    _pushAllMock.mockRejectedValueOnce(new Error("fail"));
    await dispatch("pushAllToSheets");
    expect(_toastCalls.at(-1)?.type).toBe("error");
  });

  it("cleanConfigDuplicates posts and toasts done when removed>0", async () => {
    register();
    _sheetsPostMock.mockResolvedValue({ removed: 3 });
    await dispatch("cleanConfigDuplicates");
    expect(_sheetsPostMock).toHaveBeenCalledWith({ action: "cleanConfig" });
    expect(_toastCalls.at(-1)?.type).toBe("success");
  });

  it("cleanConfigDuplicates toasts info when removed=0", async () => {
    register();
    _sheetsPostMock.mockResolvedValue({ removed: 0 });
    await dispatch("cleanConfigDuplicates");
    expect(_toastCalls.at(-1)?.type).toBe("info");
  });

  it("saveWebAppUrl calls saveWebAppUrl and toasts", () => {
    register();
    const form = document.createElement("form");
    document.body.appendChild(form);
    const btn = document.createElement("button");
    form.appendChild(btn);
    const evt = new MouseEvent("click");
    Object.defineProperty(evt, "target", { value: btn });
    const fn = _handlers.get("saveWebAppUrl");
    fn(document.createElement("button"), evt);
    expect(_saveWebAppUrlMock).toHaveBeenCalled();
    expect(_toastCalls[0]?.type).toBe("success");
    document.body.removeChild(form);
  });

  it("saveSupabaseConfig calls saveSupabaseConfig and toasts", () => {
    register();
    dispatch("saveSupabaseConfig");
    expect(_saveSupabaseConfigMock).toHaveBeenCalledTimes(1);
    expect(_toastCalls[0]?.type).toBe("success");
  });

  it("saveBackendType calls saveBackendType and toasts", () => {
    register();
    dispatch("saveBackendType");
    expect(_saveBackendTypeMock).toHaveBeenCalledTimes(1);
    expect(_toastCalls[0]?.type).toBe("success");
  });

  it("conflictAcceptAllLocal closes modal and toasts info", () => {
    register();
    dispatch("conflictAcceptAllLocal");
    expect(_closeModalMock).toHaveBeenCalledWith("conflictModal");
    expect(_toastCalls[0]?.type).toBe("info");
  });

  it("conflictAcceptAllRemote applies remote when conflicts exist", () => {
    register();
    _getPendingConflictsMock.mockReturnValue(["c1", "c2"]);
    dispatch("conflictAcceptAllRemote");
    expect(_applyConflictResolutionsMock).toHaveBeenCalledWith(["remote", "remote"]);
    expect(_closeModalMock).toHaveBeenCalledWith("conflictModal");
  });

  it("conflictAcceptAllRemote closes modal without applying when no conflicts", () => {
    register();
    _getPendingConflictsMock.mockReturnValue([]);
    dispatch("conflictAcceptAllRemote");
    expect(_applyConflictResolutionsMock).not.toHaveBeenCalled();
    expect(_closeModalMock).toHaveBeenCalledWith("conflictModal");
  });

  it("conflictApplySelected applies checked radio choices", () => {
    register();
    const list = document.createElement("div");
    list.id = "conflictList";
    const r1 = document.createElement("input");
    r1.type = "radio";
    r1.checked = true;
    r1.value = "local";
    const r2 = document.createElement("input");
    r2.type = "radio";
    r2.checked = true;
    r2.value = "remote";
    list.appendChild(r1);
    list.appendChild(r2);
    document.body.appendChild(list);
    dispatch("conflictApplySelected");
    expect(_applyConflictResolutionsMock).toHaveBeenCalledWith(["local", "remote"]);
    expect(_closeModalMock).toHaveBeenCalledWith("conflictModal");
    expect(_toastCalls[0]?.type).toBe("success");
    document.body.removeChild(list);
  });

  it("saveTransportSettings calls saveTransportSettings and toasts", () => {
    register();
    dispatch("saveTransportSettings");
    expect(_saveTransportSettingsMock).toHaveBeenCalledTimes(1);
    expect(_toastCalls[0]?.type).toBe("success");
  });

  it("saveTelemetryOptOut sets localStorage when checked=true", () => {
    register();
    const cb = addInput("telemetryOptOut", "");
    cb.type = "checkbox";
    cb.checked = true;
    dispatch("saveTelemetryOptOut");
    expect(localStorage.getItem("wedding_v1_telemetry_opt_out")).toBe("1");
    expect(_toastCalls[0]?.type).toBe("success");
  });

  it("saveTelemetryOptOut removes localStorage when unchecked", () => {
    register();
    localStorage.setItem("wedding_v1_telemetry_opt_out", "1");
    const cb = document.getElementById("telemetryOptOut") || addInput("telemetryOptOut", "");
    cb.type = "checkbox";
    cb.checked = false;
    dispatch("saveTelemetryOptOut");
    expect(localStorage.getItem("wedding_v1_telemetry_opt_out")).toBeNull();
  });

  it("addRegistryLink delegates to registrySection.addRegistryLink", () => {
    register();
    dispatch("addRegistryLink");
    expect(_addRegistryLinkMock).toHaveBeenCalledTimes(1);
  });

  it("addRegistryPreset delegates to registrySection.addRegistryPreset with platformId", () => {
    register();
    const fn = _handlers.get("addRegistryPreset");
    const el = document.createElement("button");
    el.dataset.actionArg = "buyme";
    fn(el);
    expect(_addRegistryPresetMock).toHaveBeenCalledWith("buyme");
  });

  it("addRegistryPreset does nothing when platformId is empty", () => {
    register();
    const fn = _handlers.get("addRegistryPreset");
    const el = document.createElement("button");
    el.dataset.actionArg = "";
    fn(el);
    expect(_addRegistryPresetMock).not.toHaveBeenCalled();
  });

  it("addApprovedEmail calls addApprovedEmail and logs", () => {
    register();
    dispatch("addApprovedEmail");
    expect(_addApprovedEmailMock).toHaveBeenCalledTimes(1);
  });

  it("removeApprovedEmail calls removeApprovedEmail with element", () => {
    register();
    const fn = _handlers.get("removeApprovedEmail");
    const el = document.createElement("button");
    fn(el);
    expect(_removeApprovedEmailMock).toHaveBeenCalledWith(el);
  });

  it("clearAllData calls clearAllData", () => {
    register();
    dispatch("clearAllData");
    expect(_clearAllDataMock).toHaveBeenCalledTimes(1);
  });

  it("switchLanguage calls switchLanguage and toasts", async () => {
    register();
    await dispatch("switchLanguage");
    expect(_switchLanguageMock).toHaveBeenCalledTimes(1);
    expect(_toastCalls[0]?.type).toBe("info");
  });

  it("toggleLanguage calls switchLanguage and toasts", async () => {
    register();
    await dispatch("toggleLanguage");
    expect(_switchLanguageMock).toHaveBeenCalledTimes(1);
    expect(_toastCalls[0]?.type).toBe("info");
  });

  it("clearAuditLog calls clearAuditLog", () => {
    register();
    dispatch("clearAuditLog");
    expect(_clearAuditLogMock).toHaveBeenCalledTimes(1);
  });

  it("clearErrorLog calls clearErrorLog", () => {
    register();
    dispatch("clearErrorLog");
    expect(_clearErrorLogMock).toHaveBeenCalledTimes(1);
  });

  it("exportJSON calls exportJSON", () => {
    register();
    dispatch("exportJSON");
    expect(_exportJSONMock).toHaveBeenCalledTimes(1);
  });

  it("importJSON calls importJSON with element", () => {
    register();
    const fn = _handlers.get("importJSON");
    const el = document.createElement("input");
    fn(el);
    expect(_importJSONMock).toHaveBeenCalledWith(el);
  });

  it("copyRsvpLink calls copyRsvpLink and toasts copied", () => {
    register();
    dispatch("copyRsvpLink");
    expect(_copyRsvpLinkMock).toHaveBeenCalledTimes(1);
    expect(_toastCalls[0]?.msg).toBe("copied");
  });

  it("copyContactLink calls copyContactLink and toasts copied", () => {
    register();
    dispatch("copyContactLink");
    expect(_copyContactLinkMock).toHaveBeenCalledTimes(1);
    expect(_toastCalls[0]?.msg).toBe("copied");
  });

  it("generateRsvpQrCode calls generateRsvpQrCode", () => {
    register();
    dispatch("generateRsvpQrCode");
    expect(_generateRsvpQrCodeMock).toHaveBeenCalledTimes(1);
  });

  it("setTheme calls applyTheme with actionArg and toasts", () => {
    register();
    dispatch("setTheme", { actionArg: "rosegold" });
    expect(_applyThemeMock).toHaveBeenCalledWith("rosegold");
    expect(_toastCalls[0]?.type).toBe("success");
  });

  it("resetThemeVars calls resetThemeVars", () => {
    register();
    dispatch("resetThemeVars");
    expect(_resetThemeVarsMock).toHaveBeenCalledTimes(1);
  });

  it("exportThemeJson calls exportThemeToJson", () => {
    register();
    dispatch("exportThemeJson");
    expect(_exportThemeMock).toHaveBeenCalledTimes(1);
  });

  it("importThemeJson calls importThemeFromJson", () => {
    register();
    dispatch("importThemeJson");
    expect(_importThemeMock).toHaveBeenCalledTimes(1);
  });

  it("saveWebsiteConfig calls saveWebsiteConfig", () => {
    register();
    dispatch("saveWebsiteConfig");
    expect(_saveWebsiteConfigMock).toHaveBeenCalledTimes(1);
  });

  it("previewWebsite calls previewWebsite", () => {
    register();
    dispatch("previewWebsite");
    expect(_previewWebsiteMock).toHaveBeenCalledTimes(1);
  });

  it("installPlugin calls installPlugin", () => {
    register();
    dispatch("installPlugin");
    expect(_installPluginMock).toHaveBeenCalledTimes(1);
  });

  it("toggleMonitoring calls toggleMonitoring", () => {
    register();
    dispatch("toggleMonitoring");
    expect(_toggleMonitoringMock).toHaveBeenCalledTimes(1);
  });

  it("startAutoBackup calls startAutoBackup with interval from input", () => {
    register();
    const el = addInput("autoBackupInterval", "15");
    dispatch("startAutoBackup");
    expect(_startAutoBackupMock).toHaveBeenCalledWith(15);
    expect(_toastCalls[0]?.type).toBe("success");
    el.remove();
  });

  it("startAutoBackup defaults to 30 when no input", () => {
    register();
    const existing = document.getElementById("autoBackupInterval");
    if (existing) existing.remove();
    dispatch("startAutoBackup");
    expect(_startAutoBackupMock).toHaveBeenCalledWith(30);
  });

  it("stopAutoBackup calls stopAutoBackup and toasts", () => {
    register();
    dispatch("stopAutoBackup");
    expect(_stopAutoBackupMock).toHaveBeenCalledTimes(1);
    expect(_toastCalls[0]?.type).toBe("info");
  });

  it("downloadAutoBackup calls downloadAutoBackup", () => {
    register();
    dispatch("downloadAutoBackup");
    expect(_downloadAutoBackupMock).toHaveBeenCalledTimes(1);
  });

  it("restoreAutoBackup calls restoreAutoBackup when confirm=true", () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    register();
    dispatch("restoreAutoBackup");
    expect(_restoreAutoBackupMock).toHaveBeenCalledTimes(1);
    expect(_toastCalls[0]?.type).toBe("success");
  });

  it("restoreAutoBackup aborts when confirm=false", () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    register();
    dispatch("restoreAutoBackup");
    expect(_restoreAutoBackupMock).not.toHaveBeenCalled();
  });

  it("exportAllCSV calls exportAllCSV and toasts", async () => {
    register();
    await dispatch("exportAllCSV");
    expect(_exportAllCSVMock).toHaveBeenCalledTimes(1);
    expect(_toastCalls[0]?.type).toBe("info");
  });

  it("checkDataIntegrity toasts success when ok=true", () => {
    register();
    _checkDataIntegrityMock.mockReturnValue({ ok: true, issues: [] });
    dispatch("checkDataIntegrity");
    expect(_toastCalls[0]?.type).toBe("success");
  });

  it("checkDataIntegrity toasts error when issues exist", () => {
    register();
    _checkDataIntegrityMock.mockReturnValue({ ok: false, issues: ["dup1", "dup2"] });
    dispatch("checkDataIntegrity");
    expect(_toastCalls[0]?.type).toBe("error");
  });

  it("exportDebugReport calls exportDebugReport", () => {
    register();
    dispatch("exportDebugReport");
    expect(_exportDebugReportMock).toHaveBeenCalledTimes(1);
  });

  it("resolveConflicts does nothing when no conflicts", async () => {
    register();
    _getPendingConflictsMock.mockReturnValue([]);
    await dispatch("resolveConflicts");
    expect(_showConflictModalMock).not.toHaveBeenCalled();
  });

  it("resolveConflicts shows conflict modal when conflicts exist", async () => {
    register();
    _getPendingConflictsMock.mockReturnValue([{ key: "guests" }]);
    await dispatch("resolveConflicts");
    expect(_showConflictModalMock).toHaveBeenCalled();
  });

  it("startAdminSignIn calls startAdminSignIn with actionArg", async () => {
    register();
    await dispatch("startAdminSignIn", { actionArg: "google" });
    expect(_startAdminSignInMock).toHaveBeenCalledWith("google");
  });

  it("refreshAdminList calls refreshAdminList", async () => {
    register();
    await dispatch("refreshAdminList");
    expect(_refreshAdminListMock).toHaveBeenCalledTimes(1);
  });

  it("checkIsApprovedAdmin calls checkIsApprovedAdmin with email input", async () => {
    register();
    addInput("newApproveEmail", "admin@test.com");
    await dispatch("checkIsApprovedAdmin");
    expect(_checkIsApprovedAdminMock).toHaveBeenCalledWith("admin@test.com");
  });

  it("checkIsApprovedAdmin skips when email is empty", async () => {
    register();
    addInput("newApproveEmail", "");
    await dispatch("checkIsApprovedAdmin");
    expect(_checkIsApprovedAdminMock).not.toHaveBeenCalled();
  });

  it("resetOnboarding calls resetOnboarding", () => {
    register();
    dispatch("resetOnboarding");
    expect(_resetOnboardingMock).toHaveBeenCalledTimes(1);
  });

  it("sendMagicLink calls sendMagicLink with email input", async () => {
    register();
    addInput("magicLinkEmail", "user@test.com");
    await dispatch("sendMagicLink");
    expect(_sendMagicLinkMock).toHaveBeenCalledWith("user@test.com");
  });

  it("sendMagicLink skips when email is empty", async () => {
    register();
    addInput("magicLinkEmail", "");
    await dispatch("sendMagicLink");
    expect(_sendMagicLinkMock).not.toHaveBeenCalled();
  });

  it("loginAnonymousSupabase calls loginSupabaseAnonymous", async () => {
    register();
    await dispatch("loginAnonymousSupabase");
    expect(_loginAnonMock).toHaveBeenCalledTimes(1);
  });
});
