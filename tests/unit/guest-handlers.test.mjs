/**
 * tests/unit/guest-handlers.test.mjs — S328: coverage for src/handlers/guest-handlers.js
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

const _saveGuestMock = vi.fn(() => ({ ok: true }));
const _deleteGuestMock = vi.fn();
const _setFilterMock = vi.fn();
const _setSideFilterMock = vi.fn();
const _setSortFieldMock = vi.fn();
const _setSearchQueryMock = vi.fn();
const _exportGuestsCSVMock = vi.fn();
const _printGuestsMock = vi.fn();
const _downloadCSVTemplateMock = vi.fn();
const _importGuestsCSVMock = vi.fn();
const _openGuestForEditMock = vi.fn();
const _toggleSelectAllMock = vi.fn();
const _batchSetStatusMock = vi.fn();
const _batchDeleteGuestsMock = vi.fn();
const _renderDuplicatesMock = vi.fn();
const _mergeGuestsMock = vi.fn();

vi.mock("../../src/sections/guests.js", () => ({
  saveGuest: (...a) => _saveGuestMock(...a),
  deleteGuest: (...a) => _deleteGuestMock(...a),
  setFilter: (...a) => _setFilterMock(...a),
  setSideFilter: (...a) => _setSideFilterMock(...a),
  setSortField: (...a) => _setSortFieldMock(...a),
  setSearchQuery: (...a) => _setSearchQueryMock(...a),
  exportGuestsCSV: () => _exportGuestsCSVMock(),
  printGuests: () => _printGuestsMock(),
  downloadCSVTemplate: () => _downloadCSVTemplateMock(),
  importGuestsCSV: () => _importGuestsCSVMock(),
  openGuestForEdit: (...a) => _openGuestForEditMock(...a),
  toggleSelectAll: () => _toggleSelectAllMock(),
  batchSetStatus: (...a) => _batchSetStatusMock(...a),
  batchDeleteGuests: () => _batchDeleteGuestsMock(),
  renderDuplicates: () => _renderDuplicatesMock(),
  mergeGuests: (...a) => _mergeGuestsMock(...a),
}));

const _batchMarkInvitationSentMock = vi.fn(() => Promise.resolve());

vi.mock("../../src/sections/invitation.js", () => ({
  batchMarkInvitationSent: (...a) => _batchMarkInvitationSentMock(...a),
}));

const _toastCalls = [];
const _confirmCallbacks = [];
const _openModalMock = vi.fn();
const _closeModalMock = vi.fn();

vi.mock("../../src/core/ui.js", () => ({
  showToast: vi.fn((msg, type) => _toastCalls.push({ msg, type })),
  showConfirmDialog: vi.fn((_msg, cb) => _confirmCallbacks.push(cb)),
  openModal: (...a) => _openModalMock(...a),
  closeModal: (...a) => _closeModalMock(...a),
}));

vi.mock("../../src/core/i18n.js", () => ({
  t: (k, _opts) => k,
}));

// pdf-export lazy import — stub as module
vi.mock("../../src/utils/pdf-export.js", () => ({
  printGuestList: vi.fn(),
}));

// ── Import after mocks ────────────────────────────────────────────────────

import { register } from "../../src/handlers/guest-handlers.js";

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

/** Create a form input attached to the document body. */
function addInput(id, value, type = "text") {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("input");
    el.id = id;
    document.body.appendChild(el);
  }
  el.type = type;
  if (type === "checkbox") el.checked = value === "true";
  else el.value = value;
  return el;
}

// ── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  _handlers.clear();
  _toastCalls.length = 0;
  _confirmCallbacks.length = 0;
  vi.clearAllMocks();
  // Reset saveGuest mock return value to ok by default
  _saveGuestMock.mockReturnValue({ ok: true });
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("S328 — guestHandlers — register()", () => {
  it("registers all expected action handlers", () => {
    register();
    const expected = [
      "saveGuest", "setFilter", "setSideFilter", "sortGuestsBy",
      "exportGuestsCSV", "printGuests", "downloadCSVTemplate", "importGuestsCSV",
      "deleteGuest", "searchGuests", "openEditGuestModal",
      "toggleSelectAll", "batchSetStatus", "batchDeleteGuests",
      "scanDuplicates", "mergeGuests", "printGuestList", "batchMarkInvitationSent",
    ];
    for (const action of expected) {
      expect(_handlers.has(action), `missing handler: ${action}`).toBe(true);
    }
  });

  it("saveGuest — success closes modal and shows toast", () => {
    register();
    addInput("guestFirstName", "Alice");
    addInput("guestLastName", "Cohen");
    addInput("guestPhone", "0541234567");
    addInput("guestEmail", "alice@test.com");
    addInput("guestCount2", "2");
    addInput("guestChildren", "1");
    addInput("guestStatus", "confirmed");
    addInput("guestSide", "bride");
    addInput("guestGroup", "family");
    addInput("guestMeal", "vegan");
    addInput("guestAccessibility", "");
    addInput("guestTransport", "");
    addInput("guestMealNotes", "");
    addInput("guestTableSelect", "");
    addInput("guestGift", "");
    addInput("guestNotes", "");
    addInput("guestModalId", "");
    _saveGuestMock.mockReturnValue({ ok: true });
    dispatch("saveGuest");
    expect(_closeModalMock).toHaveBeenCalledWith("guestModal");
    expect(_toastCalls[0]?.type).toBe("success");
  });

  it("saveGuest — failure shows error toast", () => {
    register();
    _saveGuestMock.mockReturnValue({ ok: false, errors: ["Phone invalid"] });
    dispatch("saveGuest");
    expect(_toastCalls[0]?.type).toBe("error");
    expect(_toastCalls[0]?.msg).toBe("Phone invalid");
  });

  it("saveGuest — failure without errors shows generic error key", () => {
    register();
    _saveGuestMock.mockReturnValue({ ok: false });
    dispatch("saveGuest");
    expect(_toastCalls[0]?.type).toBe("error");
    expect(_toastCalls[0]?.msg).toBe("error_save");
  });

  it("saveGuest — checkbox input for accessibility", () => {
    register();
    addInput("guestAccessibility", "true", "checkbox");
    dispatch("saveGuest");
    expect(_saveGuestMock).toHaveBeenCalled();
    const data = _saveGuestMock.mock.calls[0][0];
    expect(data.accessibility).toBe("true");
  });

  it("setFilter delegates to section setFilter with dataset.filter", () => {
    register();
    dispatch("setFilter", { filter: "confirmed" });
    expect(_setFilterMock).toHaveBeenCalledWith("confirmed");
  });

  it("setFilter defaults to 'all' when no filter in dataset", () => {
    register();
    dispatch("setFilter", {});
    expect(_setFilterMock).toHaveBeenCalledWith("all");
  });

  it("setSideFilter delegates to section setSideFilter", () => {
    register();
    dispatch("setSideFilter", { side: "bride" });
    expect(_setSideFilterMock).toHaveBeenCalledWith("bride");
  });

  it("setSideFilter defaults to 'all'", () => {
    register();
    dispatch("setSideFilter", {});
    expect(_setSideFilterMock).toHaveBeenCalledWith("all");
  });

  it("sortGuestsBy delegates to setSortField with actionArg", () => {
    register();
    dispatch("sortGuestsBy", { actionArg: "firstName" });
    expect(_setSortFieldMock).toHaveBeenCalledWith("firstName");
  });

  it("exportGuestsCSV calls exportGuestsCSV", () => {
    register();
    dispatch("exportGuestsCSV");
    expect(_exportGuestsCSVMock).toHaveBeenCalledTimes(1);
  });

  it("printGuests calls printGuests", () => {
    register();
    dispatch("printGuests");
    expect(_printGuestsMock).toHaveBeenCalledTimes(1);
  });

  it("downloadCSVTemplate calls downloadCSVTemplate", () => {
    register();
    dispatch("downloadCSVTemplate");
    expect(_downloadCSVTemplateMock).toHaveBeenCalledTimes(1);
  });

  it("importGuestsCSV calls importGuestsCSV", () => {
    register();
    dispatch("importGuestsCSV");
    expect(_importGuestsCSVMock).toHaveBeenCalledTimes(1);
  });

  it("importGuestsCSV shows success toast on csvImportDone event", () => {
    register();
    dispatch("importGuestsCSV");
    const evt = new CustomEvent("csvImportDone", { detail: { added: 3, updated: 1 } });
    document.dispatchEvent(evt);
    expect(_toastCalls[0]?.type).toBe("success");
  });

  it("deleteGuest calls showConfirmDialog and on confirm calls deleteGuest", () => {
    register();
    dispatch("deleteGuest", { actionArg: "g-abc" });
    expect(_confirmCallbacks.length).toBe(1);
    _confirmCallbacks[0]();
    expect(_deleteGuestMock).toHaveBeenCalledWith("g-abc");
  });

  it("searchGuests calls setSearchQuery with input value", () => {
    register();
    const input = document.createElement("input");
    input.value = "Bob";
    dispatch("searchGuests", {}, input);
    expect(_setSearchQueryMock).toHaveBeenCalledWith("Bob");
  });

  it("searchGuests passes empty string when target is not input", () => {
    register();
    dispatch("searchGuests", {}, null);
    expect(_setSearchQueryMock).toHaveBeenCalledWith("");
  });

  it("openEditGuestModal calls openGuestForEdit and openModal", () => {
    register();
    dispatch("openEditGuestModal", { actionArg: "g-xyz" });
    expect(_openGuestForEditMock).toHaveBeenCalledWith("g-xyz");
    expect(_openModalMock).toHaveBeenCalledWith("guestModal");
  });

  it("toggleSelectAll calls toggleSelectAll", () => {
    register();
    dispatch("toggleSelectAll");
    expect(_toggleSelectAllMock).toHaveBeenCalledTimes(1);
  });

  it("batchSetStatus calls batchSetStatus with select value and shows toast", () => {
    register();
    const select = document.createElement("select");
    select.id = "batchStatusSelect";
    select.innerHTML = '<option value="confirmed">Confirmed</option>';
    select.value = "confirmed";
    document.body.appendChild(select);
    dispatch("batchSetStatus");
    expect(_batchSetStatusMock).toHaveBeenCalledWith("confirmed");
    expect(_toastCalls[0]?.type).toBe("success");
    document.body.removeChild(select);
  });

  it("batchSetStatus does nothing when no value selected", () => {
    register();
    // Remove any existing select
    const existing = document.getElementById("batchStatusSelect");
    if (existing) existing.remove();
    dispatch("batchSetStatus");
    expect(_batchSetStatusMock).not.toHaveBeenCalled();
  });

  it("batchDeleteGuests calls showConfirmDialog and on confirm deletes + toasts", () => {
    register();
    dispatch("batchDeleteGuests");
    expect(_confirmCallbacks.length).toBe(1);
    _confirmCallbacks[0]();
    expect(_batchDeleteGuestsMock).toHaveBeenCalledTimes(1);
    expect(_toastCalls[0]?.type).toBe("success");
  });

  it("scanDuplicates calls renderDuplicates", () => {
    register();
    dispatch("scanDuplicates");
    expect(_renderDuplicatesMock).toHaveBeenCalledTimes(1);
  });

  it("mergeGuests calls mergeGuests with keepId+mergeId, shows toast, re-renders", () => {
    register();
    dispatch("mergeGuests", { keepId: "g-1", mergeId: "g-2" });
    expect(_mergeGuestsMock).toHaveBeenCalledWith("g-1", "g-2");
    expect(_toastCalls[0]?.type).toBe("success");
    expect(_renderDuplicatesMock).toHaveBeenCalledTimes(1);
  });

  it("batchMarkInvitationSent calls batchMarkInvitationSent with ids from event detail", async () => {
    register();
    const fn = _handlers.get("batchMarkInvitationSent");
    const el = document.createElement("button");
    const evt = new CustomEvent("batchMarkInvitationSent", { detail: { ids: ["g-1", "g-2"] } });
    await fn(el, evt);
    expect(_batchMarkInvitationSentMock).toHaveBeenCalledWith(["g-1", "g-2"]);
  });

  it("batchMarkInvitationSent handles missing detail gracefully", async () => {
    register();
    const fn = _handlers.get("batchMarkInvitationSent");
    const el = document.createElement("button");
    const evt = new CustomEvent("batchMarkInvitationSent");
    await fn(el, evt);
    expect(_batchMarkInvitationSentMock).toHaveBeenCalledWith([]);
  });
});
