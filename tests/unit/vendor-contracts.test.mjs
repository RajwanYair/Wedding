// tests/unit/vendor-contracts.test.mjs — S620 vendor contracts helpers
import { describe, it, expect } from "vitest";
import {
  CONTRACT_STATUSES,
  canTransition,
  validateContract,
  isExpired,
  expiringWithin,
  contractSummary,
} from "../../src/utils/vendor-contracts.js";

const base = () => ({
  id: "c1",
  vendorId: "v1",
  title: "Photography",
  status: "draft",
  amount: 5000,
});

describe("vendor-contracts", () => {
  describe("CONTRACT_STATUSES", () => {
    it("lists all 5 statuses", () => {
      expect(CONTRACT_STATUSES).toHaveLength(5);
      expect(CONTRACT_STATUSES).toContain("draft");
      expect(CONTRACT_STATUSES).toContain("signed");
    });
  });

  describe("canTransition", () => {
    it("allows draft → sent", () => expect(canTransition("draft", "sent")).toBe(true));
    it("allows draft → cancelled", () => expect(canTransition("draft", "cancelled")).toBe(true));
    it("blocks draft → signed", () => expect(canTransition("draft", "signed")).toBe(false));
    it("allows sent → signed", () => expect(canTransition("sent", "signed")).toBe(true));
    it("blocks expired → anything", () => expect(canTransition("expired", "draft")).toBe(false));
    it("returns false for unknown status", () => expect(canTransition("unknown", "draft")).toBe(false));
  });

  describe("validateContract", () => {
    it("returns empty for valid contract", () => {
      expect(validateContract(base())).toEqual([]);
    });
    it("rejects null", () => {
      expect(validateContract(null)).toContain("contract is required");
    });
    it("catches missing id", () => {
      expect(validateContract({ ...base(), id: "" })).toContain("id is required");
    });
    it("catches invalid status", () => {
      const errs = validateContract({ ...base(), status: "bogus" });
      expect(errs.some((e) => e.includes("invalid status"))).toBe(true);
    });
    it("catches negative amount", () => {
      expect(validateContract({ ...base(), amount: -1 })).toContain(
        "amount must be a non-negative finite number",
      );
    });
    it("catches signedDate after expiryDate", () => {
      const c = { ...base(), signedDate: "2025-12-01", expiryDate: "2025-01-01" };
      expect(validateContract(c)).toContain("signedDate must be before expiryDate");
    });
  });

  describe("isExpired", () => {
    it("returns true for signed contract past expiry", () => {
      const c = { ...base(), status: "signed", expiryDate: "2025-01-01" };
      expect(isExpired(c, "2025-06-01")).toBe(true);
    });
    it("returns false for non-signed contract", () => {
      const c = { ...base(), status: "draft", expiryDate: "2020-01-01" };
      expect(isExpired(c, "2025-06-01")).toBe(false);
    });
    it("returns false when no expiryDate", () => {
      expect(isExpired({ ...base(), status: "signed" }, "2025-06-01")).toBe(false);
    });
  });

  describe("expiringWithin", () => {
    it("returns contracts expiring within N days", () => {
      const contracts = [
        { ...base(), status: "signed", expiryDate: "2025-07-10" },
        { ...base(), id: "c2", status: "signed", expiryDate: "2025-12-01" },
      ];
      const result = expiringWithin(contracts, 30, "2025-07-01");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("c1");
    });
    it("returns empty for invalid input", () => {
      expect(expiringWithin(null, 30)).toEqual([]);
    });
  });

  describe("contractSummary", () => {
    it("computes totals by status", () => {
      const contracts = [
        { ...base(), status: "signed", amount: 3000 },
        { ...base(), id: "c2", status: "draft", amount: 2000 },
        { ...base(), id: "c3", status: "signed", amount: 1000 },
      ];
      const s = contractSummary(contracts);
      expect(s.total).toBe(3);
      expect(s.byStatus.signed).toBe(2);
      expect(s.byStatus.draft).toBe(1);
      expect(s.totalValue).toBe(6000);
      expect(s.signedValue).toBe(4000);
    });
    it("handles empty/null", () => {
      const s = contractSummary(null);
      expect(s.total).toBe(0);
      expect(s.totalValue).toBe(0);
    });
  });
});
