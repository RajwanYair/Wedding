/**
 * src/utils/vendor-timeline.js — Vendor interaction timeline (S669)
 *
 * @module vendor-timeline
 * @owner vendor-crm
 */

/**
 * @typedef {"call"|"email"|"meeting"|"payment"|"milestone"|"note"|"contract"} EventType
 */

/**
 * @typedef {object} TimelineEvent
 * @property {string} id
 * @property {string} vendorId
 * @property {EventType} type
 * @property {string} title
 * @property {string} description
 * @property {number} timestamp
 * @property {boolean} completed
 */

/**
 * @typedef {object} Milestone
 * @property {string} id
 * @property {string} vendorId
 * @property {string} label
 * @property {number} dueDate
 * @property {boolean} completed
 * @property {number|null} completedAt
 */

let _idCounter = 0;

/** Reset ID counter - testing only. */
export function resetIdCounter(start = 0) {
  _idCounter = start;
}

/**
 * Create a timeline event.
 * @param {object} params
 * @param {string} params.vendorId
 * @param {EventType} params.type
 * @param {string} params.title
 * @param {string} [params.description]
 * @param {number} [params.timestamp]
 * @returns {TimelineEvent}
 */
export function createTimelineEvent({ vendorId, type, title, description, timestamp }) {
  return {
    id: `evt_${++_idCounter}`,
    vendorId,
    type: type || "note",
    title: (title || "").trim(),
    description: (description || "").trim(),
    timestamp: timestamp || Date.now(),
    completed: false,
  };
}

/**
 * Create a milestone.
 * @param {object} params
 * @param {string} params.vendorId
 * @param {string} params.label
 * @param {number} params.dueDate
 * @returns {Milestone}
 */
export function createMilestone({ vendorId, label, dueDate }) {
  return {
    id: `ms_${++_idCounter}`,
    vendorId,
    label: (label || "").trim(),
    dueDate,
    completed: false,
    completedAt: null,
  };
}

/**
 * Complete a milestone.
 * @param {Milestone} milestone
 * @returns {Milestone}
 */
export function completeMilestone(milestone) {
  if (milestone.completed) return milestone;
  return { ...milestone, completed: true, completedAt: Date.now() };
}

/**
 * Mark event as completed.
 * @param {TimelineEvent} event
 * @returns {TimelineEvent}
 */
export function completeEvent(event) {
  return { ...event, completed: true };
}

/**
 * Sort events chronologically.
 * @param {TimelineEvent[]} events
 * @param {"asc"|"desc"} [direction]
 * @returns {TimelineEvent[]}
 */
export function sortByDate(events, direction = "desc") {
  return [...events].sort((a, b) =>
    direction === "desc" ? b.timestamp - a.timestamp : a.timestamp - b.timestamp
  );
}

/**
 * Filter events by vendor.
 * @param {TimelineEvent[]} events
 * @param {string} vendorId
 * @returns {TimelineEvent[]}
 */
export function filterByVendor(events, vendorId) {
  return events.filter((e) => e.vendorId === vendorId);
}

/**
 * Filter events by type.
 * @param {TimelineEvent[]} events
 * @param {EventType} type
 * @returns {TimelineEvent[]}
 */
export function filterByType(events, type) {
  return events.filter((e) => e.type === type);
}

/**
 * Get overdue milestones.
 * @param {Milestone[]} milestones
 * @param {number} [now]
 * @returns {Milestone[]}
 */
export function getOverdueMilestones(milestones, now = Date.now()) {
  return milestones.filter((m) => !m.completed && m.dueDate < now);
}

/**
 * Get upcoming milestones within days.
 * @param {Milestone[]} milestones
 * @param {number} days
 * @param {number} [now]
 * @returns {Milestone[]}
 */
export function getUpcomingMilestones(milestones, days, now = Date.now()) {
  const future = now + days * 86_400_000;
  return milestones.filter((m) => !m.completed && m.dueDate >= now && m.dueDate <= future);
}

/**
 * Get timeline summary for a vendor.
 * @param {TimelineEvent[]} events
 * @param {Milestone[]} milestones
 * @param {string} vendorId
 * @returns {{ totalEvents: number, completedEvents: number, totalMilestones: number, completedMilestones: number, lastActivity: number|null }}
 */
export function getVendorTimelineSummary(events, milestones, vendorId) {
  const vendorEvents = filterByVendor(events, vendorId);
  const vendorMs = milestones.filter((m) => m.vendorId === vendorId);

  const completedEvents = vendorEvents.filter((e) => e.completed).length;
  const completedMs = vendorMs.filter((m) => m.completed).length;

  const sorted = sortByDate(vendorEvents, "desc");
  const lastActivity = sorted.length > 0 ? sorted[0].timestamp : null;

  return {
    totalEvents: vendorEvents.length,
    completedEvents,
    totalMilestones: vendorMs.length,
    completedMilestones: completedMs,
    lastActivity,
  };
}

/**
 * Group events by month (YYYY-MM).
 * @param {TimelineEvent[]} events
 * @returns {Record<string, TimelineEvent[]>}
 */
export function groupByMonth(events) {
  /** @type {Record<string, TimelineEvent[]>} */
  const groups = {};
  for (const e of events) {
    const d = new Date(e.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  return groups;
}
