/**
 * src/utils/vendor-negotiate.js — Vendor negotiation tracking (S668)
 *
 * @module vendor-negotiate
 * @owner vendor-crm
 */

/**
 * @typedef {"pending"|"countered"|"accepted"|"rejected"|"expired"} NegotiationStatus
 */

/**
 * @typedef {object} Offer
 * @property {string} id
 * @property {string} negotiationId
 * @property {"vendor"|"client"} from
 * @property {number} amount
 * @property {string} note
 * @property {number} timestamp
 */

/**
 * @typedef {object} Negotiation
 * @property {string} id
 * @property {string} vendorId
 * @property {string} vendorName
 * @property {string} service
 * @property {number} initialAsk
 * @property {number} budget
 * @property {NegotiationStatus} status
 * @property {Offer[]} offers
 * @property {number} createdAt
 * @property {number|null} resolvedAt
 */

let _idCounter = 0;

/** Reset ID counter - testing only. */
export function resetIdCounter(start = 0) {
  _idCounter = start;
}

/**
 * Start a new negotiation.
 * @param {object} params
 * @param {string} params.vendorId
 * @param {string} params.vendorName
 * @param {string} params.service
 * @param {number} params.initialAsk
 * @param {number} params.budget
 * @returns {Negotiation}
 */
export function startNegotiation({ vendorId, vendorName, service, initialAsk, budget }) {
  const id = `neg_${++_idCounter}`;
  return {
    id,
    vendorId,
    vendorName: (vendorName || "").trim(),
    service: (service || "").trim(),
    initialAsk: Math.max(0, initialAsk || 0),
    budget: Math.max(0, budget || 0),
    status: "pending",
    offers: [],
    createdAt: Date.now(),
    resolvedAt: null,
  };
}

/**
 * Submit a counter-offer.
 * @param {Negotiation} negotiation
 * @param {"vendor"|"client"} from
 * @param {number} amount
 * @param {string} [note]
 * @returns {Negotiation}
 */
export function submitOffer(negotiation, from, amount, note = "") {
  if (negotiation.status === "accepted" || negotiation.status === "rejected") {
    return negotiation;
  }

  const offer = {
    id: `offer_${++_idCounter}`,
    negotiationId: negotiation.id,
    from,
    amount: Math.max(0, amount),
    note,
    timestamp: Date.now(),
  };

  return {
    ...negotiation,
    status: "countered",
    offers: [...negotiation.offers, offer],
  };
}

/**
 * Accept the negotiation at current offer.
 * @param {Negotiation} negotiation
 * @returns {Negotiation}
 */
export function acceptNegotiation(negotiation) {
  if (negotiation.status === "accepted" || negotiation.status === "rejected") {
    return negotiation;
  }
  return {
    ...negotiation,
    status: "accepted",
    resolvedAt: Date.now(),
  };
}

/**
 * Reject the negotiation.
 * @param {Negotiation} negotiation
 * @returns {Negotiation}
 */
export function rejectNegotiation(negotiation) {
  if (negotiation.status === "accepted" || negotiation.status === "rejected") {
    return negotiation;
  }
  return {
    ...negotiation,
    status: "rejected",
    resolvedAt: Date.now(),
  };
}

/**
 * Get the latest offer amount.
 * @param {Negotiation} negotiation
 * @returns {number}
 */
export function getLatestOffer(negotiation) {
  if (negotiation.offers.length === 0) return negotiation.initialAsk;
  return negotiation.offers[negotiation.offers.length - 1].amount;
}

/**
 * Calculate savings vs initial ask.
 * @param {Negotiation} negotiation
 * @returns {number}
 */
export function getSavings(negotiation) {
  const final = getLatestOffer(negotiation);
  return Math.max(0, negotiation.initialAsk - final);
}

/**
 * Calculate negotiation progress (0-100%).
 * @param {Negotiation} negotiation
 * @returns {number}
 */
export function getNegotiationProgress(negotiation) {
  if (negotiation.initialAsk <= negotiation.budget) return 100;
  const gap = negotiation.initialAsk - negotiation.budget;
  const current = negotiation.initialAsk - getLatestOffer(negotiation);
  if (gap === 0) return 100;
  return Math.min(100, Math.max(0, Math.round((current / gap) * 100)));
}

/**
 * Get negotiation stats across all negotiations.
 * @param {Negotiation[]} negotiations
 * @returns {{ total: number, active: number, accepted: number, rejected: number, totalSavings: number, avgRounds: number }}
 */
export function getNegotiationStats(negotiations) {
  let active = 0;
  let accepted = 0;
  let rejected = 0;
  let totalSavings = 0;
  let totalRounds = 0;

  for (const n of negotiations) {
    if (n.status === "accepted") {
      accepted++;
      totalSavings += getSavings(n);
    } else if (n.status === "rejected") {
      rejected++;
    } else {
      active++;
    }
    totalRounds += n.offers.length;
  }

  return {
    total: negotiations.length,
    active,
    accepted,
    rejected,
    totalSavings,
    avgRounds: negotiations.length > 0 ? Math.round(totalRounds / negotiations.length) : 0,
  };
}

/**
 * Check if negotiation is within budget.
 * @param {Negotiation} negotiation
 * @returns {boolean}
 */
export function isWithinBudget(negotiation) {
  return getLatestOffer(negotiation) <= negotiation.budget;
}

/**
 * Suggest a counter-offer midpoint.
 * @param {Negotiation} negotiation
 * @returns {number}
 */
export function suggestCounterOffer(negotiation) {
  const current = getLatestOffer(negotiation);
  const target = negotiation.budget;
  return Math.round((current + target) / 2);
}
