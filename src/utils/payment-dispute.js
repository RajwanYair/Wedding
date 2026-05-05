/**
 * src/utils/payment-dispute.js — S656 Payment dispute resolution
 *
 * Pure helpers for managing payment disputes between couples and vendors —
 * creation, evidence attachment, resolution workflow, and summary stats.
 *
 * @module payment-dispute
 * @owner vendor-crm
 */

let _disputeCounter = 0;

/** Reset counter (for tests). */
export function resetDisputeCounter() {
  _disputeCounter = 0;
}

/**
 * @typedef {object} Dispute
 * @property {string} id
 * @property {string} paymentId
 * @property {string} vendorId
 * @property {string} reason
 * @property {number} amount
 * @property {string} status - "open"|"under_review"|"resolved"|"escalated"|"closed"
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {Evidence[]} evidence
 * @property {string} [resolution]
 */

/**
 * @typedef {object} Evidence
 * @property {string} type - "receipt"|"email"|"photo"|"contract"|"message"
 * @property {string} description
 * @property {string} addedAt
 */

const VALID_STATUSES = ["open", "under_review", "resolved", "escalated", "closed"];

/**
 * Create a new dispute.
 *
 * @param {string} paymentId
 * @param {string} vendorId
 * @param {string} reason
 * @param {number} amount
 * @returns {Dispute}
 */
export function createDispute(paymentId, vendorId, reason, amount) {
  _disputeCounter++;
  const now = new Date().toISOString();
  return {
    id: `disp_${_disputeCounter}`,
    paymentId: String(paymentId ?? ""),
    vendorId: String(vendorId ?? ""),
    reason: String(reason ?? ""),
    amount: typeof amount === "number" && amount >= 0 ? amount : 0,
    status: "open",
    createdAt: now,
    updatedAt: now,
    evidence: [],
  };
}

/**
 * Add evidence to a dispute.
 *
 * @param {Dispute} dispute
 * @param {string} type
 * @param {string} description
 * @returns {Dispute}
 */
export function addEvidence(dispute, type, description) {
  if (!dispute || typeof dispute !== "object") return dispute;
  const validTypes = ["receipt", "email", "photo", "contract", "message"];
  return {
    ...dispute,
    evidence: [
      ...(dispute.evidence ?? []),
      {
        type: validTypes.includes(type) ? type : "message",
        description: String(description ?? ""),
        addedAt: new Date().toISOString(),
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Update dispute status.
 *
 * @param {Dispute} dispute
 * @param {string} newStatus
 * @returns {Dispute}
 */
export function updateStatus(dispute, newStatus) {
  if (!dispute || typeof dispute !== "object") return dispute;
  if (!VALID_STATUSES.includes(newStatus)) return dispute;
  if (dispute.status === newStatus) return dispute;
  return { ...dispute, status: newStatus, updatedAt: new Date().toISOString() };
}

/**
 * Resolve a dispute with a resolution note.
 *
 * @param {Dispute} dispute
 * @param {string} resolution
 * @returns {Dispute}
 */
export function resolveDispute(dispute, resolution) {
  if (!dispute || typeof dispute !== "object") return dispute;
  return {
    ...dispute,
    status: "resolved",
    resolution: String(resolution ?? ""),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Escalate a dispute.
 *
 * @param {Dispute} dispute
 * @returns {Dispute}
 */
export function escalateDispute(dispute) {
  return updateStatus(dispute, "escalated");
}

/**
 * Close a dispute.
 *
 * @param {Dispute} dispute
 * @returns {Dispute}
 */
export function closeDispute(dispute) {
  return updateStatus(dispute, "closed");
}

/**
 * Filter disputes by status.
 *
 * @param {Dispute[]} disputes
 * @param {string} status
 * @returns {Dispute[]}
 */
export function filterByStatus(disputes, status) {
  if (!Array.isArray(disputes)) return [];
  return disputes.filter((d) => d.status === status);
}

/**
 * Get disputes for a specific vendor.
 *
 * @param {Dispute[]} disputes
 * @param {string} vendorId
 * @returns {Dispute[]}
 */
export function disputesForVendor(disputes, vendorId) {
  if (!Array.isArray(disputes)) return [];
  return disputes.filter((d) => d.vendorId === vendorId);
}

/**
 * Dispute summary statistics.
 *
 * @param {Dispute[]} disputes
 * @returns {{ total: number, open: number, resolved: number, escalated: number, totalAmount: number, avgAmount: number }}
 */
export function disputeSummary(disputes) {
  if (!Array.isArray(disputes) || disputes.length === 0) {
    return { total: 0, open: 0, resolved: 0, escalated: 0, totalAmount: 0, avgAmount: 0 };
  }

  let open = 0;
  let resolved = 0;
  let escalated = 0;
  let totalAmount = 0;

  for (const d of disputes) {
    if (d.status === "open" || d.status === "under_review") open++;
    if (d.status === "resolved" || d.status === "closed") resolved++;
    if (d.status === "escalated") escalated++;
    totalAmount += d.amount ?? 0;
  }

  return {
    total: disputes.length,
    open,
    resolved,
    escalated,
    totalAmount,
    avgAmount: Math.round(totalAmount / disputes.length),
  };
}
