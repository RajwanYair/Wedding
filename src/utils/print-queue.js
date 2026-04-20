/**
 * src/utils/print-queue.js
 * Batch print job scheduling helpers — pure data, no DOM.
 *
 * @module print-queue
 */

// ── Constants ──────────────────────────────────────────────────────────────

/** Supported print job types. */
export const PRINT_TYPES = Object.freeze({
  PLACE_CARD: "place_card",
  ESCORT_CARD: "escort_card",
  TABLE_SIGN: "table_sign",
  INVITATION: "invitation",
  SEATING_CHART: "seating_chart",
  MENU_CARD: "menu_card",
  THANK_YOU: "thank_you",
});

/** Print job status values. */
export const PRINT_STATUS = Object.freeze({
  PENDING: "pending",
  PRINTING: "printing",
  DONE: "done",
  ERROR: "error",
  CANCELLED: "cancelled",
});

/** Average seconds to print one unit by type. */
const PRINT_SECONDS_PER_UNIT = {
  [PRINT_TYPES.PLACE_CARD]: 10,
  [PRINT_TYPES.ESCORT_CARD]: 8,
  [PRINT_TYPES.TABLE_SIGN]: 30,
  [PRINT_TYPES.INVITATION]: 45,
  [PRINT_TYPES.SEATING_CHART]: 60,
  [PRINT_TYPES.MENU_CARD]: 20,
  [PRINT_TYPES.THANK_YOU]: 15,
};

// ── Job builders ───────────────────────────────────────────────────────────

/**
 * Creates a single print job descriptor.
 * @param {{ type: string, guestId?: string|null, guestName?: string, tableNumber?: number|null, copies?: number, priority?: number, data?: object }} opts
 * @returns {{ id: string, type: string, guestId: string|null, guestName: string, tableNumber: number|null, copies: number, priority: number, status: string, createdAt: string, data: object }}
 */
export function createPrintJob({
  type,
  guestId = null,
  guestName = "",
  tableNumber = null,
  copies = 1,
  priority = 0,
  data = {},
}) {
  if (!PRINT_TYPES[type.toUpperCase().replace(/ /g, "_")] && !Object.values(PRINT_TYPES).includes(type)) {
    throw new Error(`Unknown print type: ${type}`);
  }
  if (copies < 1) throw new Error("copies must be >= 1");

  return {
    id: `pj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    guestId,
    guestName,
    tableNumber,
    copies,
    priority,
    status: PRINT_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    data,
  };
}

/**
 * Builds a print queue array from an array of job descriptors.
 * Deduplicates by guestId+type; keeps the last occurrence.
 * @param {Array} jobs
 * @returns {Array}
 */
export function buildPrintQueue(jobs) {
  if (!Array.isArray(jobs)) return [];

  const seen = new Map();
  for (const job of jobs) {
    const key = job.guestId ? `${job.guestId}:${job.type}` : `${job.id}:${job.type}`;
    seen.set(key, job);
  }

  return Array.from(seen.values());
}

/**
 * Sorts print jobs by priority (descending) then by createdAt (ascending).
 * Does NOT mutate the input array.
 * @param {Array} jobs
 * @returns {Array}
 */
export function sortPrintQueue(jobs) {
  if (!Array.isArray(jobs)) return [];
  return [...jobs].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

/**
 * Splits a print queue into chunks of `chunkSize` jobs.
 * @param {Array} jobs
 * @param {number} [chunkSize=50]
 * @returns {Array<Array>}
 */
export function chunkPrintQueue(jobs, chunkSize = 50) {
  if (!Array.isArray(jobs) || jobs.length === 0) return [];
  const chunks = [];
  for (let i = 0; i < jobs.length; i += chunkSize) {
    chunks.push(jobs.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Estimates total print time in seconds for an array of jobs.
 * @param {Array} jobs
 * @returns {number} Estimated seconds.
 */
export function estimatePrintTime(jobs) {
  if (!Array.isArray(jobs)) return 0;
  return jobs.reduce((total, job) => {
    const secondsPerUnit = PRINT_SECONDS_PER_UNIT[job.type] ?? 20;
    return total + secondsPerUnit * (job.copies ?? 1);
  }, 0);
}

/**
 * Builds a summary of a print queue (counts by type and status).
 * @param {Array} jobs
 * @returns {{ total: number, byType: object, byStatus: object, estimatedSeconds: number }}
 */
export function summarizePrintQueue(jobs) {
  if (!Array.isArray(jobs)) return { total: 0, byType: {}, byStatus: {}, estimatedSeconds: 0 };

  const byType = {};
  const byStatus = {};

  for (const job of jobs) {
    byType[job.type] = (byType[job.type] ?? 0) + 1;
    byStatus[job.status] = (byStatus[job.status] ?? 0) + 1;
  }

  return {
    total: jobs.length,
    byType,
    byStatus,
    estimatedSeconds: estimatePrintTime(jobs),
  };
}

/**
 * Filters jobs by type.
 * @param {Array} jobs
 * @param {string} type
 * @returns {Array}
 */
export function filterPrintJobsByType(jobs, type) {
  if (!Array.isArray(jobs)) return [];
  return jobs.filter((j) => j.type === type);
}

/**
 * Returns all print jobs belonging to a specific guest.
 * @param {Array} jobs
 * @param {string} guestId
 * @returns {Array}
 */
export function getPrintJobsByGuest(jobs, guestId) {
  if (!Array.isArray(jobs) || !guestId) return [];
  return jobs.filter((j) => j.guestId === guestId);
}
