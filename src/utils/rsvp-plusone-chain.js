/**
 * src/utils/rsvp-plusone-chain.js — re-export barrel (S678: domain module guest/index.ts)
 *
 * @module rsvp-plusone-chain
 * @owner guest
 */

export {
  resetIdCounter,
  createPlusOne,
  generateChain,
  setAnswer,
  propagateAnswer,
  cascadeMeal,
  cascadeDietary,
  validateChain,
  reorderChain,
  removePlusOne,
  chainSummary,
} from "./guest/index.js";
