/**
 * src/utils/vendor-timeline.js — re-export barrel (S677: domain module vendor/index.ts)
 *
 * @module vendor-timeline
 * @owner vendor-crm
 */

export {
  resetTimelineIdCounter as resetIdCounter,
  createTimelineEvent,
  createMilestone,
  completeMilestone,
  completeEvent,
  sortByDate,
  filterByVendor,
  filterByType,
  getOverdueMilestones,
  getUpcomingMilestones,
  getVendorTimelineSummary,
  groupByMonth,
} from "./vendor/index.js";
