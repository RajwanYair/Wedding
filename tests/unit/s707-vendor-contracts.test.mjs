/**
 * tests/unit/s707-vendor-contracts.test.mjs — S707 Vendor Contract Management
 *
 * Tests for the vendor contract CRUD + status lifecycle wired into vendors.js.
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

import { initStore } from "../../src/core/store.js";
import {
  getVendorContracts,
  saveVendorContract,
  deleteVendorContract,
  transitionContractStatus,
  getContractSummary,
  getExpiringContracts,
  CONTRACT_STATUSES,
} from "../../src/sections/vendors.js";
import { uid } from "../../src/utils/misc.js";

function makeContract(overrides = {}) {
  return {
    id: uid(),
    vendorId: "v1",
    title: "Photography Contract",
    status: "draft",
    amount: 5000,
    currency: "ILS",
    ...overrides,
  };
}

beforeEach(() => {
  initStore({ wedding_v1_vendor_contracts: { value: [] } });
});

describe("CONTRACT_STATUSES", () => {
  it("exports all 5 expected statuses", () => {
    expect(CONTRACT_STATUSES).toEqual(["draft", "sent", "signed", "expired", "cancelled"]);
  });
});

describe("getVendorContracts", () => {
  it("returns empty array when no contracts", () => {
    expect(getVendorContracts()).toEqual([]);
  });

  it("returns all contracts when no vendorId filter", () => {
    const c1 = makeContract({ vendorId: "v1" });
    const c2 = makeContract({ vendorId: "v2" });
    initStore({ wedding_v1_vendor_contracts: { value: [c1, c2] } });
    expect(getVendorContracts()).toHaveLength(2);
  });

  it("filters contracts by vendorId", () => {
    const c1 = makeContract({ vendorId: "v1" });
    const c2 = makeContract({ vendorId: "v2" });
    initStore({ wedding_v1_vendor_contracts: { value: [c1, c2] } });
    const result = getVendorContracts("v1");
    expect(result).toHaveLength(1);
    expect(result[0].vendorId).toBe("v1");
  });

  it("returns empty array for unknown vendorId", () => {
    const c1 = makeContract({ vendorId: "v1" });
    initStore({ wedding_v1_vendor_contracts: { value: [c1] } });
    expect(getVendorContracts("unknown")).toEqual([]);
  });
});

describe("saveVendorContract", () => {
  it("adds a new valid contract", () => {
    const c = makeContract();
    const result = saveVendorContract(c);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(getVendorContracts()).toHaveLength(1);
  });

  it("updates an existing contract by id", () => {
    const c = makeContract();
    saveVendorContract(c);
    const updated = { ...c, amount: 9999, status: "sent" };
    const result = saveVendorContract(updated);
    expect(result.ok).toBe(true);
    const contracts = getVendorContracts();
    expect(contracts).toHaveLength(1);
    expect(contracts[0].amount).toBe(9999);
  });

  it("rejects a contract with invalid status", () => {
    const c = makeContract({ status: "invalid" });
    const result = saveVendorContract(c);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(getVendorContracts()).toHaveLength(0);
  });

  it("rejects a contract with negative amount", () => {
    const c = makeContract({ amount: -100 });
    const result = saveVendorContract(c);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("amount"))).toBe(true);
  });

  it("rejects a contract with missing title", () => {
    const c = makeContract({ title: "" });
    const result = saveVendorContract(c);
    expect(result.ok).toBe(false);
  });
});

describe("deleteVendorContract", () => {
  it("deletes an existing contract by id", () => {
    const c = makeContract();
    saveVendorContract(c);
    expect(getVendorContracts()).toHaveLength(1);
    const deleted = deleteVendorContract(c.id);
    expect(deleted).toBe(true);
    expect(getVendorContracts()).toHaveLength(0);
  });

  it("returns false for unknown id", () => {
    const deleted = deleteVendorContract("nonexistent");
    expect(deleted).toBe(false);
  });
});

describe("transitionContractStatus", () => {
  it("transitions draft → sent", () => {
    const c = makeContract({ status: "draft" });
    saveVendorContract(c);
    const result = transitionContractStatus(c.id, "sent");
    expect(result.ok).toBe(true);
    expect(getVendorContracts()[0].status).toBe("sent");
  });

  it("transitions sent → signed", () => {
    const c = makeContract({ status: "sent" });
    saveVendorContract(c);
    const result = transitionContractStatus(c.id, "signed");
    expect(result.ok).toBe(true);
  });

  it("transitions draft → cancelled", () => {
    const c = makeContract({ status: "draft" });
    saveVendorContract(c);
    const result = transitionContractStatus(c.id, "cancelled");
    expect(result.ok).toBe(true);
  });

  it("rejects invalid transition signed → sent", () => {
    const c = makeContract({ status: "signed" });
    saveVendorContract(c);
    const result = transitionContractStatus(c.id, "sent");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/cannot transition/);
  });

  it("returns error for unknown contract id", () => {
    const result = transitionContractStatus("nope", "sent");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("not found");
  });
});

describe("getContractSummary", () => {
  it("returns zero counts when no contracts", () => {
    const summary = getContractSummary();
    expect(summary.total).toBe(0);
    expect(summary.totalValue).toBe(0);
    expect(summary.signedValue).toBe(0);
  });

  it("counts contracts by status", () => {
    saveVendorContract(makeContract({ status: "draft", amount: 1000 }));
    saveVendorContract(makeContract({ status: "signed", amount: 3000 }));
    const summary = getContractSummary();
    expect(summary.total).toBe(2);
    expect(summary.byStatus.draft).toBe(1);
    expect(summary.byStatus.signed).toBe(1);
    expect(summary.totalValue).toBe(4000);
    expect(summary.signedValue).toBe(3000);
  });
});

describe("getExpiringContracts", () => {
  it("returns empty when no signed contracts", () => {
    saveVendorContract(makeContract({ status: "draft" }));
    expect(getExpiringContracts(30)).toEqual([]);
  });

  it("returns signed contracts expiring within range", () => {
    const soon = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    const c = makeContract({ status: "signed", expiryDate: soon });
    saveVendorContract(c);
    expect(getExpiringContracts(30)).toHaveLength(1);
  });

  it("excludes contracts expiring beyond the range", () => {
    const far = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);
    const c = makeContract({ status: "signed", expiryDate: far });
    saveVendorContract(c);
    expect(getExpiringContracts(30)).toHaveLength(0);
  });
});
