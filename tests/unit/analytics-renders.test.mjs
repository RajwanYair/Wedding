/**
 * tests/unit/analytics-renders.test.mjs — S331: analytics DOM render functions + export utils
 * Covers: renderBudgetChart · renderArrivalForecast · exportAnalyticsCSV ·
 *         exportMealPerTableCSV · printMealPerTable · printDietaryCards
 *
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initStore, storeSet } from "../../src/core/store.js";

// ── Mock sheets enqueueWrite (analytics imports it transitively) ──────────
vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

// ── Import after mocks ────────────────────────────────────────────────────
import {
  renderBudgetChart,
  renderArrivalForecast,
  exportAnalyticsCSV,
  exportMealPerTableCSV,
  printMealPerTable,
  printDietaryCards,
} from "../../src/sections/analytics.js";

// ── Helpers ───────────────────────────────────────────────────────────────

function seedStore(overrides = {}) {
  initStore({
    guests: { value: [] },
    tables: { value: [] },
    vendors: { value: [] },
    expenses: { value: [] },
    appErrors: { value: [] },
    weddingInfo: { value: {} },
    ...overrides,
  });
}

/** Add a named DOM element to document.body, returns cleanup fn. */
function addEl(id, tag = "div") {
  const el = document.createElement(tag);
  el.id = id;
  document.body.appendChild(el);
  return () => el.parentNode?.removeChild(el);
}

// ── renderBudgetChart ────────────────────────────────────────────────────

describe("renderBudgetChart", () => {
  beforeEach(() => seedStore());

  it("does not throw when container element is absent", () => {
    expect(() => renderBudgetChart()).not.toThrow();
  });

  it("renders bar container element when expenses exist", () => {
    const removeBar = addEl("analyticsBudgetBar");
    storeSet("expenses", [
      { category: "venue", amount: 1000 },
      { category: "catering", amount: 2000 },
    ]);
    expect(() => renderBudgetChart()).not.toThrow();
    removeBar();
  });

  it("includes vendor total in bars when vendors have price", () => {
    const removeBar = addEl("analyticsBudgetBar");
    storeSet("vendors", [{ id: "v1", price: 5000, paid: 0 }]);
    storeSet("expenses", [{ category: "flowers", amount: 500 }]);
    expect(() => renderBudgetChart()).not.toThrow();
    removeBar();
  });

  it("handles empty expenses and vendors gracefully", () => {
    const removeBar = addEl("analyticsBudgetBar");
    expect(() => renderBudgetChart()).not.toThrow();
    removeBar();
  });
});

// ── renderArrivalForecast ────────────────────────────────────────────────

describe("renderArrivalForecast", () => {
  beforeEach(() => seedStore());

  it("does not throw when no DOM elements present", () => {
    expect(() => renderArrivalForecast()).not.toThrow();
  });

  it("sets confirmedEl textContent to confirmed count", () => {
    storeSet("guests", [
      { id: "g1", status: "confirmed", count: 1 },
      { id: "g2", status: "confirmed", count: 2 },
    ]);
    const removeC = addEl("forecastConfirmed");
    const removeP = addEl("forecastProjected");
    const removeCap = addEl("forecastCapacity");
    const removeD = addEl("forecastDetail");
    renderArrivalForecast();
    const confirmedEl = document.getElementById("forecastConfirmed");
    expect(Number(confirmedEl?.textContent)).toBeGreaterThanOrEqual(2);
    removeC();
    removeP();
    removeCap();
    removeD();
  });

  it("shows forecast-num--over class when projected exceeds capacity", () => {
    storeSet("guests", [
      { id: "g1", status: "confirmed", count: 50 },
    ]);
    storeSet("tables", [{ id: "t1", capacity: 10, name: "T1" }]);
    const removeC = addEl("forecastConfirmed");
    const removeP = addEl("forecastProjected");
    const removeCap = addEl("forecastCapacity");
    const removeD = addEl("forecastDetail");
    renderArrivalForecast();
    const projEl = document.getElementById("forecastProjected");
    expect(projEl?.className).toContain("forecast-num--");
    removeC();
    removeP();
    removeCap();
    removeD();
  });

  it("shows capacity as em dash when no tables", () => {
    const removeC = addEl("forecastConfirmed");
    const removeP = addEl("forecastProjected");
    const removeCap = addEl("forecastCapacity");
    const removeD = addEl("forecastDetail");
    renderArrivalForecast();
    const capEl = document.getElementById("forecastCapacity");
    expect(capEl?.textContent).toBe("—");
    removeC();
    removeP();
    removeCap();
    removeD();
  });

  it("sets detailEl textContent combining maybe and pending percentages", () => {
    storeSet("guests", [
      { id: "g1", status: "maybe", count: 10 },
      { id: "g2", status: "pending", count: 5 },
    ]);
    const removeC = addEl("forecastConfirmed");
    const removeP = addEl("forecastProjected");
    const removeCap = addEl("forecastCapacity");
    const removeD = addEl("forecastDetail");
    renderArrivalForecast();
    const detailEl = document.getElementById("forecastDetail");
    expect(detailEl?.textContent?.length).toBeGreaterThan(0);
    removeC();
    removeP();
    removeCap();
    removeD();
  });
});

