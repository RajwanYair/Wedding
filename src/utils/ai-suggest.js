/**
 * src/utils/ai-suggest.js — re-export barrel (S681: domain module ai/index.ts)
 *
 * @module ai-suggest
 * @owner analytics
 */

export {
  resetIdCounter,
  createSuggestion,
  dismissSuggestion,
  applySuggestion,
  suggestSeating,
  suggestBudget,
  suggestVendor,
  getActiveSuggestions,
  sortSuggestions,
  getSuggestionStats,
} from "./ai/index.js";
