/**
 * src/utils/whatsapp-scheduler.js — S642 WhatsApp scheduler + A/B
 *
 * Pure helpers for scheduling WhatsApp messages, managing
 * a send queue, A/B variant testing, and delivery tracking.
 *
 * @module whatsapp-scheduler
 * @owner whatsapp
 */

let _idCounter = 0;

/** Reset ID counter (testing). */
export function resetIdCounter(start = 0) {
  _idCounter = start;
}

/**
 * @typedef {object} ScheduledMessage
 * @property {string} id
 * @property {string} recipientPhone
 * @property {string} templateId
 * @property {string} variant — "A" | "B" | "control"
 * @property {string} scheduledAt — ISO 8601
 * @property {"queued" | "sent" | "delivered" | "failed" | "cancelled"} status
 * @property {string} [sentAt]
 * @property {string} [deliveredAt]
 * @property {string} [failReason]
 */

/**
 * Create a scheduled message.
 *
 * @param {string} recipientPhone
 * @param {string} templateId
 * @param {string} scheduledAt — ISO 8601
 * @param {string} [variant]
 * @returns {ScheduledMessage}
 */
export function scheduleMessage(recipientPhone, templateId, scheduledAt, variant = "control") {
  return {
    id: `sched_${++_idCounter}`,
    recipientPhone,
    templateId,
    variant,
    scheduledAt,
    status: "queued",
  };
}

/**
 * Create A/B variants for a message batch.
 *
 * @param {string[]} phones
 * @param {string} templateIdA
 * @param {string} templateIdB
 * @param {string} scheduledAt
 * @param {number} [splitRatio] - percentage assigned to A (0-100), default 50
 * @returns {{ a: ScheduledMessage[], b: ScheduledMessage[] }}
 */
export function createAbTest(phones, templateIdA, templateIdB, scheduledAt, splitRatio = 50) {
  if (!Array.isArray(phones)) return { a: [], b: [] };
  const ratio = Math.max(0, Math.min(100, splitRatio)) / 100;
  const splitIndex = Math.round(phones.length * ratio);
  const a = phones.slice(0, splitIndex).map((p) => scheduleMessage(p, templateIdA, scheduledAt, "A"));
  const b = phones.slice(splitIndex).map((p) => scheduleMessage(p, templateIdB, scheduledAt, "B"));
  return { a, b };
}

/**
 * Mark a message as sent.
 *
 * @param {ScheduledMessage} msg
 * @returns {ScheduledMessage}
 */
export function markSent(msg) {
  if (!msg || msg.status !== "queued") return msg;
  return { ...msg, status: "sent", sentAt: new Date().toISOString() };
}

/**
 * Mark a message as delivered.
 *
 * @param {ScheduledMessage} msg
 * @returns {ScheduledMessage}
 */
export function markDelivered(msg) {
  if (!msg || msg.status !== "sent") return msg;
  return { ...msg, status: "delivered", deliveredAt: new Date().toISOString() };
}

/**
 * Mark a message as failed.
 *
 * @param {ScheduledMessage} msg
 * @param {string} reason
 * @returns {ScheduledMessage}
 */
export function markFailed(msg, reason = "") {
  if (!msg || msg.status !== "queued" && msg.status !== "sent") return msg;
  return { ...msg, status: "failed", failReason: reason };
}

/**
 * Cancel a queued message.
 *
 * @param {ScheduledMessage} msg
 * @returns {ScheduledMessage}
 */
export function cancelMessage(msg) {
  if (!msg || msg.status !== "queued") return msg;
  return { ...msg, status: "cancelled" };
}

/**
 * Get messages ready to send (queued, scheduledAt <= now).
 *
 * @param {ScheduledMessage[]} queue
 * @param {Date} [now]
 * @returns {ScheduledMessage[]}
 */
export function getReadyToSend(queue, now) {
  const ref = now ?? new Date();
  if (!Array.isArray(queue)) return [];
  return queue.filter((m) => m.status === "queued" && new Date(m.scheduledAt) <= ref);
}

/**
 * Compute delivery stats for A/B analysis.
 *
 * @param {ScheduledMessage[]} messages
 * @returns {{ variant: string, total: number, sent: number, delivered: number, failed: number, deliveryRate: number }[]}
 */
export function abStats(messages) {
  if (!Array.isArray(messages)) return [];
  const groups = /** @type {Record<string, ScheduledMessage[]>} */ ({});
  for (const m of messages) {
    const v = m.variant ?? "control";
    if (!groups[v]) groups[v] = [];
    groups[v].push(m);
  }
  return Object.entries(groups).map(([variant, msgs]) => {
    const sent = msgs.filter((m) => m.status === "sent" || m.status === "delivered").length;
    const delivered = msgs.filter((m) => m.status === "delivered").length;
    const failed = msgs.filter((m) => m.status === "failed").length;
    return {
      variant,
      total: msgs.length,
      sent,
      delivered,
      failed,
      deliveryRate: msgs.length > 0 ? Math.round((delivered / msgs.length) * 100) : 0,
    };
  });
}

/**
 * Queue summary: count by status.
 *
 * @param {ScheduledMessage[]} queue
 * @returns {{ queued: number, sent: number, delivered: number, failed: number, cancelled: number, total: number }}
 */
export function queueSummary(queue) {
  const result = { queued: 0, sent: 0, delivered: 0, failed: 0, cancelled: 0, total: 0 };
  if (!Array.isArray(queue)) return result;
  for (const m of queue) {
    result.total++;
    if (m.status in result) result[m.status]++;
  }
  return result;
}
