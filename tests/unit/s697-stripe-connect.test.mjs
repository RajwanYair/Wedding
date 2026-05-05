/**
 * tests/unit/s697-stripe-connect.test.mjs
 * S697 — Stripe Connect: account creation, onboarding URL, webhook mapping,
 *          disbursements, payout summary, receipt generation.
 */
import { describe, it, expect } from "vitest";
import {
  createConnectAccount,
  buildOnboardingUrl,
  mapWebhookToStatus,
  buildDisbursement,
  isPayoutReady,
  payoutSummary,
  classifyWebhookEvent,
} from "../../src/utils/stripe-connect.js";
import {
  generateReceiptNumber,
  calculateSubtotal,
  applyTax,
  buildReceipt,
} from "../../src/utils/payment-receipt.js";

describe("S697 createConnectAccount", () => {
  it("creates account with pending status", () => {
    const acct = createConnectAccount("v1", "acct_test", "vendor@example.com", "My Vendor");
    expect(acct.vendorId).toBe("v1");
    expect(acct.stripeAccountId).toBe("acct_test");
    expect(acct.status).toBe("pending");
    expect(acct.payoutsEnabled).toBe(false);
    expect(acct.chargesEnabled).toBe(false);
  });

  it("normalises email to lowercase", () => {
    const acct = createConnectAccount("v2", "acct_x", "Vendor@Example.COM");
    expect(acct.email).toBe("vendor@example.com");
  });

  it("sets optional businessName", () => {
    const acct = createConnectAccount("v3", "acct_y", "e@e.com", "Best Vendor");
    expect(acct.businessName).toBe("Best Vendor");
  });
});

describe("S697 buildOnboardingUrl", () => {
  it("returns a URL containing the stripe account ID", () => {
    const url = buildOnboardingUrl("acct_123", "https://app.test/vendors?stripe=success", "https://app.test/vendors?stripe=refresh");
    expect(url).toContain("acct_123");
    expect(url).toContain("connect.stripe.com");
  });
});

describe("S697 mapWebhookToStatus", () => {
  it("returns null for non-account.updated events", () => {
    expect(mapWebhookToStatus("payout.created", {})).toBeNull();
  });

  it("maps active when both payouts and charges enabled", () => {
    const result = mapWebhookToStatus("account.updated", { payouts_enabled: true, charges_enabled: true });
    expect(result?.status).toBe("active");
    expect(result?.payoutsEnabled).toBe(true);
  });

  it("maps restricted when only payouts enabled", () => {
    const result = mapWebhookToStatus("account.updated", { payouts_enabled: true, charges_enabled: false });
    expect(result?.status).toBe("restricted");
  });

  it("maps disabled when disabled_reason present", () => {
    const result = mapWebhookToStatus("account.updated", { disabled_reason: "requirements.past_due" });
    expect(result?.status).toBe("disabled");
  });

  it("maps pending when nothing enabled", () => {
    const result = mapWebhookToStatus("account.updated", {});
    expect(result?.status).toBe("pending");
  });
});

describe("S697 buildDisbursement", () => {
  it("builds correct payload", () => {
    const payload = buildDisbursement("acct_xyz", 50000, "Deposit");
    expect(payload.stripeAccountId).toBe("acct_xyz");
    expect(payload.amount).toBe(50000);
    expect(payload.currency).toBe("ILS");
    expect(payload.transferGroup).toBe("milestone_deposit");
  });

  it("supports custom currency", () => {
    const payload = buildDisbursement("acct_xyz", 10000, "Final", "USD");
    expect(payload.currency).toBe("USD");
  });
});

describe("S697 isPayoutReady", () => {
  it("returns true for active + payoutsEnabled", () => {
    const acct = { status: "active", payoutsEnabled: true };
    expect(isPayoutReady(/** @type {any} */ (acct))).toBe(true);
  });

  it("returns false for pending", () => {
    const acct = { status: "pending", payoutsEnabled: false };
    expect(isPayoutReady(/** @type {any} */ (acct))).toBe(false);
  });

  it("returns false for active but payoutsEnabled=false", () => {
    const acct = { status: "active", payoutsEnabled: false };
    expect(isPayoutReady(/** @type {any} */ (acct))).toBe(false);
  });
});

describe("S697 payoutSummary", () => {
  it("counts active, pending, restricted, disabled, payoutReady", () => {
    const accounts = [
      { status: "active", payoutsEnabled: true, chargesEnabled: true, vendorId: "1", stripeAccountId: "a", email: "", createdAt: "", payoutsEnabled: true },
      { status: "pending", payoutsEnabled: false, chargesEnabled: false, vendorId: "2", stripeAccountId: "b", email: "", createdAt: "", payoutsEnabled: false },
      { status: "active", payoutsEnabled: false, chargesEnabled: true, vendorId: "3", stripeAccountId: "c", email: "", createdAt: "", payoutsEnabled: false },
    ];
    const summary = payoutSummary(/** @type {any} */ (accounts));
    expect(summary.total).toBe(3);
    expect(summary.active).toBe(2);
    expect(summary.pending).toBe(1);
    expect(summary.payoutReady).toBe(1);
  });
});

describe("S697 classifyWebhookEvent", () => {
  it("classifies account events", () => {
    expect(classifyWebhookEvent("account.updated")).toBe("account");
  });
  it("classifies payout events", () => {
    expect(classifyWebhookEvent("payout.created")).toBe("payout");
  });
  it("classifies charge events", () => {
    expect(classifyWebhookEvent("charge.succeeded")).toBe("charge");
    expect(classifyWebhookEvent("payment_intent.succeeded")).toBe("charge");
  });
  it("returns unknown for unrecognised event", () => {
    expect(classifyWebhookEvent("dispute.created")).toBe("unknown");
    expect(classifyWebhookEvent(/** @type {any} */ (null))).toBe("unknown");
  });
});

describe("S697 payment-receipt", () => {
  it("generates a receipt number from vendorId + timestamp", () => {
    const rn = generateReceiptNumber("v_vendor1", "2024-06-15T10:30:00.000Z");
    expect(rn).toContain("RCP-");
    expect(rn).toContain("20240615");
  });

  it("calculateSubtotal sums line amounts", () => {
    const { subtotal, lineCount } = calculateSubtotal([
      { description: "service", amount: 10000 },
      { description: "deposit", amount: -3000 },
    ]);
    expect(subtotal).toBe(7000);
    expect(lineCount).toBe(2);
  });

  it("applyTax computes correct tax + total", () => {
    const { tax, total } = applyTax(10000, 0.17);
    expect(tax).toBe(1700);
    expect(total).toBe(11700);
  });

  it("buildReceipt assembles full receipt", () => {
    const receipt = buildReceipt({
      vendorId: "v_1",
      vendorName: "Vendor A",
      lines: [{ description: "service", amount: 50000 }],
      taxRate: 0.17,
      currency: "ILS",
    });
    expect(receipt.vendorName).toBe("Vendor A");
    expect(receipt.subtotal).toBe(50000);
    expect(receipt.tax).toBe(8500);
    expect(receipt.total).toBe(58500);
    expect(receipt.receiptNumber).toMatch(/^RCP-/);
  });
});
