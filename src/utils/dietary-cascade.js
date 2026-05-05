/**
 * src/utils/dietary-cascade.js — re-export barrel (S678: domain module guest/index.ts)
 *
 * @module dietary-cascade
 * @owner guest
 */

export {
  DEFAULT_CASCADE_RULES,
  getCascadeQuestions,
  expandPlusOneCascade,
  validateCascadeAnswers,
  buildCascadeSummary,
} from "./guest/index.js";
