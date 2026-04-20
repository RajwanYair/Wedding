/**
 * campaign-tracker.js — WhatsApp / SMS campaign send-tracking
 *
 * Pure data utilities. No DOM access.
 */

// ── Statuses ──────────────────────────────────────────────────────────────

export const CAMPAIGN_STATUSES = Object.freeze({
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  SENDING: "sending",
  SENT: "sent",
  PAUSED: "paused",
  CANCELLED: "cancelled",
});

// ── Recipient statuses ────────────────────────────────────────────────────

export const RECIPIENT_STATUSES = Object.freeze({
  PENDING: "pending",
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read",
  FAILED: "failed",
});

// ── Campaign ──────────────────────────────────────────────────────────────

/**
 * Create a new campaign record.
 * @param {{name: string, message: string, scheduledAt?: string|Date}} opts
 * @returns {object|null}
 */
export function createCampaign({ name, message, scheduledAt = null } = {}) {
  if (!name || typeof name !== "string") return null;
  if (!message || typeof message !== "string") return null;
  return {
    id: `campaign_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    message: message.trim(),
    status: CAMPAIGN_STATUSES.DRAFT,
    scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    createdAt: new Date().toISOString(),
    recipients: [],
  };
}

// ── Recipients ────────────────────────────────────────────────────────────

/**
 * Add a recipient to a campaign (non-mutating).
 * @param {object} campaign
 * @param {{guestId: string, phone: string, name?: string}} recipient
 * @returns {object|null}
 */
export function addCampaignRecipient(campaign, { guestId, phone, name = "" } = {}) {
  if (!campaign || !guestId || !phone) return null;
  const entry = {
    guestId,
    phone,
    name: name.trim(),
    status: RECIPIENT_STATUSES.PENDING,
    sentAt: null,
    deliveredAt: null,
    readAt: null,
    failReason: null,
  };
  return { ...campaign, recipients: [...campaign.recipients, entry] };
}

/**
 * Update a recipient's delivery status (non-mutating).
 * @param {object} campaign
 * @param {string} guestId
 * @param {string} status  one of RECIPIENT_STATUSES
 * @param {object} [meta]  optional {sentAt, deliveredAt, readAt, failReason}
 * @returns {object|null}
 */
export function updateRecipientStatus(campaign, guestId, status, meta = {}) {
  if (!campaign || !guestId || !status) return null;
  const validStatuses = Object.values(RECIPIENT_STATUSES);
  if (!validStatuses.includes(status)) return null;
  const recipients = campaign.recipients.map(r => {
    if (r.guestId !== guestId) return r;
    return { ...r, status, ...meta };
  });
  return { ...campaign, recipients };
}

// ── Stats ─────────────────────────────────────────────────────────────────

/**
 * Aggregate delivery statistics for a campaign.
 * @param {object} campaign
 * @returns {object}
 */
export function getCampaignStats(campaign) {
  if (!campaign || !Array.isArray(campaign.recipients)) {
    return { total: 0, pending: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
  }
  const counts = { total: campaign.recipients.length, pending: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
  for (const r of campaign.recipients) {
    if (counts[r.status] !== undefined) counts[r.status]++;
  }
  return counts;
}

/**
 * Delivery rate: (delivered + read) / total.
 * @param {object} campaign
 * @returns {number} 0–1
 */
export function getDeliveryRate(campaign) {
  const s = getCampaignStats(campaign);
  if (s.total === 0) return 0;
  return (s.delivered + s.read) / s.total;
}

/**
 * Read rate: read / total.
 * @param {object} campaign
 * @returns {number} 0–1
 */
export function getReadRate(campaign) {
  const s = getCampaignStats(campaign);
  if (s.total === 0) return 0;
  return s.read / s.total;
}

// ── Filtering ─────────────────────────────────────────────────────────────

/**
 * Filter recipients by status.
 * @param {object} campaign
 * @param {string} status
 * @returns {object[]}
 */
export function filterByStatus(campaign, status) {
  if (!campaign || !Array.isArray(campaign.recipients)) return [];
  return campaign.recipients.filter(r => r.status === status);
}

// ── Report ────────────────────────────────────────────────────────────────

/**
 * Build a human-readable campaign report object.
 * @param {object} campaign
 * @returns {object}
 */
export function buildCampaignReport(campaign) {
  if (!campaign) return null;
  const stats = getCampaignStats(campaign);
  const deliveryRate = getDeliveryRate(campaign);
  const readRate = getReadRate(campaign);
  return {
    campaignId: campaign.id,
    name: campaign.name,
    status: campaign.status,
    stats,
    deliveryRate: Math.round(deliveryRate * 100),
    readRate: Math.round(readRate * 100),
    generatedAt: new Date().toISOString(),
  };
}
