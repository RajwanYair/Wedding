/**
 * src/utils/payment-schedule.js — Scheduled milestone payments (S670)
 *
 * @module payment-schedule
 * @owner vendor-crm
 */

/**
 * @typedef {"pending"|"due"|"paid"|"overdue"|"cancelled"} PaymentStatus
 */

/**
 * @typedef {object} ScheduledPayment
 * @property {string} id
 * @property {string} vendorId
 * @property {string} label
 * @property {number} amount
 * @property {string} currency
 * @property {number} dueDate
 * @property {PaymentStatus} status
 * @property {number|null} paidAt
 * @property {string} note
 */

let _idCounter = 0;

/** Reset ID counter - testing only. */
export function resetIdCounter(start = 0) {
  _idCounter = start;
}

/**
 * Create a scheduled payment.
 * @param {object} params
 * @param {string} params.vendorId
 * @param {string} params.label
 * @param {number} params.amount
 * @param {string} [params.currency]
 * @param {number} params.dueDate
 * @param {string} [params.note]
 * @returns {ScheduledPayment}
 */
export function createPayment({ vendorId, label, amount, currency, dueDate, note }) {
  return {
    id: `pay_${++_idCounter}`,
    vendorId,
    label: (label || "").trim(),
    amount: Math.max(0, amount || 0),
    currency: currency || "ILS",
    dueDate,
    status: "pending",
    paidAt: null,
    note: (note || "").trim(),
  };
}

/**
 * Mark a payment as paid.
 * @param {ScheduledPayment} payment
 * @returns {ScheduledPayment}
 */
export function markPaid(payment) {
  if (payment.status === "paid" || payment.status === "cancelled") return payment;
  return { ...payment, status: "paid", paidAt: Date.now() };
}

/**
 * Cancel a payment.
 * @param {ScheduledPayment} payment
 * @returns {ScheduledPayment}
 */
export function cancelPayment(payment) {
  if (payment.status === "paid") return payment;
  return { ...payment, status: "cancelled" };
}

/**
 * Update payment statuses based on current time.
 * @param {ScheduledPayment[]} payments
 * @param {number} [now]
 * @returns {ScheduledPayment[]}
 */
export function refreshStatuses(payments, now = Date.now()) {
  return payments.map((p) => {
    if (p.status === "paid" || p.status === "cancelled") return p;
    if (p.dueDate < now) return { ...p, status: "overdue" };
    if (p.dueDate - now < 3 * 86_400_000) return { ...p, status: "due" };
    return { ...p, status: "pending" };
  });
}

/**
 * Get payments due within N days.
 * @param {ScheduledPayment[]} payments
 * @param {number} days
 * @param {number} [now]
 * @returns {ScheduledPayment[]}
 */
export function getUpcomingPayments(payments, days, now = Date.now()) {
  const future = now + days * 86_400_000;
  return payments.filter(
    (p) => p.status !== "paid" && p.status !== "cancelled" && p.dueDate >= now && p.dueDate <= future
  );
}

/**
 * Get overdue payments.
 * @param {ScheduledPayment[]} payments
 * @param {number} [now]
 * @returns {ScheduledPayment[]}
 */
export function getOverduePayments(payments, now = Date.now()) {
  return payments.filter(
    (p) => p.status !== "paid" && p.status !== "cancelled" && p.dueDate < now
  );
}

/**
 * Get payment schedule stats.
 * @param {ScheduledPayment[]} payments
 * @returns {{ total: number, pending: number, paid: number, overdue: number, cancelled: number, totalAmount: number, paidAmount: number, remainingAmount: number }}
 */
export function getScheduleStats(payments) {
  let pending = 0;
  let paid = 0;
  let overdue = 0;
  let cancelled = 0;
  let totalAmount = 0;
  let paidAmount = 0;

  for (const p of payments) {
    totalAmount += p.amount;
    if (p.status === "paid") {
      paid++;
      paidAmount += p.amount;
    } else if (p.status === "overdue") {
      overdue++;
    } else if (p.status === "cancelled") {
      cancelled++;
    } else {
      pending++;
    }
  }

  return {
    total: payments.length,
    pending,
    paid,
    overdue,
    cancelled,
    totalAmount,
    paidAmount,
    remainingAmount: totalAmount - paidAmount,
  };
}

/**
 * Generate equal installments for a total amount.
 * @param {object} params
 * @param {string} params.vendorId
 * @param {number} params.totalAmount
 * @param {number} params.installments
 * @param {number} params.startDate
 * @param {number} params.intervalDays
 * @param {string} [params.currency]
 * @returns {ScheduledPayment[]}
 */
export function generateInstallments({ vendorId, totalAmount, installments, startDate, intervalDays, currency }) {
  if (installments <= 0) return [];
  const perPayment = Math.round((totalAmount / installments) * 100) / 100;
  const result = [];

  for (let i = 0; i < installments; i++) {
    const dueDate = startDate + i * intervalDays * 86_400_000;
    result.push(
      createPayment({
        vendorId,
        label: `Payment ${i + 1}/${installments}`,
        amount: i === installments - 1 ? totalAmount - perPayment * (installments - 1) : perPayment,
        currency,
        dueDate,
      })
    );
  }
  return result;
}

/**
 * Get payments for a specific vendor.
 * @param {ScheduledPayment[]} payments
 * @param {string} vendorId
 * @returns {ScheduledPayment[]}
 */
export function getVendorPayments(payments, vendorId) {
  return payments.filter((p) => p.vendorId === vendorId);
}
