/**
 * src/utils/vendor-negotiate.js — re-export barrel (S677: domain module vendor/index.ts)
 *
 * @module vendor-negotiate
 * @owner vendor-crm
 */

export {
  resetNegotiateIdCounter as resetIdCounter,
  startNegotiation,
  submitOffer,
  acceptNegotiation,
  rejectNegotiation,
  getLatestOffer,
  getSavings,
  getNegotiationProgress,
  getNegotiationStats,
  isWithinBudget,
  suggestCounterOffer,
} from "./vendor/index.js";
