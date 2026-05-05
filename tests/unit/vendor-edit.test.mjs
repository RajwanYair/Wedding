// tests/unit/vendor-edit.test.mjs — S628 vendor contract edit helpers
import { describe, it, expect } from "vitest";
import {
  createDraft,
  diffContract,
  applyUpdate,
  statusLabel,
  nextStatuses,
  requiredFieldsForStatus,
} from "../../src/utils/vendor-edit.js";

describe("vendor-edit", () => {
  const draft = () => createDraft("v1");

  describe("createDraft", () => {
    it("creates a draft with defaults", () => {
      const d = draft();
      expect(d.vendorId).toBe("v1");
      expect(d.status).toBe("draft");
      expect(d.amount).toBe(0);
      expect(d.currency).toBe("ILS");
      expect(d.id).toMatch(/^ctr_/);
    });
    it("applies overrides", () => {
      const d = createDraft("v2", { title: "Flowers", amount: 5000 });
      expect(d.title).toBe("Flowers");
      expect(d.amount).toBe(5000);
    });
  });

  describe("diffContract", () => {
    it("detects changed fields", () => {
      const a = { ...draft(), title: "Old", amount: 100 };
      const b = { ...a, title: "New", amount: 200 };
      const diff = diffContract(a, b);
      expect(diff).toHaveLength(2);
      expect(diff[0]).toEqual({ field: "title", from: "Old", to: "New" });
    });
    it("returns empty for identical", () => {
      const a = draft();
      expect(diffContract(a, { ...a })).toEqual([]);
    });
    it("returns empty for null", () => {
      expect(diffContract(null, null)).toEqual([]);
    });
  });

  describe("applyUpdate", () => {
    it("applies simple field update", () => {
      const d = { ...draft(), title: "DJ", amount: 3000 };
      const { ok, contract } = applyUpdate(d, { amount: 4000 });
      expect(ok).toBe(true);
      expect(contract.amount).toBe(4000);
    });
    it("auto-transitions sent→signed when signedDate added", () => {
      const d = { ...draft(), title: "Band", amount: 5000, status: "sent" };
      const { ok, contract } = applyUpdate(d, { signedDate: "2026-06-01" });
      expect(ok).toBe(true);
      expect(contract.status).toBe("signed");
    });
    it("rejects invalid transition", () => {
      const d = { ...draft(), title: "Hall", amount: 10000 };
      const { ok, errors } = applyUpdate(d, { status: "signed" });
      expect(ok).toBe(false);
      expect(errors[0]).toMatch(/cannot transition/);
    });
    it("rejects null contract", () => {
      const { ok } = applyUpdate(null, {});
      expect(ok).toBe(false);
    });
    it("validates merged result", () => {
      const d = { ...draft(), title: "X", amount: 100, status: "draft" };
      const { ok, errors } = applyUpdate(d, { amount: -5 });
      expect(ok).toBe(false);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("statusLabel", () => {
    it("returns label for known status", () => {
      expect(statusLabel("draft")).toBe("Draft");
      expect(statusLabel("signed")).toBe("Signed");
    });
    it("returns Unknown for invalid", () => {
      expect(statusLabel("nope")).toBe("Unknown");
    });
  });

  describe("nextStatuses", () => {
    it("returns valid transitions from draft", () => {
      expect(nextStatuses("draft")).toEqual(["sent", "cancelled"]);
    });
    it("returns empty for terminal state", () => {
      expect(nextStatuses("expired")).toEqual([]);
    });
  });

  describe("requiredFieldsForStatus", () => {
    it("flags missing title and amount for draft", () => {
      expect(requiredFieldsForStatus(draft())).toContain("amount");
    });
    it("flags missing signedDate for signed", () => {
      const d = { ...draft(), title: "X", amount: 1000, status: "signed" };
      expect(requiredFieldsForStatus(d)).toContain("signedDate");
    });
    it("passes when all present", () => {
      const d = { ...draft(), title: "X", amount: 1000, status: "signed", signedDate: "2026-01-01", expiryDate: "2027-01-01" };
      expect(requiredFieldsForStatus(d)).toEqual([]);
    });
    it("handles null", () => {
      expect(requiredFieldsForStatus(null)).toContain("contract");
    });
  });
});
