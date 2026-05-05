/**
 * src/utils/rsvp-question-builder.js — re-export barrel (S679: domain module rsvp/builder.ts)
 *
 * @module rsvp-question-builder
 * @owner rsvp
 */

export {
  nextQuestionId,
  resetIdCounter,
  createQuestion,
  addQuestion,
  removeQuestion,
  updateQuestion,
  moveQuestion,
  condEquals,
  condExists,
  condAll,
  condAny,
  duplicateQuestion,
  validateQuestionList,
} from "./rsvp/builder.js";
