/**
 * tests/unit/s708-contract-esign.test.mjs — S708 Contract E-Sign
 *
 * Tests for the e-sign lifecycle wired into vendors.js.
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
import { resetIdCounter } from "../../src/utils/contract-esign.js";
import {
  createContractSigningIntent,
  signVendorContract,
  declineVendorContractSigning,
  getSigningIntents,
  getSigningAuditTrail,
  getContractSigningProgress,
} from "../../src/sections/vendors.js";

beforeEach(() => {
  initStore({
    wedding_v1_vendor_esign: { value: [] },
    wedding_v1_vendor_esign_audit: { value: [] },
  });
  resetIdCounter();
});

describe("createContractSigningIntent", () => {
  it("creates and persists a signing intent", () => {
    const { intent, ok } = createContractSigningIntent("c1", "alice@example.com", "Alice");
    expect(ok).toBe(true);
    expect(intent).not.toBeNull();
    expect(intent.contractId).toBe("c1");
    expect(intent.signerEmail).toBe("alice@example.com");
    expect(intent.status).toBe("pending");
  });

  it("persists intent to store", () => {
    createContractSigningIntent("c1", "alice@example.com", "Alice");
    expect(getSigningIntents("c1")).toHaveLength(1);
  });

  it("creates an audit entry on creation", () => {
    const { intent } = createContractSigningIntent("c1", "alice@example.com", "Alice");
    const trail = getSigningAuditTrail(intent.id);
    expect(trail).toHaveLength(1);
    expect(trail[0].action).toBe("created");
  });

  it("returns ok=false for missing signerEmail", () => {
    const { ok } = createContractSigningIntent("c1", "", "Alice");
    expect(ok).toBe(false);
  });

  it("returns ok=false for missing signerName", () => {
    const { ok } = createContractSigningIntent("c1", "alice@example.com", "");
    expect(ok).toBe(false);
  });

  it("returns ok=false for missing contractId", () => {
    const { ok } = createContractSigningIntent("", "alice@example.com", "Alice");
    expect(ok).toBe(false);
  });
});

describe("signVendorContract", () => {
  it("signs an existing pending intent", () => {
    const { intent } = createContractSigningIntent("c1", "alice@example.com", "Alice");
    const { ok, intent: signed } = signVendorContract(intent.id, "Full contract text here.");
    expect(ok).toBe(true);
    expect(signed.status).toBe("signed");
    expect(signed.signatureHash).toBeTruthy();
    expect(signed.signedAt).toBeTruthy();
  });

  it("persists the signed status", () => {
    const { intent } = createContractSigningIntent("c1", "alice@example.com", "Alice");
    signVendorContract(intent.id, "contract text");
    const intents = getSigningIntents("c1");
    expect(intents[0].status).toBe("signed");
  });

  it("adds audit entry for signing", () => {
    const { intent } = createContractSigningIntent("c1", "alice@example.com", "Alice");
    signVendorContract(intent.id, "contract text");
    const trail = getSigningAuditTrail(intent.id);
    const actions = trail.map((e) => e.action);
    expect(actions).toContain("signed");
  });

  it("returns ok=false for unknown intentId", () => {
    const { ok } = signVendorContract("nope", "text");
    expect(ok).toBe(false);
  });
});

describe("declineVendorContractSigning", () => {
  it("declines a pending intent", () => {
    const { intent } = createContractSigningIntent("c1", "bob@example.com", "Bob");
    const { ok, intent: declined } = declineVendorContractSigning(intent.id, "Not interested");
    expect(ok).toBe(true);
    expect(declined.status).toBe("declined");
    expect(declined.declineReason).toBe("Not interested");
  });

  it("adds audit entry on decline", () => {
    const { intent } = createContractSigningIntent("c1", "bob@example.com", "Bob");
    declineVendorContractSigning(intent.id);
    const trail = getSigningAuditTrail(intent.id);
    expect(trail.map((e) => e.action)).toContain("declined");
  });

  it("returns ok=false for unknown intentId", () => {
    const { ok } = declineVendorContractSigning("nope");
    expect(ok).toBe(false);
  });
});

describe("getSigningIntents", () => {
  it("returns empty when no intents", () => {
    expect(getSigningIntents("c1")).toEqual([]);
  });

  it("filters by contractId", () => {
    createContractSigningIntent("c1", "alice@example.com", "Alice");
    createContractSigningIntent("c2", "bob@example.com", "Bob");
    expect(getSigningIntents("c1")).toHaveLength(1);
    expect(getSigningIntents("c2")).toHaveLength(1);
  });
});

describe("getContractSigningProgress", () => {
  it("returns zero progress for no intents", () => {
    const p = getContractSigningProgress("c1");
    expect(p.total).toBe(0);
    expect(p.rate).toBe(0);
  });

  it("calculates correct rate when all signed", () => {
    const { intent } = createContractSigningIntent("c1", "alice@example.com", "Alice");
    signVendorContract(intent.id, "text");
    const p = getContractSigningProgress("c1");
    expect(p.total).toBe(1);
    expect(p.signed).toBe(1);
    expect(p.rate).toBe(100);
  });

  it("calculates partial rate", () => {
    const { intent: i1 } = createContractSigningIntent("c1", "alice@example.com", "Alice");
    createContractSigningIntent("c1", "bob@example.com", "Bob");
    signVendorContract(i1.id, "text");
    const p = getContractSigningProgress("c1");
    expect(p.total).toBe(2);
    expect(p.signed).toBe(1);
    expect(p.rate).toBe(50);
  });
});
