/**
 * tests/unit/table-handlers.test.mjs — S322: coverage for src/handlers/table-handlers.js
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

const _saveTableMock = vi.fn(() => ({ ok: true }));
const _deleteTableMock = vi.fn();
const _autoAssignMock = vi.fn();
const _printSeatingMock = vi.fn();
const _printPlaceCardsMock = vi.fn();
const _printTableSignsMock = vi.fn();
const _openTableForEditMock = vi.fn();
const _exportTransportCSVMock = vi.fn();
const _printTransportManifestMock = vi.fn();
const _exportSeatMapCsvMock = vi.fn();
const _exportSeatMapJsonMock = vi.fn();

vi.mock("../../src/sections/tables.js", () => ({
  saveTable: (...a) => _saveTableMock(...a),
  deleteTable: (...a) => _deleteTableMock(...a),
  autoAssignTables: () => _autoAssignMock(),
  printSeatingChart: () => _printSeatingMock(),
  printPlaceCards: () => _printPlaceCardsMock(),
  printTableSigns: () => _printTableSignsMock(),
  openTableForEdit: (...a) => _openTableForEditMock(...a),
  exportTransportCSV: () => _exportTransportCSVMock(),
  printTransportManifest: () => _printTransportManifestMock(),
  exportSeatMapCsv: () => _exportSeatMapCsvMock(),
  exportSeatMapJson: () => _exportSeatMapJsonMock(),
}));

const _toastCalls = [];
const _closedModals = [];
const _confirmCallbacks = [];

vi.mock("../../src/core/ui.js", () => ({
  showToast: vi.fn((msg, type) => _toastCalls.push({ msg, type })),
  openModal: vi.fn(),
  closeModal: vi.fn((id) => _closedModals.push(id)),
  showConfirmDialog: vi.fn((_msg, cb) => _confirmCallbacks.push(cb)),
}));

vi.mock("../../src/core/i18n.js", () => ({
  t: (k) => k,
}));

// ── Import after mocks ────────────────────────────────────────────────────

import { register } from "../../src/handlers/table-handlers.js";

// ── Helpers ───────────────────────────────────────────────────────────────

/** Dispatch a handler by action name with an optional fake element. */
function dispatch(action, dataset = {}) {
  const fn = _handlers.get(action);
  if (!fn) throw new Error(`Handler not registered: ${action}`);
  const el = document.createElement("button");
  for (const [k, v] of Object.entries(dataset)) el.dataset[k] = v;
  fn(el, new MouseEvent("click"));
}

// ── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  _handlers.clear();
  _toastCalls.length = 0;
  _closedModals.length = 0;
  _confirmCallbacks.length = 0;
  vi.clearAllMocks();

  // Reset DOM
  document.body.innerHTML = `
    <input id="tableName" value="Table A" />
    <input id="tableCapacity" value="8" />
    <select id="tableShape"><option value="round" selected>Round</option></select>
    <input id="tableModalId" value="" />
  `;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("S322 — tableHandlers — register()", () => {
  it("registers expected action handlers", () => {
    register();
    const expected = [
      "saveTable", "autoAssignTables", "printSeatingChart", "printPlaceCards",
      "printTableSigns", "exportTransportCSV", "printTransportManifest",
      "exportSeatMapCsv", "exportSeatMapJson", "printTableLayout",
      "deleteTable", "openEditTableModal",
    ];
    for (const action of expected) {
      expect(_handlers.has(action), `missing handler: ${action}`).toBe(true);
    }
  });

  describe("saveTable handler", () => {
    it("calls saveTable with form values on success", () => {
      register();
      dispatch("saveTable");
      expect(_saveTableMock).toHaveBeenCalledWith(
        { name: "Table A", capacity: "8", shape: "round" },
        null,
      );
    });

    it("closes modal and shows success toast on ok result", () => {
      _saveTableMock.mockReturnValue({ ok: true });
      register();
      dispatch("saveTable");
      expect(_closedModals).toContain("tableModal");
      expect(_toastCalls.some((c) => c.type === "success")).toBe(true);
    });

    it("shows error toast when saveTable returns errors", () => {
      _saveTableMock.mockReturnValue({ ok: false, errors: ["Name required"] });
      register();
      dispatch("saveTable");
      expect(_toastCalls.some((c) => c.type === "error")).toBe(true);
    });

    it("uses tableModalId when editing existing table", () => {
      document.getElementById("tableModalId").value = "t-42";
      register();
      dispatch("saveTable");
      expect(_saveTableMock).toHaveBeenCalledWith(expect.any(Object), "t-42");
    });

    it("defaults capacity to '10' when field is empty", () => {
      document.getElementById("tableCapacity").value = "";
      register();
      dispatch("saveTable");
      expect(_saveTableMock).toHaveBeenCalledWith(
        expect.objectContaining({ capacity: "10" }),
        null,
      );
    });
  });

  it("autoAssignTables delegates to section function", () => {
    register();
    dispatch("autoAssignTables");
    expect(_autoAssignMock).toHaveBeenCalledTimes(1);
  });

  it("printSeatingChart delegates to section function", () => {
    register();
    dispatch("printSeatingChart");
    expect(_printSeatingMock).toHaveBeenCalledTimes(1);
  });

  it("printPlaceCards delegates to section function", () => {
    register();
    dispatch("printPlaceCards");
    expect(_printPlaceCardsMock).toHaveBeenCalledTimes(1);
  });

  it("printTableSigns delegates to section function", () => {
    register();
    dispatch("printTableSigns");
    expect(_printTableSignsMock).toHaveBeenCalledTimes(1);
  });

  it("exportTransportCSV delegates to section function", () => {
    register();
    dispatch("exportTransportCSV");
    expect(_exportTransportCSVMock).toHaveBeenCalledTimes(1);
  });

  it("exportSeatMapCsv delegates to section function", () => {
    register();
    dispatch("exportSeatMapCsv");
    expect(_exportSeatMapCsvMock).toHaveBeenCalledTimes(1);
  });

  it("exportSeatMapJson delegates to section function", () => {
    register();
    dispatch("exportSeatMapJson");
    expect(_exportSeatMapJsonMock).toHaveBeenCalledTimes(1);
  });

  describe("deleteTable handler", () => {
    it("calls showConfirmDialog before deleting", () => {
      register();
      dispatch("deleteTable", { actionArg: "t-99" });
      expect(_confirmCallbacks).toHaveLength(1);
      expect(_deleteTableMock).not.toHaveBeenCalled();
    });

    it("calls deleteTable with actionArg when confirmed", () => {
      register();
      dispatch("deleteTable", { actionArg: "t-99" });
      _confirmCallbacks[0](); // simulate confirmation
      expect(_deleteTableMock).toHaveBeenCalledWith("t-99");
    });
  });

  describe("openEditTableModal handler", () => {
    it("calls openTableForEdit with actionArg", () => {
      register();
      dispatch("openEditTableModal", { actionArg: "t-7" });
      expect(_openTableForEditMock).toHaveBeenCalledWith("t-7");
    });
  });
});
