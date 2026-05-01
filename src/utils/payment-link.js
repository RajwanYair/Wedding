/**
 * src/utils/payment-link.js — Israeli payment deep-link builders
 *
 * ROADMAP §5 Phase C C1 — Bit / PayBox / PayPal payment buttons in Vendors section.
 * Pure, side-effect-free, no runtime dependencies.
 *
 * Supports:
 *   Bit   — Israeli bank-app peer-to-peer payment (apps.bit.co.il/pay)
 *   PayBox — Israeli business payment page (payboxapp.com)
 *   PayPal — Global (paypal.me / paypal.com/paypalme)
 *
 * @typedef {{
 *   name?: string,
 *   phone?: string,
 *   amount?: number,
 *   currency?: string,
 *   description?: string
 * }} PaymentSource
 * @owner sections
 */

const _BIT_BASE = "https://apps.bit.co.il/pay";
const _PAYBOX_BASE = "https://payboxapp.com/pay";
const _PAYPAL_BASE = "https://www.paypal.me";

/**
 * Build a Bit payment deep-link.
 * Bit uses wa.me-style Israeli phone numbers (05XXXXXXXX).
 * @param {PaymentSource} src
 * @returns {string}
 */
export function buildBitLink(src) {
  const params = new URLSearchParams();
  if (src.phone) params.set("phone", src.phone.replace(/\D/g, ""));
  if (src.amount && src.amount > 0) params.set("amount", String(src.amount));
  if (src.description) params.set("message", src.description.slice(0, 100));
  const qs = params.toString();
  return qs ? `${_BIT_BASE}?${qs}` : _BIT_BASE;
}

/**
 * Build a PayBox payment deep-link.
 * @param {PaymentSource} src
 * @returns {string}
 */
export function buildPayBoxLink(src) {
  const params = new URLSearchParams();
  if (src.phone) params.set("phone", src.phone.replace(/\D/g, ""));
  if (src.amount && src.amount > 0) params.set("sum", String(src.amount));
  if (src.description) params.set("description", src.description.slice(0, 100));
  const qs = params.toString();
  return qs ? `${_PAYBOX_BASE}?${qs}` : _PAYBOX_BASE;
}

/**
 * Build a PayPal.me deep-link.
 * `username` is the merchant PayPal.me handle; falls back to a generic URL.
 * @param {PaymentSource} src
 * @param {string} [username]
 * @returns {string}
 */
function buildPayPalLink(src, username = "") {
  const base = username ? `${_PAYPAL_BASE}/${encodeURIComponent(username)}` : _PAYPAL_BASE;
  return src.amount && src.amount > 0 ? `${base}/${src.amount}` : base;
}

/**
 * Return all three payment links for a vendor-style source object.
 * @param {PaymentSource} src
 * @param {string} [paypalUsername]
 * @returns {{ bit: string, paybox: string, paypal: string }}
 */
// eslint-disable-next-line no-unused-vars -- retained for potential future use; not yet wired to UI
function buildAllPaymentLinks(src, paypalUsername = "") {
  return {
    bit: buildBitLink(src),
    paybox: buildPayBoxLink(src),
    paypal: buildPayPalLink(src, paypalUsername),
  };
}
