/**
 * src/services/delivery-tracking.js — Delivery tracking service (Sprint 46)
 *
 * Records and queries message delivery outcomes (WhatsApp, email, SMS) for
 * each guest.  Backed by the `deliveries` store key.
 *
 * Usage:
 *   import { recordDelivery, getDeliveryHistory } from "../services/delivery-tracking.js";
 */

import { storeGet, storeSet, storeUpsert } from "../core/store.js";

// ── Types ──────────────────────────────────────────────────────────────────
/**
 * @typedef {'sent'|'delivered'|'read'|'failed'|'bounced'} DeliveryStatus
 * @typedef {'whatsapp'|'email'|'sms'} DeliveryChannel
 *
 * @typedef {{
 *   id: string,
 *   guestId: string,
 *   channel: DeliveryChannel,
 *   status: DeliveryStatus,
 *   messageId?: string,
 *   campaignId?: string,
 *   ts: number,
 * }} DeliveryRecord
 */

// ── Helpers ────────────────────────────────────────────────────────────────

/** @returns {DeliveryRecord[]} */
function getAllRecords() {
  return /** @type {DeliveryRecord[]} */ (storeGet("deliveries") ?? []);
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Record a delivery event for a guest.
 *
 * @param {string} guestId
 * @param {DeliveryChannel} channel
 * @param {DeliveryStatus} status
 * @param {{ messageId?: string, campaignId?: string }} [meta]
 * @returns {DeliveryRecord}
 */
export function recordDelivery(guestId, channel, status, meta = {}) {
  const record = /** @type {DeliveryRecord} */ ({
    id: `dlv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    guestId,
    channel,
    status,
    messageId: meta.messageId,
    campaignId: meta.campaignId,
    ts: Date.now(),
  });

  storeUpsert("deliveries", record);
  return record;
}

/**
 * Get all delivery records for a specific guest, sorted newest-first.
 *
 * @param {string} guestId
 * @returns {DeliveryRecord[]}
 */
export function getDeliveryHistory(guestId) {
  return getAllRecords()
    .filter((r) => r.guestId === guestId)
    .sort((a, b) => b.ts - a.ts);
}

/**
 * Get all records that have a `failed` or `bounced` status.
 *
 * @param {{ channel?: DeliveryChannel }} [filter]
 * @returns {DeliveryRecord[]}
 */
export function getUndelivered(filter = {}) {
  let records = getAllRecords().filter(
    (r) => r.status === "failed" || r.status === "bounced",
  );
  if (filter.channel) {
    records = records.filter((r) => r.channel === filter.channel);
  }
  return records.sort((a, b) => b.ts - a.ts);
}

/**
 * Get the most recent delivery record for a guest on a given channel.
 *
 * @param {string} guestId
 * @param {DeliveryChannel} channel
 * @returns {DeliveryRecord|undefined}
 */
export function getLatestDelivery(guestId, channel) {
  return getAllRecords()
    .filter((r) => r.guestId === guestId && r.channel === channel)
    .sort((a, b) => b.ts - a.ts)[0];
}

/**
 * Get aggregated delivery stats across all records.
 *
 * @param {{ campaignId?: string, channel?: DeliveryChannel }} [filter]
 * @returns {{ total: number, sent: number, delivered: number, read: number, failed: number, bounced: number }}
 */
export function getDeliveryStats(filter = {}) {
  let records = getAllRecords();
  if (filter.campaignId) records = records.filter((r) => r.campaignId === filter.campaignId);
  if (filter.channel)    records = records.filter((r) => r.channel === filter.channel);

  const stats = { total: records.length, sent: 0, delivered: 0, read: 0, failed: 0, bounced: 0 };
  for (const r of records) {
    if (r.status in stats) stats[r.status]++;
  }
  return stats;
}

/**
 * Clear all delivery records for a specific guest (e.g. on guest deletion).
 *
 * @param {string} guestId
 */
export function clearGuestDeliveries(guestId) {
  const remaining = getAllRecords().filter((r) => r.guestId !== guestId);
  storeSet("deliveries", remaining);
}
