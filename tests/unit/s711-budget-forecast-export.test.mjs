/**
 * tests/unit/s711-budget-forecast-export.test.mjs — S711 Budget Forecast CSV Export
 *
 * Tests for budget forecast wiring in dashboard.js.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/core/sync.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(),
}));
vi.mock("../../src/services/realtime.js", () => ({
  subscribeToTable: vi.fn(),
  unsubscribeAll: vi.fn(),
}));
vi.mock("../../src/core/ui.js", () => ({
  showToast: vi.fn(),
  announce: vi.fn(),
}));
vi.mock("../../src/sections/analytics.js", () => ({
  renderArrivalForecast: vi.fn(),
}));

const _mockAnchor = { href: "", download: "", click: vi.fn() };
const _mockUrl = "blob:mock-url";
vi.stubGlobal("URL", {
  createObjectURL: vi.fn(() => _mockUrl),
  revokeObjectURL: vi.fn(),
});
vi.stubGlobal("document", {
  createElement: vi.fn((tag) => (tag === "a" ? _mockAnchor : {})),
  getElementById: vi.fn(() => null),
  querySelector: vi.fn(() => null),
});
vi.stubGlobal("Blob", class MockBlob {
  constructor(parts, opts) {
    this.content = parts.join("");
    this.type = opts?.type ?? "";
  }
});

import { initStore } from "../../src/core/store.js";
import {
  getBudgetForecastSummary,
  exportBudgetForecastCsv,
} from "../../src/sections/dashboard.js";

const SAMPLE_VENDORS = [
  { id: "v1", name: "Catering", category: "Catering", paid: 5000 },
  { id: "v2", name: "Photo", category: "Photography", paid: 3000 },
  { id: "v3", name: "Flowers", category: "Catering", paid: 2000 },
];

beforeEach(() => {
  initStore({
    vendors: { value: SAMPLE_VENDORS },
    weddingInfo: { value: { budgetTarget: 20000 } },
  });
  _mockAnchor.click.mockClear();
  URL.createObjectURL.mockClear();
});

describe("getBudgetForecastSummary", () => {
  it("returns a ForecastSummary with categories", () => {
    const summary = getBudgetForecastSummary();
    expect(summary).toHaveProperty("totalBudget");
    expect(summary).toHaveProperty("totalSpent");
    expect(summary).toHaveProperty("categories");
    expect(Array.isArray(summary.categories)).toBe(true);
  });

  it("includes the right category names from vendor records", () => {
    const summary = getBudgetForecastSummary();
    const cats = summary.categories.map((c) => c.category);
    expect(cats).toContain("Catering");
    expect(cats).toContain("Photography");
  });

  it("sums spent amounts per category", () => {
    const summary = getBudgetForecastSummary();
    const catering = summary.categories.find((c) => c.category === "Catering");
    expect(catering?.spent).toBe(7000); // 5000 + 2000
  });

  it("returns totalSpent as sum of all paid amounts", () => {
    const summary = getBudgetForecastSummary();
    expect(summary.totalSpent).toBe(10000); // 5000 + 3000 + 2000
  });

  it("returns zero totals for empty vendor list", () => {
    initStore({ vendors: { value: [] }, weddingInfo: { value: { budgetTarget: 0 } } });
    const summary = getBudgetForecastSummary();
    expect(summary.totalBudget).toBe(0);
    expect(summary.totalSpent).toBe(0);
    expect(summary.categories).toHaveLength(0);
  });
});

describe("exportBudgetForecastCsv", () => {
  it("triggers a file download", () => {
    exportBudgetForecastCsv();
    expect(_mockAnchor.click).toHaveBeenCalled();
    expect(_mockAnchor.download).toBe("budget-forecast.csv");
  });

  it("creates a blob with CSV content", () => {
    exportBudgetForecastCsv();
    expect(URL.createObjectURL).toHaveBeenCalled();
    const blob = URL.createObjectURL.mock.calls[0][0];
    expect(blob.type).toContain("text/csv");
    expect(blob.content).toContain(",");
  });

  it("returns the forecast summary", () => {
    const summary = exportBudgetForecastCsv();
    expect(summary).toHaveProperty("categories");
    expect(summary.totalSpent).toBe(10000);
  });

  it("CSV contains category data", () => {
    exportBudgetForecastCsv();
    const blob = URL.createObjectURL.mock.calls[0][0];
    expect(blob.content).toContain("Catering");
    expect(blob.content).toContain("Photography");
  });
});
