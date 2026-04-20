/**
 * whatsapp-status.js — WhatsApp message delivery status helpers
 *
 * Pure data utilities. No DOM access.
 */

// ── Statuses ──────────────────────────────────────────────────────────────

export const WA_STATUS = Object.freeze({
  PENDING: "pending",
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read",
  FAILED: "failed",
});

// ── Predicates ────────────────────────────────────────────────────────────

/** @param {string} status */
export function isDelivered(status) {
  return status === WA_STATUS.DELIVERED || status === WA_STATUS.READ;
}

/** @param {string} status */
export function isRead(status) {
  return status === WA_STATUS.READ;
}

/** @param {string} status */
export function isFailed(status) {
  return status === WA_STATUS.FAILED;
}

// ── Webhook parsing ───────────────────────────────────────────────────────

/**
 * Parse a WhatsApp Cloud API status webhook payload into a normalised object.
 * @param {object} payload  raw webhook body
 * @returns {object|null}
 */
export function parseStatusWebhook(payload) {
  if (!payload || typeof payload !== "object") return null;

  // Flat format: { id, status, timestamp, recipient_id }
  const { id, status, timestamp, recipient_id: recipientId, errors } = payload;
  if (!id || !status) return null;

  const validStatuses = Object.values(WA_STATUS);
  const normStatus = validStatuses.includes(status) ? status : WA_STATUS.FAILED;

  return {
    messageId: id,
    status: normStatus,
    timestamp: timestamp ? new Date(Number(timestamp) * 1000).toISOString() : null,
    recipientId: recipientId ?? null,
    errors: Array.isArray(errors) ? errors : [],
  };
}

// ── Timeline ──────────────────────────────────────────────────────────────

/**
 * Build a sorted timeline from an array of parsed status objects for one message.
 * @param {object[]} statuses  array of parseStatusWebhook() results
 * @returns {object[]}
 */
export function buildStatusTimeline(statuses) {
  if (!Array.isArray(statuses)) return [];
  return [...statuses]
    .filter(s => s && s.messageId)
    .sort((a, b) => {
      if (!a.timestamp && !b.timestamp) return 0;
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return new Date(a.timestamp) - new Date(b.timestamp);
    });
}

// ── Latest status ─────────────────────────────────────────────────────────

/**
 * Order of status progression for determining which is "latest".
 */
const STATUS_ORDER = [
  WA_STATUS.PENDING,
  WA_STATUS.SENT,
  WA_STATUS.DELIVERED,
  WA_STATUS.READ,
  WA_STATUS.FAILED,
];

/**
 * Return the highest-progression status from an array of status strings.
 * FAILED is treated as terminal and returned if present.
 * @param {string[]} statusList
 * @returns {string}
 */
export function getLatestStatus(statusList) {
  if (!Array.isArray(statusList) || statusList.length === 0) return WA_STATUS.PENDING;
  if (statusList.includes(WA_STATUS.FAILED)) return WA_STATUS.FAILED;
  let best = WA_STATUS.PENDING;
  for (const s of statusList) {
    if (STATUS_ORDER.indexOf(s) > STATUS_ORDER.indexOf(best)) best = s;
  }
  return best;
}

// ── Summarise ─────────────────────────────────────────────────────────────

/**
 * Summarise an array of status strings (e.g. from all campaign recipients).
 * @param {string[]} statusList
 * @returns {{total: number, pending: number, sent: number, delivered: number, read: number, failed: number, deliveryRate: number, readRate: number}}
 */
export function summarizeStatuses(statusList) {
  if (!Array.isArray(statusList)) {
    return { total: 0, pending: 0, sent: 0, delivered: 0, read: 0, failed: 0, deliveryRate: 0, readRate: 0 };
  }
  const counts = { total: statusList.length, pending: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
  for (const s of statusList) {
    if (counts[s] !== undefined) counts[s]++;
  }
  const deliveryRate = counts.total ? (counts.delivered + counts.read) / counts.total : 0;
  const readRate = counts.total ? counts.read / counts.total : 0;
  return { ...counts, deliveryRate, readRate };
}
