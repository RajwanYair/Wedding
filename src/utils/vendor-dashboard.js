/**
 * src/utils/vendor-dashboard.js — S640 Vendor CRM dashboard aggregation
 *
 * Pure helpers that aggregate vendor data across SLA scores,
 * contract statuses, payment milestones, and inbox activity
 * into dashboard-ready summaries.
 *
 * @module vendor-dashboard
 * @owner vendor-crm
 */

/**
 * @typedef {object} VendorDashboard
 * @property {number} totalVendors
 * @property {number} activeContracts
 * @property {number} pendingPayments
 * @property {number} overduePayments
 * @property {number} avgSlaScore
 * @property {number} totalBudget
 * @property {number} totalPaid
 * @property {number} unreadMessages
 */

/**
 * Aggregate vendor stats into a dashboard summary.
 *
 * @param {{ vendors: { id: string, status?: string, totalCost?: number, totalPaid?: number }[],
 *           slaScores?: Record<string, number>,
 *           inboxCounts?: Record<string, { unread: number }>,
 *           milestones?: { vendorId: string, paid?: boolean, dueDate?: string }[] }} data
 * @returns {VendorDashboard}
 */
export function aggregateDashboard(data) {
  const vendors = data?.vendors ?? [];
  const slaScores = data?.slaScores ?? {};
  const inboxCounts = data?.inboxCounts ?? {};
  const milestones = data?.milestones ?? [];
  const now = new Date();

  let activeContracts = 0;
  let totalBudget = 0;
  let totalPaid = 0;
  let unreadMessages = 0;

  for (const v of vendors) {
    if (v.status === "active" || v.status === "confirmed") activeContracts++;
    totalBudget += v.totalCost ?? 0;
    totalPaid += v.totalPaid ?? 0;
    unreadMessages += inboxCounts[v.id]?.unread ?? 0;
  }

  let pendingPayments = 0;
  let overduePayments = 0;
  for (const m of milestones) {
    if (m.paid) continue;
    pendingPayments++;
    if (m.dueDate && new Date(m.dueDate) < now) overduePayments++;
  }

  const scores = Object.values(slaScores).filter((s) => typeof s === "number" && s >= 0);
  const avgSlaScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  return {
    totalVendors: vendors.length,
    activeContracts,
    pendingPayments,
    overduePayments,
    avgSlaScore,
    totalBudget,
    totalPaid,
    unreadMessages,
  };
}

/**
 * Rank vendors by SLA score (desc).
 *
 * @param {{ id: string, name: string }[]} vendors
 * @param {Record<string, number>} slaScores
 * @returns {{ id: string, name: string, score: number }[]}
 */
export function rankBySla(vendors, slaScores) {
  if (!Array.isArray(vendors)) return [];
  const scores = slaScores ?? {};
  return vendors
    .map((v) => ({ id: v.id, name: v.name, score: scores[v.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Find vendors with overdue milestones.
 *
 * @param {{ vendorId: string, paid?: boolean, dueDate?: string, name?: string }[]} milestones
 * @param {Date} [now]
 * @returns {{ vendorId: string, name: string, dueDate: string, daysOverdue: number }[]}
 */
export function overdueVendors(milestones, now) {
  const ref = now ?? new Date();
  if (!Array.isArray(milestones)) return [];
  // @ts-ignore
  return milestones
    .filter((m) => !m.paid && m.dueDate && new Date(m.dueDate) < ref)
    .map((m) => ({
      vendorId: m.vendorId,
      name: m.name ?? "",
      dueDate: m.dueDate,
      // @ts-ignore
      daysOverdue: Math.floor((ref.getTime() - new Date(m.dueDate).getTime()) / 86_400_000),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

/**
 * Compute payment completion rate across all milestones.
 *
 * @param {{ paid?: boolean }[]} milestones
 * @returns {{ total: number, paid: number, rate: number }}
 */
export function paymentCompletionRate(milestones) {
  if (!Array.isArray(milestones) || milestones.length === 0) return { total: 0, paid: 0, rate: 0 };
  const paid = milestones.filter((m) => m.paid).length;
  return { total: milestones.length, paid, rate: Math.round((paid / milestones.length) * 100) };
}

/**
 * Group vendors by their contract status.
 *
 * @param {{ id: string, name: string, status?: string }[]} vendors
 * @returns {Record<string, { id: string, name: string }[]>}
 */
export function groupByStatus(vendors) {
  if (!Array.isArray(vendors)) return {};
  const groups = /** @type {Record<string, { id: string, name: string }[]>} */ ({});
  for (const v of vendors) {
    const key = v.status ?? "unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push({ id: v.id, name: v.name });
  }
  return groups;
}
