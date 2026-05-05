/**
 * src/utils/payment-receipt.js — S623 Payment receipt generator
 *
 * Pure helpers for generating payment receipt data structures. Used by
 * the vendor payment flow to create printable/downloadable receipt
 * summaries. No I/O or DOM access.
 *
 * @module payment-receipt
 * @owner vendor-crm
 */

/**
 * @typedef {object} PaymentLine
 * @property {string}  description
 * @property {number}  amount       // in minor units (agorot / cents)
 * @property {string=} date         // ISO date of payment
 */

/**
 * @typedef {object} ReceiptData
 * @property {string}  receiptNumber
 * @property {string}  vendorName
 * @property {string}  vendorId
 * @property {string}  issuedAt      // ISO timestamp
 * @property {string}  currency
 * @property {readonly PaymentLine[]} lines
 * @property {number}  subtotal
 * @property {number}  tax
 * @property {number}  total
 * @property {string=} notes
 */

/**
 * Generate a receipt number from vendor ID and timestamp.
 *
 * @param {string} vendorId
 * @param {string} [timestamp]
 * @returns {string}
 */
export function generateReceiptNumber(vendorId, timestamp) {
  const ts = timestamp ?? new Date().toISOString();
  const dateSlug = ts.slice(0, 10).replace(/-/g, "");
  const seq = ts.slice(11, 19).replace(/:/g, "");
  const vid = String(vendorId).slice(0, 8).toUpperCase();
  return `RCP-${vid}-${dateSlug}-${seq}`;
}

/**
 * Calculate line totals.
 *
 * @param {readonly PaymentLine[]} lines
 * @returns {{ subtotal: number, lineCount: number }}
 */
export function calculateSubtotal(lines) {
  if (!Array.isArray(lines)) return { subtotal: 0, lineCount: 0 };
  let subtotal = 0;
  for (const line of lines) {
    if (typeof line?.amount === "number" && Number.isFinite(line.amount)) {
      subtotal += line.amount;
    }
  }
  return { subtotal, lineCount: lines.length };
}

/**
 * Apply tax rate to subtotal.
 *
 * @param {number} subtotal — amount in minor units
 * @param {number} taxRate — decimal (e.g. 0.17 for 17% VAT)
 * @returns {{ tax: number, total: number }}
 */
export function applyTax(subtotal, taxRate) {
  const s = typeof subtotal === "number" && Number.isFinite(subtotal) ? subtotal : 0;
  const r = typeof taxRate === "number" && Number.isFinite(taxRate) && taxRate >= 0 ? taxRate : 0;
  const tax = Math.round(s * r);
  return { tax, total: s + tax };
}

/**
 * Build a complete receipt data object.
 *
 * @param {object} params
 * @param {string} params.vendorId
 * @param {string} params.vendorName
 * @param {readonly PaymentLine[]} params.lines
 * @param {number} [params.taxRate] — decimal (default 0.17 for Israeli VAT)
 * @param {string} [params.currency]
 * @param {string} [params.notes]
 * @param {string} [params.timestamp]
 * @returns {ReceiptData}
 */
export function buildReceipt({ vendorId, vendorName, lines, taxRate = 0.17, currency = "ILS", notes, timestamp }) {
  const issuedAt = timestamp ?? new Date().toISOString();
  const receiptNumber = generateReceiptNumber(vendorId, issuedAt);
  const { subtotal } = calculateSubtotal(lines);
  const { tax, total } = applyTax(subtotal, taxRate);
  return {
    receiptNumber,
    vendorId: String(vendorId),
    vendorName: String(vendorName),
    issuedAt,
    currency,
    lines: Array.isArray(lines) ? lines : [],
    subtotal,
    tax,
    total,
    notes,
  };
}

/**
 * Format amount from minor units to display string.
 *
 * @param {number} minorUnits
 * @param {string} [currency]
 * @returns {string}
 */
export function formatAmount(minorUnits, currency = "ILS") {
  if (typeof minorUnits !== "number" || !Number.isFinite(minorUnits)) return "0.00";
  const major = (minorUnits / 100).toFixed(2);
  return `${major} ${currency}`;
}
