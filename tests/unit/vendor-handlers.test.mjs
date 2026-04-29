/**
 * tests/unit/vendor-handlers.test.mjs — S323: coverage for src/handlers/vendor-handlers.js
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Capture registered handlers ──────────────────────────────────────────

/** @type {Map<string, Function>} */
const _handlers = new Map();

vi.mock("../../src/core/events.js", () => ({
  on: vi.fn((action, fn) => _handlers.set(action, fn)),
}));

// ── Store ─────────────────────────────────────────────────────────────────

const _store = new Map();

vi.mock("../../src/core/store.js", () => ({
  storeGet: (k) => _store.get(k) ?? null,
  storeSet: vi.fn((k, v) => _store.set(k, v)),
  storeSubscribe: vi.fn(() => () => {}),
  storeSubscribeScoped: vi.fn(() => () => {}),
  cleanupScope: vi.fn(),
}));

// ── Section mocks ─────────────────────────────────────────────────────────

const _saveVendorMock = vi.fn(() => ({ ok: true }));
const _deleteVendorMock = vi.fn();
const _exportVendorsMock = vi.fn();
const _exportVendorPaymentsMock = vi.fn();
const _filterVendorsMock = vi.fn();
const _openVendorForEditMock = vi.fn();
const _setVendorPaymentFilterMock = vi.fn();

vi.mock("../../src/sections/vendors.js", () => ({
  saveVendor: (...a) => _saveVendorMock(...a),
  deleteVendor: (...a) => _deleteVendorMock(...a),
  exportVendorsCSV: () => _exportVendorsMock(),
  exportVendorPaymentsCSV: () => _exportVendorPaymentsMock(),
  filterVendorsByCategory: (...a) => _filterVendorsMock(...a),
  openVendorForEdit: (...a) => _openVendorForEditMock(...a),
  setVendorPaymentFilter: (...a) => _setVendorPaymentFilterMock(...a),
}));

const _saveExpenseMock = vi.fn(() => ({ ok: true }));
const _deleteExpenseMock = vi.fn();
const _exportExpensesMock = vi.fn();
const _openExpenseForEditMock = vi.fn();

vi.mock("../../src/sections/expenses.js", () => ({
  saveExpense: (...a) => _saveExpenseMock(...a),
  deleteExpense: (...a) => _deleteExpenseMock(...a),
  exportExpensesCSV: () => _exportExpensesMock(),
  openExpenseForEdit: (...a) => _openExpenseForEditMock(...a),
}));

const _deleteBudgetEntryMock = vi.fn();
const _renderBudgetProgressMock = vi.fn();

vi.mock("../../src/sections/budget.js", () => ({
  deleteBudgetEntry: (...a) => _deleteBudgetEntryMock(...a),
  renderBudgetProgress: () => _renderBudgetProgressMock(),
}));

const _renderBudgetChartMock = vi.fn();
const _exportAnalyticsPDFMock = vi.fn();
const _exportAnalyticsCSVMock = vi.fn();
const _exportMealPerTableCSVMock = vi.fn();
const _printMealPerTableMock = vi.fn();
const _exportEventSummaryMock = vi.fn();
const _printDietaryCardsMock = vi.fn();

vi.mock("../../src/sections/analytics.js", () => ({
  renderBudgetChart: () => _renderBudgetChartMock(),
  exportAnalyticsPDF: () => _exportAnalyticsPDFMock(),
  exportAnalyticsCSV: () => _exportAnalyticsCSVMock(),
  exportMealPerTableCSV: () => _exportMealPerTableCSVMock(),
  printMealPerTable: () => _printMealPerTableMock(),
  exportEventSummary: () => _exportEventSummaryMock(),
  printDietaryCards: () => _printDietaryCardsMock(),
}));

// ── UI mocks ───────────────────────────────────────────────────────────────

const _toastCalls = [];
const _confirmCallbacks = [];
const _openedModals = [];
const _closedModals = [];

vi.mock("../../src/core/ui.js", () => ({
  showToast: vi.fn((msg, type) => _toastCalls.push({ msg, type })),
  openModal: vi.fn((id) => _openedModals.push(id)),
  closeModal: vi.fn((id) => _closedModals.push(id)),
  showConfirmDialog: vi.fn((_msg, cb) => _confirmCallbacks.push(cb)),
}));

vi.mock("../../src/core/i18n.js", () => ({
  t: (k) => k,
}));

// ── Import after mocks ────────────────────────────────────────────────────

import { register } from "../../src/handlers/vendor-handlers.js";

// ── Helpers ───────────────────────────────────────────────────────────────

function dispatch(action, dataset = {}, eventOverrides = {}) {
  const fn = _handlers.get(action);
  if (!fn) throw new Error(`Handler not registered: ${action}`);
  const el = document.createElement("button");
  for (const [k, v] of Object.entries(dataset)) el.dataset[k] = v;
  const evt = Object.assign(new MouseEvent("click"), eventOverrides);
  return fn(el, evt);
}

// ── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  _handlers.clear();
  _store.clear();
  _toastCalls.length = 0;
  _confirmCallbacks.length = 0;
  _openedModals.length = 0;
  _closedModals.length = 0;
  vi.clearAllMocks();

  document.body.innerHTML = `
    <input id="vendorCategory" value="catering" />
    <input id="vendorName" value="Acme" />
    <input id="vendorContact" value="John" />
    <input id="vendorPhone" value="050-1234567" />
    <input id="vendorPrice" value="5000" />
    <input id="vendorPaid" value="2000" />
    <textarea id="vendorNotes">notes</textarea>
    <input id="vendorModalId" value="" />
    <input id="expenseCategory" value="food" />
    <input id="expenseAmount" value="300" />
    <input id="expenseDescription" value="desc" />
    <input id="expenseDate" value="2025-01-01" />
    <input id="expenseModalId" value="" />
    <input id="budgetTargetInput" value="50000" />
  `;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("S323 — vendorHandlers — register()", () => {
  it("registers all expected action handlers", () => {
    register();
    const expected = [
      "saveVendor", "deleteVendor", "exportVendorsCSV", "exportVendorPaymentsCSV",
      "filterVendorsByCategory", "openEditVendorModal",
      "saveExpense", "deleteExpense", "exportExpensesCSV", "openEditExpenseModal",
      "saveBudgetTarget", "deleteBudgetEntry", "renderBudgetProgress", "renderBudgetChart",
      "setVendorPaymentFilter",
      "exportAnalyticsPDF", "exportAnalyticsCSV", "exportMealPerTableCSV",
      "printMealPerTable", "exportEventSummary", "printDietaryCards",
    ];
    for (const action of expected) {
      expect(_handlers.has(action), `missing handler: ${action}`).toBe(true);
    }
  });

  describe("saveVendor handler", () => {
    it("calls saveVendor with form values", () => {
      register();
      dispatch("saveVendor");
      expect(_saveVendorMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Acme", category: "catering", price: "5000" }),
        null,
      );
    });

    it("closes modal and shows success on ok", () => {
      _saveVendorMock.mockReturnValue({ ok: true });
      register();
      dispatch("saveVendor");
      expect(_closedModals).toContain("vendorModal");
      expect(_toastCalls.some((c) => c.type === "success")).toBe(true);
    });

    it("shows error toast on failure", () => {
      _saveVendorMock.mockReturnValue({ ok: false, errors: ["Name required"] });
      register();
      dispatch("saveVendor");
      expect(_toastCalls.some((c) => c.type === "error")).toBe(true);
    });
  });

  describe("deleteVendor handler", () => {
    it("shows confirm dialog before deleting", () => {
      register();
      dispatch("deleteVendor", { actionArg: "v-1" });
      expect(_confirmCallbacks).toHaveLength(1);
      expect(_deleteVendorMock).not.toHaveBeenCalled();
    });

    it("calls deleteVendor when confirmed", () => {
      register();
      dispatch("deleteVendor", { actionArg: "v-1" });
      _confirmCallbacks[0]();
      expect(_deleteVendorMock).toHaveBeenCalledWith("v-1");
    });
  });

  it("exportVendorsCSV delegates to section", () => {
    register();
    dispatch("exportVendorsCSV");
    expect(_exportVendorsMock).toHaveBeenCalledTimes(1);
  });

  it("filterVendorsByCategory passes category from dataset", () => {
    register();
    dispatch("filterVendorsByCategory", { category: "music" });
    expect(_filterVendorsMock).toHaveBeenCalledWith("music");
  });

  describe("saveExpense handler", () => {
    it("calls saveExpense with form values", () => {
      register();
      dispatch("saveExpense");
      expect(_saveExpenseMock).toHaveBeenCalledWith(
        expect.objectContaining({ category: "food", amount: "300" }),
        null,
      );
    });

    it("shows error toast on failure", () => {
      _saveExpenseMock.mockReturnValue({ ok: false, errors: ["Amount required"] });
      register();
      dispatch("saveExpense");
      expect(_toastCalls.some((c) => c.type === "error")).toBe(true);
    });
  });

  describe("saveBudgetTarget handler", () => {
    it("saves budget target to weddingInfo store", () => {
      register();
      const fakeEvent = { preventDefault: vi.fn() };
      const fn = _handlers.get("saveBudgetTarget");
      const el = document.createElement("button");
      fn(el, fakeEvent);
      expect(_toastCalls.some((c) => c.type === "success")).toBe(true);
    });

    it("shows error for negative value", () => {
      register();
      document.getElementById("budgetTargetInput").value = "-100";
      const fakeEvent = { preventDefault: vi.fn() };
      const fn = _handlers.get("saveBudgetTarget");
      const el = document.createElement("button");
      fn(el, fakeEvent);
      expect(_toastCalls.some((c) => c.type === "error")).toBe(true);
    });
  });

  it("renderBudgetProgress delegates to section", () => {
    register();
    dispatch("renderBudgetProgress");
    expect(_renderBudgetProgressMock).toHaveBeenCalledTimes(1);
  });

  it("renderBudgetChart delegates to section", () => {
    register();
    dispatch("renderBudgetChart");
    expect(_renderBudgetChartMock).toHaveBeenCalledTimes(1);
  });

  it("exportAnalyticsPDF delegates to analytics section", () => {
    register();
    dispatch("exportAnalyticsPDF");
    expect(_exportAnalyticsPDFMock).toHaveBeenCalledTimes(1);
  });

  it("exportAnalyticsCSV delegates to analytics section", () => {
    register();
    dispatch("exportAnalyticsCSV");
    expect(_exportAnalyticsCSVMock).toHaveBeenCalledTimes(1);
  });

  it("printDietaryCards delegates to analytics section", () => {
    register();
    dispatch("printDietaryCards");
    expect(_printDietaryCardsMock).toHaveBeenCalledTimes(1);
  });
});
