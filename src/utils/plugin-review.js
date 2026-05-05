/**
 * src/utils/plugin-review.js — S621 Plugin review pipeline helpers
 *
 * Pure helpers for the plugin review/approval workflow. Each plugin
 * submission goes through: pending → approved | rejected. Reviewers
 * can add notes and the pipeline tracks review history.
 *
 * @module plugin-review
 * @owner platform
 */

/**
 * @typedef {object} PluginReview
 * @property {string}  pluginId
 * @property {string}  version
 * @property {"pending"|"approved"|"rejected"} status
 * @property {string=} reviewerId
 * @property {string=} notes
 * @property {string=} submittedAt   // ISO timestamp
 * @property {string=} reviewedAt    // ISO timestamp
 */

/** Valid review statuses. */
export const REVIEW_STATUSES = /** @type {const} */ (["pending", "approved", "rejected"]);

/**
 * Create a new pending review submission.
 *
 * @param {string} pluginId
 * @param {string} version
 * @returns {PluginReview}
 */
export function createSubmission(pluginId, version) {
  return {
    pluginId: String(pluginId),
    version: String(version),
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
}

/**
 * Approve a pending review.
 *
 * @param {PluginReview} review
 * @param {string} reviewerId
 * @param {string} [notes]
 * @returns {{ ok: boolean, review?: PluginReview, error?: string }}
 */
export function approveReview(review, reviewerId, notes) {
  if (!review || review.status !== "pending") {
    return { ok: false, error: "only pending reviews can be approved" };
  }
  if (!reviewerId) return { ok: false, error: "reviewerId is required" };
  return {
    ok: true,
    review: {
      ...review,
      status: "approved",
      reviewerId,
      notes: notes ?? review.notes,
      reviewedAt: new Date().toISOString(),
    },
  };
}

/**
 * Reject a pending review.
 *
 * @param {PluginReview} review
 * @param {string} reviewerId
 * @param {string} reason
 * @returns {{ ok: boolean, review?: PluginReview, error?: string }}
 */
export function rejectReview(review, reviewerId, reason) {
  if (!review || review.status !== "pending") {
    return { ok: false, error: "only pending reviews can be rejected" };
  }
  if (!reviewerId) return { ok: false, error: "reviewerId is required" };
  if (!reason) return { ok: false, error: "rejection reason is required" };
  return {
    ok: true,
    review: {
      ...review,
      status: "rejected",
      reviewerId,
      notes: reason,
      reviewedAt: new Date().toISOString(),
    },
  };
}

/**
 * Check if a plugin version has been approved in the review list.
 *
 * @param {readonly PluginReview[]} reviews
 * @param {string} pluginId
 * @param {string} version
 * @returns {boolean}
 */
export function isApproved(reviews, pluginId, version) {
  if (!Array.isArray(reviews)) return false;
  return reviews.some(
    (r) => r.pluginId === pluginId && r.version === version && r.status === "approved",
  );
}

/**
 * Filter reviews by status.
 *
 * @param {readonly PluginReview[]} reviews
 * @param {"pending"|"approved"|"rejected"} status
 * @returns {PluginReview[]}
 */
export function filterByStatus(reviews, status) {
  if (!Array.isArray(reviews)) return [];
  return reviews.filter((r) => r.status === status);
}

/**
 * Get review queue statistics.
 *
 * @param {readonly PluginReview[]} reviews
 * @returns {{ total: number, pending: number, approved: number, rejected: number }}
 */
export function reviewStats(reviews) {
  const stats = { total: 0, pending: 0, approved: 0, rejected: 0 };
  if (!Array.isArray(reviews)) return stats;
  stats.total = reviews.length;
  for (const r of reviews) {
    if (r.status === "pending") stats.pending++;
    else if (r.status === "approved") stats.approved++;
    else if (r.status === "rejected") stats.rejected++;
  }
  return stats;
}
