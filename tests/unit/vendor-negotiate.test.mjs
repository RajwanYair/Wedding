import { describe, it, expect, beforeEach } from "vitest";
import {
  resetIdCounter,
  startNegotiation,
  submitOffer,
  acceptNegotiation,
  rejectNegotiation,
  getLatestOffer,
  getSavings,
  getNegotiationProgress,
  getNegotiationStats,
  isWithinBudget,
  suggestCounterOffer,
} from "../../src/utils/vendor-negotiate.js";

describe("S668 vendor-negotiate", () => {
  beforeEach(() => resetIdCounter());

  describe("startNegotiation", () => {
    it("creates a new negotiation", () => {
      const n = startNegotiation({ vendorId: "v1", vendorName: "DJ Mike", service: "DJ", initialAsk: 5000, budget: 3500 });
      expect(n.id).toBe("neg_1");
      expect(n.vendorName).toBe("DJ Mike");
      expect(n.status).toBe("pending");
      expect(n.offers).toHaveLength(0);
    });

    it("enforces minimum amounts", () => {
      const n = startNegotiation({ vendorId: "v1", vendorName: "X", service: "Y", initialAsk: -100, budget: -50 });
      expect(n.initialAsk).toBe(0);
      expect(n.budget).toBe(0);
    });
  });

  describe("submitOffer", () => {
    it("adds an offer and sets status to countered", () => {
      let n = startNegotiation({ vendorId: "v1", vendorName: "X", service: "DJ", initialAsk: 5000, budget: 3500 });
      n = submitOffer(n, "client", 3800, "Can we do 3800?");
      expect(n.status).toBe("countered");
      expect(n.offers).toHaveLength(1);
      expect(n.offers[0].amount).toBe(3800);
      expect(n.offers[0].from).toBe("client");
    });

    it("does not modify accepted negotiations", () => {
      let n = startNegotiation({ vendorId: "v1", vendorName: "X", service: "Y", initialAsk: 5000, budget: 3500 });
      n = acceptNegotiation(n);
      const result = submitOffer(n, "client", 3000);
      expect(result.offers).toHaveLength(0);
    });
  });

  describe("acceptNegotiation", () => {
    it("sets status to accepted with resolvedAt", () => {
      let n = startNegotiation({ vendorId: "v1", vendorName: "X", service: "Y", initialAsk: 5000, budget: 3500 });
      n = submitOffer(n, "client", 4000);
      n = acceptNegotiation(n);
      expect(n.status).toBe("accepted");
      expect(n.resolvedAt).toBeTypeOf("number");
    });
  });

  describe("rejectNegotiation", () => {
    it("sets status to rejected", () => {
      let n = startNegotiation({ vendorId: "v1", vendorName: "X", service: "Y", initialAsk: 5000, budget: 3500 });
      n = rejectNegotiation(n);
      expect(n.status).toBe("rejected");
    });

    it("does not modify already accepted", () => {
      let n = startNegotiation({ vendorId: "v1", vendorName: "X", service: "Y", initialAsk: 5000, budget: 3500 });
      n = acceptNegotiation(n);
      const result = rejectNegotiation(n);
      expect(result.status).toBe("accepted");
    });
  });

  describe("getLatestOffer", () => {
    it("returns initialAsk when no offers", () => {
      const n = startNegotiation({ vendorId: "v1", vendorName: "X", service: "Y", initialAsk: 5000, budget: 3500 });
      expect(getLatestOffer(n)).toBe(5000);
    });

    it("returns last offer amount", () => {
      let n = startNegotiation({ vendorId: "v1", vendorName: "X", service: "Y", initialAsk: 5000, budget: 3500 });
      n = submitOffer(n, "client", 4000);
      n = submitOffer(n, "vendor", 4500);
      expect(getLatestOffer(n)).toBe(4500);
    });
  });

  describe("getSavings", () => {
    it("calculates savings vs initial ask", () => {
      let n = startNegotiation({ vendorId: "v1", vendorName: "X", service: "Y", initialAsk: 5000, budget: 3500 });
      n = submitOffer(n, "client", 3800);
      expect(getSavings(n)).toBe(1200);
    });

    it("returns 0 if offer exceeds ask", () => {
      let n = startNegotiation({ vendorId: "v1", vendorName: "X", service: "Y", initialAsk: 3000, budget: 3500 });
      n = submitOffer(n, "vendor", 3500);
      expect(getSavings(n)).toBe(0);
    });
  });

  describe("getNegotiationProgress", () => {
    it("returns 0 when no movement", () => {
      const n = startNegotiation({ vendorId: "v1", vendorName: "X", service: "Y", initialAsk: 5000, budget: 3500 });
      expect(getNegotiationProgress(n)).toBe(0);
    });

    it("returns 100 when at budget", () => {
      let n = startNegotiation({ vendorId: "v1", vendorName: "X", service: "Y", initialAsk: 5000, budget: 3500 });
      n = submitOffer(n, "vendor", 3500);
      expect(getNegotiationProgress(n)).toBe(100);
    });

    it("returns 100 when initialAsk is within budget", () => {
      const n = startNegotiation({ vendorId: "v1", vendorName: "X", service: "Y", initialAsk: 3000, budget: 3500 });
      expect(getNegotiationProgress(n)).toBe(100);
    });
  });

  describe("getNegotiationStats", () => {
    it("returns aggregate stats", () => {
      let n1 = startNegotiation({ vendorId: "v1", vendorName: "A", service: "X", initialAsk: 5000, budget: 3500 });
      n1 = submitOffer(n1, "client", 4000);
      n1 = acceptNegotiation(n1);

      let n2 = startNegotiation({ vendorId: "v2", vendorName: "B", service: "Y", initialAsk: 3000, budget: 2500 });
      n2 = rejectNegotiation(n2);

      const stats = getNegotiationStats([n1, n2]);
      expect(stats.total).toBe(2);
      expect(stats.accepted).toBe(1);
      expect(stats.rejected).toBe(1);
      expect(stats.totalSavings).toBe(1000);
    });
  });

  describe("isWithinBudget", () => {
    it("returns true when latest offer is at or under budget", () => {
      let n = startNegotiation({ vendorId: "v1", vendorName: "X", service: "Y", initialAsk: 5000, budget: 4000 });
      n = submitOffer(n, "vendor", 3900);
      expect(isWithinBudget(n)).toBe(true);
    });

    it("returns false when over budget", () => {
      const n = startNegotiation({ vendorId: "v1", vendorName: "X", service: "Y", initialAsk: 5000, budget: 3500 });
      expect(isWithinBudget(n)).toBe(false);
    });
  });

  describe("suggestCounterOffer", () => {
    it("suggests midpoint between current and budget", () => {
      let n = startNegotiation({ vendorId: "v1", vendorName: "X", service: "Y", initialAsk: 5000, budget: 3000 });
      n = submitOffer(n, "vendor", 4500);
      expect(suggestCounterOffer(n)).toBe(3750);
    });
  });
});
