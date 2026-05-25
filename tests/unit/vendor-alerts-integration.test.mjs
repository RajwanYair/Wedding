/**
 * S618 vendor-alerts wiring smoke test.
 *
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { initStore, storeSet } from "../../src/core/store.js";

vi.mock("../../src/services/sheets.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(() => Promise.resolve()),
}));

const SECTION = readFileSync("src/sections/vendors.js", "utf8");

let getVendorAlerts, getTotalVendorOutstanding;

describe("S618 vendor-alerts wiring", () => {
  beforeAll(async () => {
    const mod = await import("../../src/sections/vendors.js");
    getVendorAlerts = mod.getVendorAlerts;
    getTotalVendorOutstanding = mod.getTotalVendorOutstanding;
  });

  beforeEach(() => {
    initStore({ vendors: { value: [] } });
  });

  it("imports findOverdueVendors + totalOutstanding from utils/vendor-alerts.js", () => {
    expect(SECTION).toMatch(/from\s+"\.\.\/utils\/vendor-alerts\.js"/);
  });

  it("getVendorAlerts surfaces overdue and due-soon vendors", () => {
    storeSet("vendors", [
      { id: "v1", price: 1000, paid: 500, dueDate: "2020-01-01" },
      { id: "v2", price: 1000, paid: 0, dueDate: "2030-01-05" },
      { id: "v3", price: 500, paid: 500, dueDate: "2030-01-05" },
    ]);
    const alerts = getVendorAlerts({ now: new Date("2030-01-01"), dueSoonDays: 10 });
    const ids = alerts.map((a) => a.vendor.id);
    expect(ids).toContain("v1");
    expect(ids).toContain("v2");
    expect(ids).not.toContain("v3");
    expect(alerts[0].severity).toBe("overdue");
  });

  it("getTotalVendorOutstanding sums price minus paid", () => {
    storeSet("vendors", [
      { id: "v1", price: 1000, paid: 200 },
      { id: "v2", price: 500, paid: 500 },
      { id: "v3", price: 300, paid: 0, deletedAt: "2030-01-01" },
    ]);
    expect(getTotalVendorOutstanding()).toBe(800);
  });
});
