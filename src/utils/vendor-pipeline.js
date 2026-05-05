/**
 * src/utils/vendor-pipeline.js — S655 Vendor deal pipeline / stage tracking
 *
 * Pure helpers for managing vendor deal stages — from initial contact
 * through negotiation, booking, and completion. Tracks stage transitions,
 * stale deals, and pipeline summary statistics.
 *
 * @module vendor-pipeline
 * @owner vendor-crm
 */

let _dealCounter = 0;

/** Reset counter (for tests). */
export function resetDealCounter() {
  _dealCounter = 0;
}

/**
 * @typedef {object} Deal
 * @property {string} id
 * @property {string} vendorId
 * @property {string} stage - "lead"|"contacted"|"negotiating"|"booked"|"completed"|"lost"
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {Array<{from: string, to: string, at: string}>} history
 * @property {Record<string, unknown>} [metadata]
 */

const VALID_STAGES = ["lead", "contacted", "negotiating", "booked", "completed", "lost"];

const STAGE_ORDER = { lead: 0, contacted: 1, negotiating: 2, booked: 3, completed: 4, lost: 5 };

/**
 * Create a new deal for a vendor.
 *
 * @param {string} vendorId
 * @param {Record<string, unknown>} [metadata]
 * @returns {Deal}
 */
export function createDeal(vendorId, metadata) {
  _dealCounter++;
  const now = new Date().toISOString();
  return {
    id: `deal_${_dealCounter}`,
    vendorId: String(vendorId ?? ""),
    stage: "lead",
    createdAt: now,
    updatedAt: now,
    history: [],
    metadata: metadata ?? undefined,
  };
}

/**
 * Advance a deal to the next stage.
 *
 * @param {Deal} deal
 * @param {string} newStage
 * @returns {Deal}
 */
export function advanceStage(deal, newStage) {
  if (!deal || typeof deal !== "object") return deal;
  if (!VALID_STAGES.includes(newStage)) return deal;
  if (deal.stage === newStage) return deal;

  const now = new Date().toISOString();
  return {
    ...deal,
    stage: newStage,
    updatedAt: now,
    history: [...(deal.history ?? []), { from: deal.stage, to: newStage, at: now }],
  };
}

/**
 * Mark a deal as lost with an optional reason.
 *
 * @param {Deal} deal
 * @param {string} [reason]
 * @returns {Deal}
 */
export function markLost(deal, reason) {
  const updated = advanceStage(deal, "lost");
  if (reason) {
    return { ...updated, metadata: { ...(updated.metadata ?? {}), lostReason: reason } };
  }
  return updated;
}

/**
 * Mark a deal as completed.
 *
 * @param {Deal} deal
 * @returns {Deal}
 */
export function markCompleted(deal) {
  return advanceStage(deal, "completed");
}

/**
 * Check if a deal is stale (no update in given days).
 *
 * @param {Deal} deal
 * @param {number} [staleDays=14]
 * @returns {boolean}
 */
export function isStale(deal, staleDays = 14) {
  if (!deal?.updatedAt) return false;
  const diffMs = Date.now() - new Date(deal.updatedAt).getTime();
  return diffMs > staleDays * 86400000;
}

/**
 * Get all deals at a specific stage.
 *
 * @param {Deal[]} deals
 * @param {string} stage
 * @returns {Deal[]}
 */
export function filterByStage(deals, stage) {
  if (!Array.isArray(deals)) return [];
  return deals.filter((d) => d.stage === stage);
}

/**
 * Group deals by stage.
 *
 * @param {Deal[]} deals
 * @returns {Record<string, Deal[]>}
 */
export function groupByStage(deals) {
  if (!Array.isArray(deals)) return {};
  /** @type {Record<string, Deal[]>} */
  const result = {};
  for (const d of deals) {
    (result[d.stage] ??= []).push(d);
  }
  return result;
}

/**
 * Sort deals by stage order (lead → completed/lost).
 *
 * @param {Deal[]} deals
 * @returns {Deal[]}
 */
export function sortByStage(deals) {
  if (!Array.isArray(deals)) return [];
  return [...deals].sort((a, b) => (STAGE_ORDER[a.stage] ?? 99) - (STAGE_ORDER[b.stage] ?? 99));
}

/**
 * Pipeline summary statistics.
 *
 * @param {Deal[]} deals
 * @returns {{ total: number, byStage: Record<string, number>, active: number, won: number, lost: number, conversionRate: number }}
 */
export function pipelineSummary(deals) {
  if (!Array.isArray(deals) || deals.length === 0) {
    return { total: 0, byStage: {}, active: 0, won: 0, lost: 0, conversionRate: 0 };
  }

  /** @type {Record<string, number>} */
  const byStage = {};
  let won = 0;
  let lost = 0;

  for (const d of deals) {
    byStage[d.stage] = (byStage[d.stage] ?? 0) + 1;
    if (d.stage === "completed") won++;
    if (d.stage === "lost") lost++;
  }

  const closed = won + lost;
  return {
    total: deals.length,
    byStage,
    active: deals.length - closed,
    won,
    lost,
    conversionRate: closed > 0 ? Math.round((won / closed) * 100) : 0,
  };
}

/**
 * Average time in a specific stage across deals (in days).
 *
 * @param {Deal[]} deals
 * @param {string} stage
 * @returns {number}
 */
export function avgTimeInStage(deals, stage) {
  if (!Array.isArray(deals)) return 0;

  const durations = [];
  for (const d of deals) {
    const entries = (d.history ?? []).filter((h) => h.from === stage);
    const arrivals = (d.history ?? []).filter((h) => h.to === stage);
    if (arrivals.length > 0 && entries.length > 0) {
      const entered = new Date(arrivals[0].at).getTime();
      const left = new Date(entries[0].at).getTime();
      if (left > entered) {
        durations.push((left - entered) / 86400000);
      }
    }
  }

  if (durations.length === 0) return 0;
  return Math.round((durations.reduce((s, v) => s + v, 0) / durations.length) * 10) / 10;
}
