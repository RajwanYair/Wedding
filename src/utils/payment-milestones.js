/**
 * src/utils/payment-milestones.js — S596 Stripe Connect milestone helpers
 *
 * Pure helpers for vendor payment timelines. Splits a total cost across
 * named milestones (deposit / midway / final), validates percentage
 * arrays sum to 100, computes outstanding balance, and produces the
 * payload shape we feed into Stripe `transfer_group` flows.
 *
 * @owner vendor-crm
 */

/**
 * @typedef {object} MilestoneSpec
 * @property {string} name
 * @property {number} percent  // 0..100
 * @property {string=} dueDate // ISO date
 */

/**
 * @typedef {object} ScheduledMilestone
 * @property {string} name
 * @property {number} amount
 * @property {string=} dueDate
 * @property {boolean=} paid
 */

/**
 * Validate that the percentages on the supplied specs sum to 100 (±0.5).
 * @param {readonly MilestoneSpec[]} specs
 * @returns {boolean}
 */
export function isValidSchedule(specs) {
  if (!Array.isArray(specs) || specs.length === 0) return false;
  const sum = specs.reduce((s, m) => s + (Number(m.percent) || 0), 0);
  return Math.abs(sum - 100) <= 0.5;
}

/**
 * Allocate a total amount across milestones using their `percent` values.
 * Throws when the schedule does not sum to 100. Rounding error is
 * absorbed by the final milestone so the sum equals `total` exactly.
 *
 * @param {number} total
 * @param {readonly MilestoneSpec[]} specs
 * @returns {ScheduledMilestone[]}
 */
export function allocateMilestones(total, specs) {
  if (!Number.isFinite(total) || total < 0) {
    throw new RangeError("allocateMilestones: total must be non-negative finite number");
  }
  if (!isValidSchedule(specs)) {
    throw new RangeError("allocateMilestones: percentages must sum to 100");
  }
  const out = specs.map((m) => ({
    name: m.name,
    amount: Math.round((total * (m.percent / 100)) * 100) / 100,
    dueDate: m.dueDate,
    paid: false,
  }));
  // Absorb rounding error in the last milestone.
  const allocated = out.reduce((s, m) => s + m.amount, 0);
  const drift = Math.round((total - allocated) * 100) / 100;
  if (drift !== 0 && out.length > 0) {
    out[out.length - 1].amount = Math.round((out[out.length - 1].amount + drift) * 100) / 100;
  }
  return out;
}

/**
 * Sum unpaid milestone amounts.
 * @param {readonly ScheduledMilestone[]} milestones
 * @returns {number}
 */
export function outstandingBalance(milestones) {
  if (!Array.isArray(milestones)) return 0;
  return milestones.reduce((s, m) => (m.paid ? s : s + (Number(m.amount) || 0)), 0);
}

/**
 * Build the payload we hand to Stripe Connect for a single milestone
 * payment. Uses cents (Stripe's smallest unit).
 *
 * @param {{ vendorAccountId: string, milestone: ScheduledMilestone, currency?: string, weddingId?: string }} params
 * @returns {{ amount: number, currency: string, destination: string, transfer_group: string, metadata: Record<string,string> }}
 */
export function buildStripeTransferPayload({
  vendorAccountId,
  milestone,
  currency = "ils",
  weddingId,
}) {
  if (!vendorAccountId) throw new Error("vendorAccountId required");
  if (!milestone || typeof milestone.amount !== "number") {
    throw new Error("milestone.amount required");
  }
  return {
    amount: Math.round(milestone.amount * 100),
    currency: currency.toLowerCase(),
    destination: vendorAccountId,
    transfer_group: weddingId ? `wedding_${weddingId}` : "wedding",
    metadata: {
      milestone: milestone.name,
      ...(milestone.dueDate ? { dueDate: milestone.dueDate } : {}),
    },
  };
}
