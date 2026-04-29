/**
 * tests/unit/payment-link.test.mjs — S210 coverage ratchet: payment link builders
 */
import { describe, it, expect } from "vitest";
import {
  buildBitLink,
  buildPayBoxLink,
} from "../../src/utils/payment-link.js";

describe("payment-link — buildBitLink", () => {
  it("returns base URL when no params", () => {
    expect(buildBitLink({})).toBe("https://apps.bit.co.il/pay");
  });

  it("includes phone with non-digits stripped", () => {
    const link = buildBitLink({ phone: "050-123-4567" });
    expect(link).toContain("phone=0501234567");
  });

  it("includes amount when positive", () => {
    const link = buildBitLink({ amount: 150 });
    expect(link).toContain("amount=150");
  });

  it("omits amount when 0", () => {
    const link = buildBitLink({ amount: 0 });
    expect(link).toBe("https://apps.bit.co.il/pay");
  });

  it("includes description truncated to 100 chars", () => {
    const desc = "A".repeat(150);
    const link = buildBitLink({ description: desc });
    expect(link).toContain(`message=${"A".repeat(100)}`);
  });

  it("builds full URL with all params", () => {
    const link = buildBitLink({ phone: "0501234567", amount: 200, description: "Catering" });
    expect(link).toContain("phone=0501234567");
    expect(link).toContain("amount=200");
    expect(link).toContain("message=Catering");
  });
});

describe("payment-link — buildPayBoxLink", () => {
  it("returns base URL when no params", () => {
    expect(buildPayBoxLink({})).toBe("https://payboxapp.com/pay");
  });

  it("includes phone", () => {
    const link = buildPayBoxLink({ phone: "054-000-0000" });
    expect(link).toContain("phone=0540000000");
  });

  it("includes sum", () => {
    const link = buildPayBoxLink({ amount: 500 });
    expect(link).toContain("sum=500");
  });

  it("includes description", () => {
    const link = buildPayBoxLink({ description: "DJ fee" });
    expect(link).toContain("description=DJ+fee");
  });

  it("omits amount when 0", () => {
    const link = buildPayBoxLink({ amount: 0 });
    expect(link).toBe("https://payboxapp.com/pay");
  });
});
