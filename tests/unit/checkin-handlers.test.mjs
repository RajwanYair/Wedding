/**
 * tests/unit/checkin-handlers.test.mjs — S322: coverage for src/handlers/checkin-handlers.js
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Capture registered handlers ──────────────────────────────────────────

/** @type {Map<string, Function>} */
const _handlers = new Map();

vi.mock("../../src/core/events.js", () => ({
  on: vi.fn((action, fn) => _handlers.set(action, fn)),
}));

// ── Mock dependencies ─────────────────────────────────────────────────────

const _checkInGuestMock = vi.fn();
const _setCheckinSearchMock = vi.fn();
const _exportCheckinReportMock = vi.fn();
const _resetAllCheckinsMock = vi.fn();
const _toggleGiftModeMock = vi.fn();
const _startQrScanMock = vi.fn();
const _stopQrScanMock = vi.fn();
const _startNFCMock = vi.fn();
const _stopNFCMock = vi.fn();
const _printQrBadgesMock = vi.fn();

vi.mock("../../src/sections/checkin.js", () => ({
  checkInGuest: (...a) => _checkInGuestMock(...a),
  setCheckinSearch: (...a) => _setCheckinSearchMock(...a),
  exportCheckinReport: () => _exportCheckinReportMock(),
  resetAllCheckins: () => _resetAllCheckinsMock(),
  toggleGiftMode: () => _toggleGiftModeMock(),
  startQrScan: () => _startQrScanMock(),
  stopQrScan: () => _stopQrScanMock(),
  startNFCCheckin: () => _startNFCMock(),
  stopNFCCheckin: () => _stopNFCMock(),
  printGuestQrBadges: () => _printQrBadgesMock(),
}));

const _bulkCheckInMock = vi.fn(() => Promise.resolve());

vi.mock("../../src/services/guest-service.js", () => ({
  bulkCheckIn: (...a) => _bulkCheckInMock(...a),
}));

const _toastCalls = [];
const _confirmCallbacks = [];

vi.mock("../../src/core/ui.js", () => ({
  showToast: vi.fn((msg, type) => _toastCalls.push({ msg, type })),
  showConfirmDialog: vi.fn((_msg, cb) => _confirmCallbacks.push(cb)),
}));

vi.mock("../../src/core/i18n.js", () => ({
  t: (k, _opts) => k,
}));

vi.mock("../../src/services/security.js", () => ({
  writeNFCTag: vi.fn(() => Promise.resolve()),
}));

// ── Import after mocks ────────────────────────────────────────────────────

import { register } from "../../src/handlers/checkin-handlers.js";

// ── Helpers ───────────────────────────────────────────────────────────────

/** Dispatch a handler by action name. */
function dispatch(action, dataset = {}, eventTarget = null) {
  const fn = _handlers.get(action);
  if (!fn) throw new Error(`Handler not registered: ${action}`);
  const el = document.createElement("button");
  for (const [k, v] of Object.entries(dataset)) el.dataset[k] = v;
  const evt = new MouseEvent("click");
  if (eventTarget) Object.defineProperty(evt, "target", { value: eventTarget });
  return fn(el, evt);
}

// ── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  _handlers.clear();
  _toastCalls.length = 0;
  _confirmCallbacks.length = 0;
  vi.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("S322 — checkinHandlers — register()", () => {
  it("registers expected action handlers", () => {
    register();
    const expected = [
      "checkInGuest", "checkinSearch", "exportCheckinReport", "resetAllCheckins",
      "toggleGiftMode", "startQrScan", "stopQrScan",
      "startNFCCheckin", "stopNFCCheckin", "printGuestQrBadges",
      "writeNFCForGuest", "bulkCheckIn",
    ];
    for (const action of expected) {
      expect(_handlers.has(action), `missing handler: ${action}`).toBe(true);
    }
  });

  it("checkInGuest calls checkInGuest with actionArg", () => {
    register();
    dispatch("checkInGuest", { actionArg: "g-123" });
    expect(_checkInGuestMock).toHaveBeenCalledWith("g-123");
  });

  it("checkinSearch calls setCheckinSearch with input value", () => {
    register();
    const input = document.createElement("input");
    input.value = "Alice";
    dispatch("checkinSearch", {}, input);
    expect(_setCheckinSearchMock).toHaveBeenCalledWith("Alice");
  });

  it("checkinSearch passes empty string when event target is not input", () => {
    register();
    dispatch("checkinSearch", {}, null);
    expect(_setCheckinSearchMock).toHaveBeenCalledWith("");
  });

  it("exportCheckinReport delegates to section function", () => {
    register();
    dispatch("exportCheckinReport");
    expect(_exportCheckinReportMock).toHaveBeenCalledTimes(1);
  });

  describe("resetAllCheckins handler", () => {
    it("shows confirm dialog before resetting", () => {
      register();
      dispatch("resetAllCheckins");
      expect(_confirmCallbacks).toHaveLength(1);
      expect(_resetAllCheckinsMock).not.toHaveBeenCalled();
    });

    it("calls resetAllCheckins when confirmed", () => {
      register();
      dispatch("resetAllCheckins");
      _confirmCallbacks[0]();
      expect(_resetAllCheckinsMock).toHaveBeenCalledTimes(1);
    });
  });

  it("toggleGiftMode delegates to section function", () => {
    register();
    dispatch("toggleGiftMode");
    expect(_toggleGiftModeMock).toHaveBeenCalledTimes(1);
  });

  it("startQrScan delegates to section function", () => {
    register();
    dispatch("startQrScan");
    expect(_startQrScanMock).toHaveBeenCalledTimes(1);
  });

  it("stopQrScan delegates to section function", () => {
    register();
    dispatch("stopQrScan");
    expect(_stopQrScanMock).toHaveBeenCalledTimes(1);
  });

  it("startNFCCheckin delegates to section function", () => {
    register();
    dispatch("startNFCCheckin");
    expect(_startNFCMock).toHaveBeenCalledTimes(1);
  });

  it("stopNFCCheckin delegates to section function", () => {
    register();
    dispatch("stopNFCCheckin");
    expect(_stopNFCMock).toHaveBeenCalledTimes(1);
  });

  it("printGuestQrBadges delegates to section function", () => {
    register();
    dispatch("printGuestQrBadges");
    expect(_printQrBadgesMock).toHaveBeenCalledTimes(1);
  });

  describe("bulkCheckIn handler", () => {
    it("calls bulkCheckIn with split ids and shows success toast", async () => {
      register();
      await dispatch("bulkCheckIn", { actionArg: "g-1,g-2,g-3" });
      expect(_bulkCheckInMock).toHaveBeenCalledWith(["g-1", "g-2", "g-3"]);
      expect(_toastCalls.some((c) => c.type === "success")).toBe(true);
    });

    it("does nothing when actionArg is empty", async () => {
      register();
      await dispatch("bulkCheckIn", { actionArg: "" });
      expect(_bulkCheckInMock).not.toHaveBeenCalled();
    });
  });
});
