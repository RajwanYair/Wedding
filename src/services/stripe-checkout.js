/**
 * src/services/stripe-checkout.js — S114 Stripe Checkout stub.
 *
 * Browser-side helpers that compose a Stripe Checkout Session payload and
 * delegate session creation to a future `stripe-checkout` Edge Function.
 * Pure ESM, deterministic input → output. No Stripe SDK dependency at
 * runtime — the SDK is loaded lazily by the Edge Function only.
 *
 * v1 ships only the input builder + edge-call wrapper; the actual server
 * function (`supabase/functions/stripe-checkout/index.ts`) lands in a
 * later sprint.
 */

/** @typedef {{ id: string, name: string, amount: number, currency?: string }} VendorLineItem */
/** @typedef {{ vendorId: string, label: string, amountCents: number, currency: string, quantity: number }} CheckoutLine */
/** @typedef {{ lineItems: CheckoutLine[], totalCents: number, currency: string, successUrl: string, cancelUrl: string, metadata: Record<string, string> }} CheckoutPayload */

const DEFAULT_CURRENCY = "ils";

/**
 * Build a Stripe-Checkout-compatible payload from vendor line items.
 * Throws if input is empty or amounts are invalid.
 *
 * @param {VendorLineItem[]} items
 * @param {{ successUrl: string, cancelUrl: string, eventId?: string, currency?: string }} opts
 * @returns {CheckoutPayload}
 */
export function buildCheckoutPayload(items, opts) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("buildCheckoutPayload: items required");
  }
  const currency = (opts.currency ?? DEFAULT_CURRENCY).toLowerCase();
  /** @type {CheckoutLine[]} */
  const lineItems = items.map((it) => {
    if (typeof it.amount !== "number" || it.amount <= 0) {
      throw new Error(`invalid amount for ${it.id}`);
    }
    return {
      vendorId: it.id,
      label: it.name,
      amountCents: Math.round(it.amount * 100),
      currency: (it.currency ?? currency).toLowerCase(),
      quantity: 1,
    };
  });
  const totalCents = lineItems.reduce((s, l) => s + l.amountCents * l.quantity, 0);
  return {
    lineItems,
    totalCents,
    currency,
    successUrl: opts.successUrl,
    cancelUrl: opts.cancelUrl,
    metadata: opts.eventId ? { eventId: opts.eventId } : {},
  };
}

/**
 * Call the `stripe-checkout` Edge Function. The default `sender` is injected
 * for tests; production wires `callEdgeFunction` from `services/backend.js`.
 *
 * @param {CheckoutPayload} payload
 * @param {(name: string, body: object) => Promise<{ok: boolean, data?: any, error?: string}>} sender
 * @returns {Promise<{ ok: boolean, sessionUrl?: string, error?: string }>}
 */
export async function startCheckout(payload, sender) {
  if (typeof sender !== "function") {
    return { ok: false, error: "no_sender" };
  }
  const res = await sender("stripe-checkout", payload);
  if (!res?.ok) return { ok: false, error: res?.error ?? "unknown" };
  const url = /** @type {any} */ (res.data)?.url;
  if (typeof url !== "string") return { ok: false, error: "missing_url" };
  return { ok: true, sessionUrl: url };
}
