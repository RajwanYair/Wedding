/**
 * src/utils/payment-link.js
 * Builds payment deep-links for Israeli and international payment platforms.
 * Supports Bit, PayBox, PayPal, Revolut, and generic bank-transfer data.
 * Pure data — no DOM, no network.
 *
 * @module payment-link
 */

// ── Platform definitions ───────────────────────────────────────────────────

/**
 * Supported payment platforms.
 * @type {Readonly<Record<string, string>>}
 */
export const PAYMENT_PLATFORMS = Object.freeze({
  BIT: "bit",
  PAYBOX: "paybox",
  PAYPAL: "paypal",
  REVOLUT: "revolut",
  TRANSFER: "transfer",
});

// ── Validators ─────────────────────────────────────────────────────────────

/**
 * Returns true if the amount is a positive finite number.
 * @param {unknown} amount
 * @returns {boolean}
 */
export function isValidAmount(amount) {
  return typeof amount === "number" && isFinite(amount) && amount > 0;
}

/**
 * Normalises an Israeli phone number to digits-only (972...).
 * Accepts 05X / +9725X / 9725X formats.
 * @param {string} phone
 * @returns {string|null}
 */
export function normalizePaymentPhone(phone) {
  if (typeof phone !== "string") return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("972") && digits.length === 12) return digits;
  if (digits.startsWith("05") && digits.length === 10)
    return `972${digits.slice(1)}`;
  return null;
}

// ── Bit (Israel) ──────────────────────────────────────────────────────────

/**
 * Builds a Bit deep-link for requesting payment.
 * @param {object} opts
 * @param {string} opts.phone - recipient phone (Israeli)
 * @param {number} opts.amount - amount in ILS
 * @param {string} [opts.note] - payment note
 * @returns {string|null}
 */
export function buildBitLink({ phone, amount, note = "" }) {
  const normalised = normalizePaymentPhone(phone);
  if (!normalised || !isValidAmount(amount)) return null;
  const params = new URLSearchParams({
    phone: normalised,
    amount: String(amount),
  });
  if (note) params.set("note", note);
  return `https://www.bitpay.co.il/app/payment?${params.toString()}`;
}

// ── PayBox (Israel) ───────────────────────────────────────────────────────

/**
 * Builds a PayBox request link.
 * @param {object} opts
 * @param {string} opts.payboxId - recipient PayBox ID or phone
 * @param {number} opts.amount - amount in ILS
 * @param {string} [opts.description]
 * @returns {string|null}
 */
export function buildPayBoxLink({ payboxId, amount, description = "" }) {
  if (!payboxId || !isValidAmount(amount)) return null;
  const params = new URLSearchParams({
    id: String(payboxId),
    sum: String(amount),
  });
  if (description) params.set("desc", description);
  return `https://payboxapp.page.link/pay?${params.toString()}`;
}

// ── PayPal.me ────────────────────────────────────────────────────────────

/**
 * Builds a PayPal.me link.
 * @param {object} opts
 * @param {string} opts.username - PayPal.me username
 * @param {number} [opts.amount]
 * @param {string} [opts.currency="USD"]
 * @returns {string|null}
 */
export function buildPayPalLink({ username, amount, currency = "USD" }) {
  if (!username || typeof username !== "string") return null;
  const base = `https://paypal.me/${encodeURIComponent(username.trim())}`;
  if (isValidAmount(amount)) return `${base}/${amount}${currency}`;
  return base;
}

// ── Revolut.me ───────────────────────────────────────────────────────────

/**
 * Builds a Revolut payment link.
 * @param {object} opts
 * @param {string} opts.username - Revolut @tag
 * @param {number} [opts.amount]
 * @param {string} [opts.currency="ILS"]
 * @returns {string|null}
 */
export function buildRevolutLink({ username, amount, currency = "ILS" }) {
  if (!username || typeof username !== "string") return null;
  const tag = username.startsWith("@") ? username.slice(1) : username;
  const base = `https://revolut.me/${encodeURIComponent(tag)}`;
  if (isValidAmount(amount))
    return `${base}?amount=${amount}&currency=${currency}`;
  return base;
}

// ── Generic bank transfer ─────────────────────────────────────────────────

/**
 * Builds a structured bank-transfer data object for display or QR.
 * @param {object} opts
 * @param {string} opts.bankName
 * @param {string} opts.accountNumber
 * @param {string} opts.branchCode
 * @param {number} [opts.amount]
 * @param {string} [opts.reference]
 * @returns {{ bankName: string, accountNumber: string, branchCode: string, amount: number|null, reference: string }}
 */
export function buildBankTransferData({
  bankName,
  accountNumber,
  branchCode,
  amount,
  reference = "",
}) {
  if (!bankName || !accountNumber || !branchCode) return null;
  return {
    bankName: String(bankName),
    accountNumber: String(accountNumber),
    branchCode: String(branchCode),
    amount: isValidAmount(amount) ? amount : null,
    reference: String(reference),
  };
}

// ── Unified helper ────────────────────────────────────────────────────────

/**
 * Builds a payment link for the given platform.
 * @param {string} platform - one of PAYMENT_PLATFORMS values
 * @param {object} opts
 * @returns {string|null}
 */
export function buildPaymentLink(platform, opts) {
  switch (platform) {
    case PAYMENT_PLATFORMS.BIT:
      return buildBitLink(opts);
    case PAYMENT_PLATFORMS.PAYBOX:
      return buildPayBoxLink(opts);
    case PAYMENT_PLATFORMS.PAYPAL:
      return buildPayPalLink(opts);
    case PAYMENT_PLATFORMS.REVOLUT:
      return buildRevolutLink(opts);
    default:
      return null;
  }
}

/**
 * Returns a human-readable label for a platform.
 * @param {string} platform
 * @returns {string}
 */
export function platformLabel(platform) {
  const labels = {
    bit: "Bit",
    paybox: "PayBox",
    paypal: "PayPal",
    revolut: "Revolut",
    transfer: "Bank Transfer",
  };
  return labels[platform] ?? platform;
}
