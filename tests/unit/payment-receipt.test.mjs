// tests/unit/payment-receipt.test.mjs — S623 payment receipt helpers
import { describe, it, expect } from "vitest";
import {
  generateReceiptNumber,
  calculateSubtotal,
  applyTax,
  buildReceipt,
  formatAmount,
} from "../../src/utils/payment-receipt.js";

describe("payment-receipt", () => {
  describe("generateReceiptNumber", () => {
    it("produces deterministic receipt number", () => {
      const rn = generateReceiptNumber("vendor-1", "2025-07-15T10:30:00.000Z");
      expect(rn).toBe("RCP-VENDOR-1-20250715-103000");
    });
    it("truncates long vendor IDs", () => {
      const rn = generateReceiptNumber("a-very-long-vendor-id", "2025-01-01T00:00:00.000Z");
      expect(rn.startsWith("RCP-A-VERY-L")).toBe(true);
    });
  });

  describe("calculateSubtotal", () => {
    it("sums line amounts", () => {
      const lines = [
        { description: "Deposit", amount: 100000 },
        { description: "Final", amount: 200000 },
      ];
      expect(calculateSubtotal(lines)).toEqual({ subtotal: 300000, lineCount: 2 });
    });
    it("handles null", () => {
      expect(calculateSubtotal(null)).toEqual({ subtotal: 0, lineCount: 0 });
    });
    it("skips invalid amounts", () => {
      const lines = [{ description: "A", amount: 500 }, { description: "B" }];
      expect(calculateSubtotal(lines).subtotal).toBe(500);
    });
  });

  describe("applyTax", () => {
    it("applies 17% VAT", () => {
      const { tax, total } = applyTax(10000, 0.17);
      expect(tax).toBe(1700);
      expect(total).toBe(11700);
    });
    it("handles zero tax rate", () => {
      const { tax, total } = applyTax(5000, 0);
      expect(tax).toBe(0);
      expect(total).toBe(5000);
    });
    it("handles invalid input", () => {
      expect(applyTax(NaN, 0.17).total).toBe(0);
    });
  });

  describe("buildReceipt", () => {
    it("builds complete receipt", () => {
      const r = buildReceipt({
        vendorId: "v1",
        vendorName: "Photo Studio",
        lines: [
          { description: "Deposit", amount: 200000 },
          { description: "Final", amount: 300000 },
        ],
        taxRate: 0.17,
        timestamp: "2025-07-15T12:00:00.000Z",
      });
      expect(r.receiptNumber).toContain("RCP-");
      expect(r.vendorName).toBe("Photo Studio");
      expect(r.subtotal).toBe(500000);
      expect(r.tax).toBe(85000);
      expect(r.total).toBe(585000);
      expect(r.currency).toBe("ILS");
      expect(r.lines).toHaveLength(2);
    });
    it("defaults to ILS and 17% tax", () => {
      const r = buildReceipt({
        vendorId: "v2",
        vendorName: "DJ",
        lines: [{ description: "Full", amount: 100000 }],
        timestamp: "2025-01-01T00:00:00.000Z",
      });
      expect(r.currency).toBe("ILS");
      expect(r.tax).toBe(17000);
    });
  });

  describe("formatAmount", () => {
    it("formats minor units to display", () => {
      expect(formatAmount(150000)).toBe("1500.00 ILS");
    });
    it("uses custom currency", () => {
      expect(formatAmount(10000, "USD")).toBe("100.00 USD");
    });
    it("handles NaN", () => {
      expect(formatAmount(NaN)).toBe("0.00");
    });
  });
});