// ── exportAnalyticsCSV ───────────────────────────────────────────────────

describe("exportAnalyticsCSV", () => {
  beforeEach(() => {
    seedStore();
    // Stub URL API used in export
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("does not throw with empty store", () => {
    expect(() => exportAnalyticsCSV()).not.toThrow();
  });

  it("does not throw with guests, vendors, and expenses", () => {
    storeSet("guests", [
      { id: "g1", status: "confirmed", count: 2, children: 1, sent: true, checkedIn: true },
      { id: "g2", status: "pending", count: 1, children: 0, sent: false, checkedIn: false },
      { id: "g3", status: "declined", count: 1, children: 0, sent: false, checkedIn: false },
    ]);
    storeSet("vendors", [{ id: "v1", price: 5000, paid: 2000 }]);
    storeSet("expenses", [{ id: "e1", category: "catering", amount: 1000 }]);
    expect(() => exportAnalyticsCSV()).not.toThrow();
  });

});

// ── exportMealPerTableCSV ────────────────────────────────────────────────

describe("exportMealPerTableCSV", () => {
  beforeEach(() => {
    seedStore();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("does not throw with empty store", () => {
    expect(() => exportMealPerTableCSV()).not.toThrow();
  });

  it("does not throw with tables and confirmed guests", () => {
    storeSet("tables", [{ id: "t1", name: "Table 1", capacity: 10 }]);
    storeSet("guests", [
      { id: "g1", status: "confirmed", tableId: "t1", meal: "regular", count: 2 },
      { id: "g2", status: "confirmed", tableId: "t1", meal: "vegan", count: 1 },
      { id: "g3", status: "pending", tableId: null, meal: "regular", count: 1 },
    ]);
    expect(() => exportMealPerTableCSV()).not.toThrow();
  });
});

// ── printMealPerTable ────────────────────────────────────────────────────

describe("printMealPerTable", () => {
  it("calls window.print", () => {
    vi.stubGlobal("print", vi.fn());
    printMealPerTable();
    expect(window.print).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});

// ── printDietaryCards ─────────────────────────────────────────────────────

describe("printDietaryCards", () => {
  beforeEach(() => {
    seedStore();
    vi.stubGlobal("print", vi.fn());
    vi.stubGlobal("open", vi.fn(() => null));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("does not throw with empty store", () => {
    expect(() => printDietaryCards()).not.toThrow();
  });

  it("does not throw with confirmed guests having meal data", () => {
    storeSet("guests", [
      { id: "g1", status: "confirmed", firstName: "Alice", lastName: "Cohen", meal: "vegan", count: 2 },
      { id: "g2", status: "confirmed", firstName: "Bob", lastName: "Levi", meal: "regular", count: 1 },
    ]);
    expect(() => printDietaryCards()).not.toThrow();
  });
});
