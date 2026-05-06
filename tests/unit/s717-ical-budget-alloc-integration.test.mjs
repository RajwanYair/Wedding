/**
 * S717 + S722 integration tests
 * - buildWeddingIcs / getIcsDataUrl  (dashboard.js ← ical-export.js)
 * - getAllocatedBudget / getBudgetAfterSpending (dashboard.js ← budget-allocator.js)
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore, storeSet } from "../../src/core/store.js";

vi.mock("../../src/core/sync.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(),
}));
vi.mock("../../src/core/ui.js", () => ({ showToast: vi.fn(), announce: vi.fn() }));
vi.mock("../../src/sections/analytics.js", () => ({ renderArrivalForecast: vi.fn() }));
vi.mock("../../src/services/realtime.js", () => ({
  subscribeToTable: vi.fn(),
  unsubscribeAll: vi.fn(),
}));

beforeEach(() => {
  initStore({ vendors: { value: [] }, weddingInfo: { value: {} }, expenses: { value: [] } });
});

const { buildWeddingIcs, getIcsDataUrl, getAllocatedBudget, getBudgetAfterSpending } =
  await import("../../src/sections/dashboard.js");

describe("S717 — buildWeddingIcs + getIcsDataUrl", () => {
  it("buildWeddingIcs returns valid iCal string with VCALENDAR wrapper", () => {
    const ics = buildWeddingIcs({
      uid: "test-uid-1",
      title: "Wedding",
      start: "2027-09-12T18:00:00Z",
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("SUMMARY:Wedding");
  });

  it("buildWeddingIcs accepts an array of events", () => {
    const ics = buildWeddingIcs([
      { uid: "uid-1", title: "Ceremony", start: "2027-09-12T18:00:00Z" },
      { uid: "uid-2", title: "Reception", start: "2027-09-12T20:00:00Z" },
    ]);
    expect(ics).toContain("SUMMARY:Ceremony");
    expect(ics).toContain("SUMMARY:Reception");
  });

  it("getIcsDataUrl returns a data: URI", () => {
    const url = getIcsDataUrl({ uid: "u1", title: "Test", start: "2027-01-01T00:00:00Z" });
    expect(url.startsWith("data:text/calendar")).toBe(true);
  });
});

describe("S722 — getAllocatedBudget + getBudgetAfterSpending", () => {
  it("getAllocatedBudget splits total by weights", () => {
    const alloc = getAllocatedBudget(10000, [
      { category: "venue", weight: 0.5 },
      { category: "catering", weight: 0.5 },
    ]);
    expect(alloc.length).toBe(2);
    expect(alloc.find((a) => a.category === "venue")?.amount).toBe(5000);
    expect(alloc.find((a) => a.category === "catering")?.amount).toBe(5000);
  });

  it("getBudgetAfterSpending subtracts spent from allocation", () => {
    const alloc = getAllocatedBudget(10000, [{ category: "venue", weight: 1 }]);
    const result = getBudgetAfterSpending(alloc, { venue: 3000 });
    expect(result[0].remaining).toBe(7000);
    expect(result[0].over).toBe(false);
  });
});
