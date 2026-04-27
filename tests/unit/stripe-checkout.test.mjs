/**
 * tests/unit/stripe-checkout.test.mjs — S114 Stripe checkout stub.
 */
import { describe, it, expect, vi } from "vitest";
import {
  buildCheckoutPayload,
  startCheckout,
} from "../../src/services/stripe-checkout.js";

describe("S114 — stripe-checkout", () => {
  it("buildCheckoutPayload converts amount to cents and sums total", () => {
    const p = buildCheckoutPayload(
      [
        { id: "v1", name: "DJ", amount: 1500 },
        { id: "v2", name: "Catering", amount: 2300.5, currency: "ILS" },
      ],
      { successUrl: "https://x/s", cancelUrl: "https://x/c", eventId: "e1" },
    );
    expect(p.lineItems[0].amountCents).toBe(150_000);
    expect(p.lineItems[1].amountCents).toBe(230_050);
    expect(p.totalCents).toBe(380_050);
    expect(p.currency).toBe("ils");
    expect(p.metadata).toEqual({ eventId: "e1" });
  });

  it("buildCheckoutPayload throws on empty input", () => {
    expect(() =>
      buildCheckoutPayload([], { successUrl: "a", cancelUrl: "b" }),
    ).toThrow();
  });

  it("buildCheckoutPayload throws on non-positive amounts", () => {
    expect(() =>
      buildCheckoutPayload([{ id: "v1", name: "x", amount: 0 }], {
        successUrl: "a",
        cancelUrl: "b",
      }),
    ).toThrow();
  });

  it("startCheckout returns sessionUrl on ok response", async () => {
    const sender = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { url: "https://stripe/sess/abc" } });
    const p = buildCheckoutPayload(
      [{ id: "v1", name: "DJ", amount: 100 }],
      { successUrl: "a", cancelUrl: "b" },
    );
    const r = await startCheckout(p, sender);
    expect(r).toEqual({ ok: true, sessionUrl: "https://stripe/sess/abc" });
  });

  it("startCheckout surfaces edge function error", async () => {
    const sender = vi.fn().mockResolvedValue({ ok: false, error: "configured" });
    const p = buildCheckoutPayload(
      [{ id: "v1", name: "DJ", amount: 100 }],
      { successUrl: "a", cancelUrl: "b" },
    );
    expect((await startCheckout(p, sender)).error).toBe("configured");
  });

  it("startCheckout returns no_sender when sender missing", async () => {
    const p = buildCheckoutPayload(
      [{ id: "v1", name: "DJ", amount: 100 }],
      { successUrl: "a", cancelUrl: "b" },
    );
    expect(
      (await startCheckout(p, /** @type {any} */ (undefined))).error,
    ).toBe("no_sender");
  });
});
