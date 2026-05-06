/**
 * S718 + S719 integration tests
 * - createVendorDeal / advanceVendorDeal / getVendorPipelineSummary (vendors.js ← vendor-pipeline.js)
 * - getVendorReceiptNumber / buildVendorReceipt                      (vendors.js ← payment-receipt.js)
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
vi.mock("../../src/services/realtime.js", () => ({
  subscribeToTable: vi.fn(),
  unsubscribeAll: vi.fn(),
}));

beforeEach(() => {
  initStore({ vendors: { value: [] }, vendorDeals: { value: [] } });
});

import {
  createVendorDeal,
  advanceVendorDeal,
  getVendorPipelineSummary,
  getVendorReceiptNumber,
  buildVendorReceipt,
} from "../../src/sections/vendors.js";

describe("S718 — createVendorDeal + advanceVendorDeal + getVendorPipelineSummary", () => {
  it("createVendorDeal returns a deal in 'lead' stage", () => {
    const deal = createVendorDeal("vendor_1");
    expect(deal.vendorId).toBe("vendor_1");
    expect(deal.stage).toBe("lead");
    expect(deal.history).toHaveLength(0);
  });

  it("advanceVendorDeal transitions to new stage and records history", () => {
    const deal = createVendorDeal("vendor_2");
    const advanced = advanceVendorDeal(deal, "contacted");
    expect(advanced.stage).toBe("contacted");
    expect(advanced.history.length).toBeGreaterThanOrEqual(1);
  });

  it("getVendorPipelineSummary returns total + by-stage breakdown", () => {
    const d1 = createVendorDeal("v1");
    const d2 = createVendorDeal("v2");
    storeSet("vendorDeals", [d1, d2]);
    const summary = getVendorPipelineSummary();
    expect(summary.total).toBe(2);
    expect(summary.byStage.lead).toBe(2);
  });
});

describe("S719 — getVendorReceiptNumber + buildVendorReceipt", () => {
  it("getVendorReceiptNumber returns a string starting with RCP-", () => {
    const num = getVendorReceiptNumber("vendor_xyz");
    expect(typeof num).toBe("string");
    expect(num.startsWith("RCP-")).toBe(true);
  });

  it("buildVendorReceipt returns receipt with correct totals", () => {
    const receipt = buildVendorReceipt("v1", {
      vendorName: "Floral Co.",
      lines: [
        { description: "Flowers", amount: 50000 },
        { description: "Delivery", amount: 5000 },
      ],
      taxRate: 0,
    });
    expect(receipt.vendorId).toBe("v1");
    expect(receipt.vendorName).toBe("Floral Co.");
    expect(receipt.subtotal).toBe(55000);
    expect(receipt.total).toBe(55000);
  });
});
