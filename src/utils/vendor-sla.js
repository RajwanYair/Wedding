/**
 * src/utils/vendor-sla.js — S595 Vendor SLA scoring
 *
 * Pure helpers used by the Vendor CRM dashboard to score vendors on
 * response time, on-time delivery, and acceptance rate. All inputs are
 * plain values; no I/O.
 *
 * @owner vendor-crm
 */

/**
 * @typedef {object} VendorInteraction
 * @property {string} vendorId
 * @property {number=} responseMinutes   // minutes from inbound msg → vendor reply
 * @property {boolean=} onTime           // delivered by promised date
 * @property {boolean=} accepted         // proposal accepted by user
 */

/**
 * Compute the average response time (minutes) for a list of interactions.
 * Ignores undefined `responseMinutes`.
 *
 * @param {readonly VendorInteraction[]} interactions
 * @returns {number} average minutes, or 0 when no samples
 */
export function avgResponseMinutes(interactions) {
  if (!Array.isArray(interactions)) return 0;
  let sum = 0;
  let n = 0;
  for (const i of interactions) {
    if (typeof i?.responseMinutes === "number" && Number.isFinite(i.responseMinutes)) {
      sum += i.responseMinutes;
      n++;
    }
  }
  return n === 0 ? 0 : sum / n;
}

/**
 * Compute on-time delivery rate (0..1).
 * @param {readonly VendorInteraction[]} interactions
 */
export function onTimeRate(interactions) {
  if (!Array.isArray(interactions)) return 0;
  let total = 0;
  let onTime = 0;
  for (const i of interactions) {
    if (typeof i?.onTime === "boolean") {
      total++;
      if (i.onTime) onTime++;
    }
  }
  return total === 0 ? 0 : onTime / total;
}

/**
 * Compute acceptance rate (0..1).
 * @param {readonly VendorInteraction[]} interactions
 */
export function acceptanceRate(interactions) {
  if (!Array.isArray(interactions)) return 0;
  let total = 0;
  let accepted = 0;
  for (const i of interactions) {
    if (typeof i?.accepted === "boolean") {
      total++;
      if (i.accepted) accepted++;
    }
  }
  return total === 0 ? 0 : accepted / total;
}

/**
 * Score a vendor on a 0..100 scale using a weighted blend of:
 *   - response speed (40%)  — faster than `targetMinutes` ⇒ 100
 *   - on-time rate   (40%)
 *   - acceptance     (20%)
 *
 * @param {readonly VendorInteraction[]} interactions
 * @param {{ targetMinutes?: number }} [opts]
 * @returns {number}  integer 0..100
 */
export function scoreVendor(interactions, { targetMinutes = 60 } = {}) {
  const avg = avgResponseMinutes(interactions);
  const speedScore =
    avg <= 0
      ? 0
      : Math.max(0, Math.min(100, 100 * (targetMinutes / Math.max(avg, 1))));
  const onTime = onTimeRate(interactions) * 100;
  const accept = acceptanceRate(interactions) * 100;
  const blended = 0.4 * speedScore + 0.4 * onTime + 0.2 * accept;
  return Math.round(Math.max(0, Math.min(100, blended)));
}

/**
 * Bucket a numeric score into a tier label.
 * @param {number} score
 * @returns {"gold"|"silver"|"bronze"|"watch"}
 */
export function scoreTier(score) {
  if (!Number.isFinite(score) || score < 0) return "watch";
  if (score >= 85) return "gold";
  if (score >= 65) return "silver";
  if (score >= 40) return "bronze";
  return "watch";
}
