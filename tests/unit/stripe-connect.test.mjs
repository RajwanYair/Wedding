// tests/unit/stripe-connect.test.mjs — S638 Stripe Connect helpers
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

describe("stripe-connect", () => {
  describe("createConnectAccount", () => {
    it("creates pending account", () => {
      const a = createConnectAccount("v1", "acct_123", "vendor@test.com", "Flowers Inc");
      expect(a.vendorId).toBe("v1");
      expect(a.stripeAccountId).toBe("acct_123");
      expect(a.email).toBe("vendor@test.com");
      expect(a.businessName).toBe("Flowers Inc");
      expect(a.status).toBe("pending");
      expect(a.payoutsEnabled).toBe(false);
    });
    it("lowercases email", () => {
      expect(createConnectAccount("v1", "acct_1", "  A@B.COM  ").email).toBe("a@b.com");
    });
    it("omits businessName when empty", () => {
      expect(createConnectAccount("v1", "acct_1", "x@y.com").businessName).toBeUndefined();
    });
  });

  describe("buildOnboardingUrl", () => {
    it("includes account and return URLs", () => {
      const url = buildOnboardingUrl("acct_abc", "https://app/return", "https://app/refresh");
      expect(url).toContain("acct_abc");
      expect(url).toContain("return_url=");
      expect(url).toContain("refresh_url=");
    });
  });

  describe("mapWebhookToStatus", () => {
    it("returns active when both enabled", () => {
      const result = mapWebhookToStatus("account.updated", { payouts_enabled: true, charges_enabled: true });
      expect(result.status).toBe("active");
      expect(result.payoutsEnabled).toBe(true);
    });
    it("returns restricted when only payouts enabled", () => {
      const result = mapWebhookToStatus("account.updated", { payouts_enabled: true, charges_enabled: false });
      expect(result.status).toBe("restricted");
    });
    it("returns disabled when disabled_reason set", () => {
      const result = mapWebhookToStatus("account.updated", { disabled_reason: "fraud", payouts_enabled: false, charges_enabled: false });
      expect(result.status).toBe("disabled");
    });
    it("returns null for non-account events", () => {
      expect(mapWebhookToStatus("payout.created", {})).toBeNull();
    });
    it("returns null for missing data", () => {
      expect(mapWebhookToStatus("account.updated")).toBeNull();
    });
  });

  describe("buildDisbursement", () => {
    it("builds correct payload", () => {
      const d = buildDisbursement("acct_x", 50000, "Final Payment", "ILS");
      expect(d.stripeAccountId).toBe("acct_x");
      expect(d.amount).toBe(50000);
      expect(d.currency).toBe("ILS");
      expect(d.transferGroup).toBe("milestone_final_payment");
      expect(d.description).toContain("Final Payment");
    });
    it("defaults to ILS", () => {
      expect(buildDisbursement("acct_x", 100, "Deposit").currency).toBe("ILS");
    });
    it("rounds amount", () => {
      expect(buildDisbursement("acct_x", 100.7, "Test").amount).toBe(101);
    });
  });

  describe("isPayoutReady", () => {
    it("true for active + payouts enabled", () => {
      expect(isPayoutReady({ status: "active", payoutsEnabled: true })).toBe(true);
    });
    it("false for pending", () => {
      expect(isPayoutReady({ status: "pending", payoutsEnabled: false })).toBe(false);
    });
    it("false for active without payouts", () => {
      expect(isPayoutReady({ status: "active", payoutsEnabled: false })).toBe(false);
    });
  });

  describe("payoutSummary", () => {
    it("computes correct summary", () => {
      const accounts = [
        { status: "active", payoutsEnabled: true },
        { status: "pending", payoutsEnabled: false },
        { status: "restricted", payoutsEnabled: false },
      ];
      const s = payoutSummary(accounts);
      expect(s.total).toBe(3);
      expect(s.active).toBe(1);
      expect(s.pending).toBe(1);
      expect(s.payoutReady).toBe(1);
    });
    it("handles null", () => {
      expect(payoutSummary(null).total).toBe(0);
    });
  });

  describe("classifyWebhookEvent", () => {
    it("classifies account events", () => {
      expect(classifyWebhookEvent("account.updated")).toBe("account");
    });
    it("classifies payout events", () => {
      expect(classifyWebhookEvent("payout.created")).toBe("payout");
    });
    it("classifies transfer events", () => {
      expect(classifyWebhookEvent("transfer.created")).toBe("transfer");
    });
    it("classifies charge events", () => {
      expect(classifyWebhookEvent("charge.succeeded")).toBe("charge");
      expect(classifyWebhookEvent("payment_intent.succeeded")).toBe("charge");
    });
    it("returns unknown for others", () => {
      expect(classifyWebhookEvent("unknown.event")).toBe("unknown");
    });
  });
});
