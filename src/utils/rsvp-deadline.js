/**
 * src/utils/rsvp-deadline.js — Sprint 124
 *
 * Utilities for RSVP deadline management: countdown, overdue detection,
 * reminder scheduling.
 */

// ── Countdown ─────────────────────────────────────────────────────────────

/**
 * Calculate a countdown to a deadline.
 * @param {string | Date} deadline  ISO string or Date object
 * @param {Date} [now]              Current time (injectable for tests)
 * @returns {{ days: number, hours: number, minutes: number, seconds: number, isPast: boolean }}
 */
export function getCountdown(deadline, now = new Date()) {
  const target = deadline instanceof Date ? deadline : new Date(deadline);
  const diffMs = target.getTime() - now.getTime();
  const isPast = diffMs < 0;
  const abs = Math.abs(diffMs);

  return {
    days: Math.floor(abs / 86_400_000),
    hours: Math.floor((abs % 86_400_000) / 3_600_000),
    minutes: Math.floor((abs % 3_600_000) / 60_000),
    seconds: Math.floor((abs % 60_000) / 1_000),
    isPast,
  };
}

/**
 * True when the deadline has passed.
 * @param {string | Date} deadline
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isOverdue(deadline, now = new Date()) {
  const target = deadline instanceof Date ? deadline : new Date(deadline);
  return target.getTime() < now.getTime();
}

/**
 * Number of milliseconds until a deadline (negative if past).
 * @param {string | Date} deadline
 * @param {Date} [now]
 * @returns {number}
 */
export function msUntilDeadline(deadline, now = new Date()) {
  const target = deadline instanceof Date ? deadline : new Date(deadline);
  return target.getTime() - now.getTime();
}

// ── Reminder scheduling ───────────────────────────────────────────────────

/**
 * @typedef {{ label: string, sendAt: Date, daysBeforeDeadline: number }} ReminderPoint
 */

/**
 * Calculate reminder send-times relative to a deadline.
 * @param {string | Date} deadline
 * @param {number[]} [daysBeforeList]  Days before deadline to send reminders (default: 14, 7, 3, 1)
 * @param {Date} [now]
 * @returns {ReminderPoint[]}  Only future reminders are returned
 */
export function getReminderSchedule(deadline, daysBeforeList = [14, 7, 3, 1], now = new Date()) {
  const target = deadline instanceof Date ? deadline : new Date(deadline);
  /** @type {ReminderPoint[]} */
  const points = [];

  for (const days of daysBeforeList) {
    const sendAt = new Date(target.getTime() - days * 86_400_000);
    if (sendAt.getTime() > now.getTime()) {
      points.push({ label: `${days}-day reminder`, sendAt, daysBeforeDeadline: days });
    }
  }

  return points.sort((a, b) => a.sendAt.getTime() - b.sendAt.getTime());
}

/**
 * Identify guests who have not responded by a given deadline.
 * @param {{ id: string, status: string }[]} guests
 * @param {string | Date} deadline
 * @param {Date} [now]
 * @returns {{ id: string, status: string }[]}
 */
export function getOverdueGuests(guests, deadline, now = new Date()) {
  if (!isOverdue(deadline, now)) return [];
  return guests.filter((g) => g.status === "pending" || g.status === "maybe");
}

/**
 * Summarize RSVP deadline status for a guest list.
 * @param {{ id: string, status: string }[]} guests
 * @param {string | Date} deadline
 * @param {Date} [now]
 * @returns {{ deadline: string, isOverdue: boolean, msRemaining: number,
 *   overdueCount: number, pendingCount: number, respondedCount: number }}
 */
export function getDeadlineSummary(guests, deadline, now = new Date()) {
  const target = deadline instanceof Date ? deadline : new Date(deadline);
  return {
    deadline: target.toISOString(),
    isOverdue: isOverdue(deadline, now),
    msRemaining: msUntilDeadline(deadline, now),
    overdueCount: getOverdueGuests(guests, deadline, now).length,
    pendingCount: guests.filter((g) => g.status === "pending").length,
    respondedCount: guests.filter((g) => ["confirmed", "declined"].includes(g.status)).length,
  };
}
