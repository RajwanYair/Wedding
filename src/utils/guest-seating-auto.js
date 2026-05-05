/**
 * src/utils/guest-seating-auto.js — re-export barrel (S678: domain module guest/index.ts)
 *
 * @module guest-seating-auto
 * @owner guest
 */

export {
  createSeatGuest,
  createSeatTable,
  extractConstraints,
  autoAssign,
  calculateScore,
  countViolations,
  getSeatingStats,
} from "./guest/index.js";
