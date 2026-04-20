import { describe, it, expect } from "vitest";
import {
  PAYMENT_PLATFORMS,
  isValidAmount,
  normalizePaymentPhone,
  buildBitLink,
  buildPayBoxLink,
  buildPayPalLink,
  buildRevolutLink,
  buildBankTransferData,
  buildPaymentLink,
  platformLabel,
} from "../../src/utils/payment-link.js";

// ── PAYMENT_PLATFORMS ─────────────────────────────────────────────────────

describe("PAYMENT_PLATFORMS", () => {
  it("is frozen", () => expect(Object.isFrozen(PAYMENT_PLATFORMS)).toBe(true));
  it("has BIT", () => expect(PAYMENT_PLATFORMS.BIT).toBe("bit"));
  it("has PAYPAL", () => expect(PAYMENT_PLATFORMS.PAYPAL).toBe("paypal"));
});

// ── isValidAmount ─────────────────────────────────────────────────────────

describe("isValidAmount()", () => {
  it("returns true for positive number", () =>
    expect(isValidAmount(100)).toBe(true));
  it("returns false for zero", () => expect(isValidAmount(0)).toBe(false));
  it("returns false for negative", () =>
    expect(isValidAmount(-50)).toBe(false));
  it("returns false for string", () =>
    expect(isValidAmount("100")).toBe(false));
  it("returns false for Infinity", () =>
    expect(isValidAmount(Infinity)).toBe(false));
});

// ── normalizePaymentPhone ─────────────────────────────────────────────────

describe("normalizePaymentPhone()", () => {
  it("converts 05X format", () =>
    expect(normalizePaymentPhone("0541234567")).toBe("972541234567"));
  it("accepts already-normalized", () =>
    expect(normalizePaymentPhone("972541234567")).toBe("972541234567"));
  it("strips dashes and spaces", () =>
    expect(normalizePaymentPhone("054-123-4567")).toBe("972541234567"));
  it("returns null for non-string", () =>
    expect(normalizePaymentPhone(null)).toBeNull());
  it("returns null for short string", () =>
    expect(normalizePaymentPhone("123")).toBeNull());
});

// ── buildBitLink ──────────────────────────────────────────────────────────

describe("buildBitLink()", () => {
  it("returns null for invalid phone", () => {
    expect(buildBitLink({ phone: "bad", amount: 500 })).toBeNull();
  });
  it("returns null for invalid amount", () => {
    expect(buildBitLink({ phone: "0541234567", amount: 0 })).toBeNull();
  });
  it("builds valid link", () => {
    const link = buildBitLink({ phone: "0541234567", amount: 500 });
    expect(link).toMatch(/^https:\/\/www\.bitpay\.co\.il/);
    expect(link).toContain("972541234567");
    expect(link).toContain("500");
  });
  it("includes note when provided", () => {
    const link = buildBitLink({
      phone: "0541234567",
      amount: 100,
      note: "Venue deposit",
    });
    expect(link).toContain("note");
  });
  it("omits note param when empty", () => {
    const link = buildBitLink({ phone: "0541234567", amount: 100 });
    expect(link).not.toContain("note");
  });
});

// ── buildPayBoxLink ───────────────────────────────────────────────────────

describe("buildPayBoxLink()", () => {
  it("returns null for missing payboxId", () => {
    expect(buildPayBoxLink({ payboxId: "", amount: 200 })).toBeNull();
  });
  it("returns null for invalid amount", () => {
    expect(buildPayBoxLink({ payboxId: "12345", amount: -10 })).toBeNull();
  });
  it("builds valid link", () => {
    const link = buildPayBoxLink({ payboxId: "12345", amount: 200 });
    expect(link).toMatch(/^https:\/\/payboxapp\.page\.link/);
    expect(link).toContain("12345");
  });
});

// ── buildPayPalLink ───────────────────────────────────────────────────────

describe("buildPayPalLink()", () => {
  it("returns null for missing username", () => {
    expect(buildPayPalLink({ username: "" })).toBeNull();
  });
  it("builds base link without amount", () => {
    const link = buildPayPalLink({ username: "johnwedding" });
    expect(link).toBe("https://paypal.me/johnwedding");
  });
  it("appends amount and currency", () => {
    const link = buildPayPalLink({
      username: "johnwedding",
      amount: 300,
      currency: "USD",
    });
    expect(link).toContain("300USD");
  });
});

// ── buildRevolutLink ──────────────────────────────────────────────────────

describe("buildRevolutLink()", () => {
  it("returns null for missing username", () => {
    expect(buildRevolutLink({ username: "" })).toBeNull();
  });
  it("strips @ prefix from username", () => {
    const link = buildRevolutLink({ username: "@alice" });
    expect(link).toContain("alice");
    expect(link).not.toContain("@alice");
  });
  it("appends amount and currency when provided", () => {
    const link = buildRevolutLink({
      username: "alice",
      amount: 150,
      currency: "ILS",
    });
    expect(link).toContain("amount=150");
    expect(link).toContain("currency=ILS");
  });
  it("returns base link without amount params", () => {
    const link = buildRevolutLink({ username: "alice" });
    expect(link).toBe("https://revolut.me/alice");
  });
});

// ── buildBankTransferData ─────────────────────────────────────────────────

describe("buildBankTransferData()", () => {
  it("returns null for missing fields", () => {
    expect(
      buildBankTransferData({
        bankName: "",
        accountNumber: "123",
        branchCode: "1",
      }),
    ).toBeNull();
  });
  it("builds transfer object", () => {
    const data = buildBankTransferData({
      bankName: "Bank Hapoalim",
      accountNumber: "123456",
      branchCode: "012",
      amount: 2000,
      reference: "Venue",
    });
    expect(data.bankName).toBe("Bank Hapoalim");
    expect(data.amount).toBe(2000);
    expect(data.reference).toBe("Venue");
  });
  it("sets amount to null when not provided", () => {
    const data = buildBankTransferData({
      bankName: "Bank Leumi",
      accountNumber: "654321",
      branchCode: "003",
    });
    expect(data.amount).toBeNull();
  });
});

// ── buildPaymentLink ──────────────────────────────────────────────────────

describe("buildPaymentLink()", () => {
  it("routes to bit", () => {
    const link = buildPaymentLink("bit", { phone: "0541234567", amount: 100 });
    expect(link).toContain("bitpay");
  });
  it("routes to paypal", () => {
    const link = buildPaymentLink("paypal", { username: "user" });
    expect(link).toContain("paypal.me");
  });
  it("returns null for unknown platform", () => {
    expect(buildPaymentLink("venmo", { username: "x" })).toBeNull();
  });
});

// ── platformLabel ─────────────────────────────────────────────────────────

describe("platformLabel()", () => {
  it("returns Bit for bit", () => expect(platformLabel("bit")).toBe("Bit"));
  it("returns Bank Transfer for transfer", () =>
    expect(platformLabel("transfer")).toBe("Bank Transfer"));
  it("returns key for unknown platform", () =>
    expect(platformLabel("unknown_pay")).toBe("unknown_pay"));
});
