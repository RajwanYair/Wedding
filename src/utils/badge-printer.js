/**
 * src/utils/badge-printer.js — S647 Kiosk badge printing helpers
 *
 * Pure helpers that build badge layout data for thermal/label printers,
 * format badge fields, and batch-queue print jobs.
 *
 * @module badge-printer
 * @owner checkin
 */

let _jobCounter = 0;

/** Reset job counter (for tests). */
export function resetJobCounter() {
  _jobCounter = 0;
}

/**
 * @typedef {object} BadgeLayout
 * @property {string} guestName
 * @property {string} [tableName]
 * @property {string} [meal]
 * @property {string} [qrData]
 * @property {string} [side]
 * @property {string} [greeting]
 * @property {number} widthMm
 * @property {number} heightMm
 */

/**
 * @typedef {object} PrintJob
 * @property {string} id
 * @property {BadgeLayout} badge
 * @property {"queued"|"printing"|"done"|"failed"} status
 * @property {string} createdAt
 */

/**
 * Build a badge layout from a guest record.
 *
 * @param {{ name: string, tableNumber?: number|string, tableName?: string,
 *           meal?: string, id?: string, side?: string }} guest
 * @param {{ widthMm?: number, heightMm?: number, greeting?: string }} [options]
 * @returns {BadgeLayout}
 */
export function buildBadgeLayout(guest, options = {}) {
  const g = guest ?? {};
  return {
    guestName: String(g.name ?? "").trim(),
    tableName: g.tableName ?? (g.tableNumber != null ? String(g.tableNumber) : undefined),
    meal: g.meal ?? undefined,
    qrData: g.id ? `checkin:${g.id}` : undefined,
    side: g.side ?? undefined,
    greeting: options.greeting ?? undefined,
    widthMm: options.widthMm ?? 90,
    heightMm: options.heightMm ?? 54,
  };
}

/**
 * Format badge text for thermal printer (plain text layout).
 *
 * @param {BadgeLayout} badge
 * @returns {string}
 */
export function formatThermalText(badge) {
  if (!badge) return "";
  const lines = [];
  if (badge.greeting) lines.push(badge.greeting);
  lines.push(badge.guestName || "---");
  if (badge.tableName) lines.push(`Table: ${badge.tableName}`);
  if (badge.meal) lines.push(`Meal: ${badge.meal}`);
  if (badge.side) lines.push(`Side: ${badge.side}`);
  return lines.join("\n");
}

/**
 * Create a print job for a single badge.
 *
 * @param {BadgeLayout} badge
 * @returns {PrintJob}
 */
export function createPrintJob(badge) {
  _jobCounter++;
  return {
    id: `pj_${_jobCounter}`,
    badge: badge ?? { guestName: "", widthMm: 90, heightMm: 54 },
    status: "queued",
    createdAt: new Date().toISOString(),
  };
}

/**
 * Batch-create print jobs for an array of guests.
 *
 * @param {{ name: string, tableNumber?: number|string, tableName?: string,
 *           meal?: string, id?: string, side?: string }[]} guests
 * @param {{ widthMm?: number, heightMm?: number, greeting?: string }} [options]
 * @returns {PrintJob[]}
 */
export function batchPrintJobs(guests, options) {
  if (!Array.isArray(guests)) return [];
  return guests.map((g) => createPrintJob(buildBadgeLayout(g, options)));
}

/**
 * Mark a print job as printing.
 *
 * @param {PrintJob} job
 * @returns {PrintJob}
 */
export function markPrinting(job) {
  if (!job) return job;
  return { ...job, status: "printing" };
}

/**
 * Mark a print job as done.
 *
 * @param {PrintJob} job
 * @returns {PrintJob}
 */
export function markDone(job) {
  if (!job) return job;
  return { ...job, status: "done" };
}

/**
 * Mark a print job as failed.
 *
 * @param {PrintJob} job
 * @returns {PrintJob}
 */
export function markFailed(job) {
  if (!job) return job;
  return { ...job, status: "failed" };
}

/**
 * Get queue statistics from a list of print jobs.
 *
 * @param {PrintJob[]} jobs
 * @returns {{ total: number, queued: number, printing: number, done: number, failed: number }}
 */
export function queueStats(jobs) {
  if (!Array.isArray(jobs)) return { total: 0, queued: 0, printing: 0, done: 0, failed: 0 };
  let queued = 0;
  let printing = 0;
  let done = 0;
  let failed = 0;
  for (const j of jobs) {
    if (j.status === "queued") queued++;
    else if (j.status === "printing") printing++;
    else if (j.status === "done") done++;
    else if (j.status === "failed") failed++;
  }
  return { total: jobs.length, queued, printing, done, failed };
}

/**
 * Filter jobs by status.
 *
 * @param {PrintJob[]} jobs
 * @param {"queued"|"printing"|"done"|"failed"} status
 * @returns {PrintJob[]}
 */
export function filterByStatus(jobs, status) {
  if (!Array.isArray(jobs)) return [];
  return jobs.filter((j) => j.status === status);
}
