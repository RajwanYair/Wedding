// @ts-check
/** tests/unit/payment-milestones.test.mjs — S596 */
import { describe, it, expect } from "vitest";
import {
  isValidSchedule,
  allocateMilestones,
  outstandingBalance,
  buildStripeTransferPayload,
} from "../../src/utils/payment-milestones.js";

describe("S596 payment-milestones", () => {
  it("isValidSchedule accepts 100%", () => {
    expect(isValidSchedule([{ name: "deposit", percent: 30 }, { name: "final", percent: 70 }])).toBe(true);
  });

  it("isValidSchedule rejects mismatched totals", () => {
    expect(isValidSchedule([{ name: "x", percent: 50 }])).toBe(false);
  });

  it("allocateMilestones distributes total exactly", () => {
    const r = allocateMilestones(1000, [
      { name: "deposit", percent: 30 },
      { name: "midway", percent: 40 },
      { name: "final", percent: 30 },
    ]);
    expect(r.map((m) => m.amount)).toEqual([300, 400, 300]);
    expect(r.reduce((s, m) => s + m.amount, 0)).toBe(1000);
  });

  it("allocateMilestones absorbs rounding drift in final milestone", () => {
    const r = allocateMilestones(100, [
      { name: "a", percent: 33.33 },
      { name: "b", percent: 33.33 },
      { name: "c", percent: 33.34 },
    ]);
    expect(r.reduce((s, m) => s + m.amount, 0)).toBe(100);
  });

  it("allocateMilestones throws on invalid total", () => {
    expect(() => allocateMilestones(-1, [{ name: "x", percent: 100 }])).toThrow(RangeError);
    expect(() => allocateMilestones(Number.NaN, [{ name: "x", percent: 100 }])).toThrow(RangeError);
  });

  it("allocateMilestones throws on bad schedule", () => {
    expect(() => allocateMilestones(1000, [{ name: "x", percent: 50 }])).toThrow(RangeError);
  });

  it("outstandingBalance ignores paid milestones", () => {
    expect(
      outstandingBalance([
        { name: "a", amount: 300, paid: true },
        { name: "b", amount: 700, paid: false },
      ]),
    ).toBe(700);
  });

  it("buildStripeTransferPayload converts to cents + adds metadata", () => {
    const p = buildStripeTransferPayload({
      vendorAccountId: "acct_123",
      milestone: { name: "deposit", amount: 250, dueDate: "2026-06-01" },
      weddingId: "w1",
    });
    expect(p).toEqual({
      amount: 25000,
      currency: "ils",
      destination: "acct_123",
      transfer_group: "wedding_w1",
      metadata: { milestone: "deposit", dueDate: "2026-06-01" },
    });
  });

  it("buildStripeTransferPayload throws without vendorAccountId", () => {
    expect(() =>
      buildStripeTransferPayload({
        vendorAccountId: "",
        milestone: { name: "x", amount: 1 },
      }),
    ).toThrow();
  });
});
