import { describe, it, expect, beforeEach } from "vitest";
import {
  resetIdCounter,
  createPayment,
  markPaid,
  cancelPayment,
  refreshStatuses,
  getUpcomingPayments,
  getOverduePayments,
  getScheduleStats,
  generateInstallments,
  getVendorPayments,
} from "../../src/utils/payment-schedule.js";

describe("S670 payment-schedule", () => {
  beforeEach(() => resetIdCounter());

  describe("createPayment", () => {
    it("creates a scheduled payment", () => {
      const p = createPayment({ vendorId: "v1", label: "Deposit", amount: 2000, dueDate: 1700000000000 });
      expect(p.id).toBe("pay_1");
      expect(p.status).toBe("pending");
      expect(p.paidAt).toBe(null);
      expect(p.currency).toBe("ILS");
    });

    it("enforces minimum amount", () => {
      const p = createPayment({ vendorId: "v1", label: "X", amount: -100, dueDate: 1000 });
      expect(p.amount).toBe(0);
    });
  });

  describe("markPaid", () => {
    it("marks payment as paid", () => {
      const p = createPayment({ vendorId: "v1", label: "X", amount: 1000, dueDate: 1000 });
      const paid = markPaid(p);
      expect(paid.status).toBe("paid");
      expect(paid.paidAt).toBeTypeOf("number");
      expect(p.status).toBe("pending"); // immutable
    });

    it("does not modify already paid", () => {
      const p = markPaid(createPayment({ vendorId: "v1", label: "X", amount: 1000, dueDate: 1000 }));
      const again = markPaid(p);
      expect(again).toBe(p);
    });
  });

  describe("cancelPayment", () => {
    it("cancels pending payment", () => {
      const p = createPayment({ vendorId: "v1", label: "X", amount: 500, dueDate: 1000 });
      expect(cancelPayment(p).status).toBe("cancelled");
    });

    it("does not cancel paid payment", () => {
      const p = markPaid(createPayment({ vendorId: "v1", label: "X", amount: 500, dueDate: 1000 }));
      expect(cancelPayment(p).status).toBe("paid");
    });
  });

  describe("refreshStatuses", () => {
    it("marks overdue payments", () => {
      const now = 5000;
      const payments = [
        createPayment({ vendorId: "v1", label: "A", amount: 100, dueDate: 3000 }),
        createPayment({ vendorId: "v1", label: "B", amount: 200, dueDate: 5000 + 86_400_000 * 5 }),
      ];
      const refreshed = refreshStatuses(payments, now);
      expect(refreshed[0].status).toBe("overdue");
      expect(refreshed[1].status).toBe("pending");
    });

    it("marks due-soon payments", () => {
      const now = 1000;
      const payments = [
        createPayment({ vendorId: "v1", label: "A", amount: 100, dueDate: 1000 + 86_400_000 }),
      ];
      const refreshed = refreshStatuses(payments, now);
      expect(refreshed[0].status).toBe("due");
    });

    it("skips paid/cancelled", () => {
      const p = markPaid(createPayment({ vendorId: "v1", label: "A", amount: 100, dueDate: 0 }));
      const refreshed = refreshStatuses([p], 99999);
      expect(refreshed[0].status).toBe("paid");
    });
  });

  describe("getUpcomingPayments", () => {
    it("returns payments due within N days", () => {
      const now = 1000;
      const payments = [
        createPayment({ vendorId: "v1", label: "A", amount: 100, dueDate: 1000 + 86_400_000 * 2 }),
        createPayment({ vendorId: "v1", label: "B", amount: 200, dueDate: 1000 + 86_400_000 * 10 }),
      ];
      expect(getUpcomingPayments(payments, 5, now)).toHaveLength(1);
    });
  });

  describe("getOverduePayments", () => {
    it("returns unpaid past-due payments", () => {
      const now = 5000;
      const payments = [
        createPayment({ vendorId: "v1", label: "A", amount: 100, dueDate: 3000 }),
        markPaid(createPayment({ vendorId: "v1", label: "B", amount: 200, dueDate: 2000 })),
      ];
      expect(getOverduePayments(payments, now)).toHaveLength(1);
    });
  });

  describe("getScheduleStats", () => {
    it("returns aggregate stats", () => {
      const payments = [
        markPaid(createPayment({ vendorId: "v1", label: "A", amount: 1000, dueDate: 1000 })),
        createPayment({ vendorId: "v1", label: "B", amount: 2000, dueDate: 9000 }),
        cancelPayment(createPayment({ vendorId: "v1", label: "C", amount: 500, dueDate: 1000 })),
      ];
      const stats = getScheduleStats(payments);
      expect(stats.total).toBe(3);
      expect(stats.paid).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.cancelled).toBe(1);
      expect(stats.paidAmount).toBe(1000);
      expect(stats.remainingAmount).toBe(2500);
    });
  });

  describe("generateInstallments", () => {
    it("creates N equal installments", () => {
      const payments = generateInstallments({
        vendorId: "v1",
        totalAmount: 9000,
        installments: 3,
        startDate: 1000,
        intervalDays: 30,
      });
      expect(payments).toHaveLength(3);
      expect(payments[0].amount).toBe(3000);
      expect(payments[1].dueDate).toBe(1000 + 30 * 86_400_000);
    });

    it("handles remainder in last installment", () => {
      const payments = generateInstallments({
        vendorId: "v1",
        totalAmount: 1000,
        installments: 3,
        startDate: 0,
        intervalDays: 7,
      });
      const total = payments.reduce((s, p) => s + p.amount, 0);
      expect(total).toBeCloseTo(1000, 0);
    });

    it("returns empty for 0 installments", () => {
      expect(generateInstallments({ vendorId: "v1", totalAmount: 1000, installments: 0, startDate: 0, intervalDays: 7 })).toHaveLength(0);
    });
  });

  describe("getVendorPayments", () => {
    it("filters by vendor", () => {
      const payments = [
        createPayment({ vendorId: "v1", label: "A", amount: 100, dueDate: 1000 }),
        createPayment({ vendorId: "v2", label: "B", amount: 200, dueDate: 2000 }),
        createPayment({ vendorId: "v1", label: "C", amount: 300, dueDate: 3000 }),
      ];
      expect(getVendorPayments(payments, "v1")).toHaveLength(2);
    });
  });
});
