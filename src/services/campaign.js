/**
 * src/services/campaign.js — Campaign state tracker (Sprint 42)
 *
 * Manages the lifecycle of WhatsApp / email messaging campaigns.
 * State is persisted in the store under the `campaigns` key.
 *
 * Campaign lifecycle:
 *   draft → queued → sending → completed | failed | cancelled
 *
 * Usage:
 *   import { createCampaign, startCampaign, recordSent } from "../services/campaign.js";
 *
 *   const id = createCampaign({ name: "RSVP Reminders", type: "whatsapp", guestIds: [...] });
 *   startCampaign(id);
 *   recordSent(id, guestId, "sent");
 */

import { storeGet, storeSet } from "../core/store.js";

// ── Types ──────────────────────────────────────────────────────────────────
/**
 * @typedef {'draft'|'queued'|'sending'|'completed'|'failed'|'cancelled'} CampaignStatus
 * @typedef {'whatsapp'|'email'|'sms'} CampaignType
 *
 * @typedef {{
 *   id: string,
 *   name: string,
 *   type: CampaignType,
 *   templateName: string,
 *   guestIds: string[],
 *   status: CampaignStatus,
 *   sentCount: number,
 *   failedCount: number,
 *   results: Record<string, 'pending'|'sent'|'failed'>,
 *   createdAt: number,
 *   startedAt: number | null,
 *   completedAt: number | null,
 * }} Campaign
 */

const STORE_KEY = "campaigns";

// ── Internal helpers ───────────────────────────────────────────────────────

/** @returns {Campaign[]} */
function _getAll() {
  return /** @type {Campaign[]} */ (storeGet(STORE_KEY) ?? []);
}

/** @param {Campaign[]} campaigns */
function _save(campaigns) {
  storeSet(STORE_KEY, campaigns);
}

/** @param {string} id @returns {Campaign | undefined} */
function _find(id) {
  return _getAll().find((c) => c.id === id);
}

/**
 * @param {string} id
 * @param {Partial<Campaign>} patch
 * @returns {Campaign | null}
 */
function _update(id, patch) {
  const all = _getAll();
  const idx = all.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const updated = { ...all[idx], ...patch };
  const next = [...all];
  next[idx] = updated;
  _save(next);
  return updated;
}

/** @returns {string} */
function _genId() {
  return `cmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── CRUD ───────────────────────────────────────────────────────────────────

/**
 * Create a new campaign in `draft` status.
 *
 * @param {{ name: string, type: CampaignType, templateName?: string, guestIds: string[] }} opts
 * @returns {string}  new campaign id
 */
export function createCampaign({ name, type, templateName = "", guestIds }) {
  const id = _genId();
  const results = /** @type {Record<string, 'pending'>} */ ({});
  for (const gid of guestIds) results[gid] = "pending";

  /** @type {Campaign} */
  const campaign = {
    id,
    name,
    type,
    templateName,
    guestIds,
    status: "draft",
    sentCount: 0,
    failedCount: 0,
    results,
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null,
  };

  _save([..._getAll(), campaign]);
  return id;
}

/**
 * Retrieve a campaign by id.
 * @param {string} id
 * @returns {Campaign | null}
 */
export function getCampaign(id) {
  return _find(id) ?? null;
}

/**
 * List all campaigns, optionally filtered by status.
 * @param {CampaignStatus} [status]
 * @returns {Campaign[]}
 */
export function listCampaigns(status) {
  const all = _getAll();
  return status ? all.filter((c) => c.status === status) : all;
}

/**
 * Delete a campaign.  Only `draft` or `cancelled` campaigns may be deleted.
 * @param {string} id
 * @returns {boolean}  true if deleted
 */
export function deleteCampaign(id) {
  const c = _find(id);
  if (!c) return false;
  if (c.status !== "draft" && c.status !== "cancelled") return false;
  _save(_getAll().filter((x) => x.id !== id));
  return true;
}

// ── Lifecycle ─────────────────────────────────────────────────────────────

/**
 * Move campaign to `queued` (from `draft` only).
 * @param {string} id
 * @returns {boolean}
 */
export function queueCampaign(id) {
  const c = _find(id);
  if (!c || c.status !== "draft") return false;
  _update(id, { status: "queued" });
  return true;
}

/**
 * Move campaign to `sending` (from `queued` only).
 * @param {string} id
 * @returns {boolean}
 */
export function startCampaign(id) {
  const c = _find(id);
  if (!c || c.status !== "queued") return false;
  _update(id, { status: "sending", startedAt: Date.now() });
  return true;
}

/**
 * Cancel a campaign (from `draft` or `queued` only).
 * @param {string} id
 * @returns {boolean}
 */
export function cancelCampaign(id) {
  const c = _find(id);
  if (!c || (c.status !== "draft" && c.status !== "queued")) return false;
  _update(id, { status: "cancelled", completedAt: Date.now() });
  return true;
}

/**
 * Record the send result for a single guest.
 * Automatically transitions campaign to `completed` when all guests have a
 * non-`pending` result.
 *
 * @param {string} campaignId
 * @param {string} guestId
 * @param {'sent'|'failed'} result
 * @returns {boolean}  false when campaign or guest not found
 */
export function recordSent(campaignId, guestId, result) {
  const c = _find(campaignId);
  if (!c || c.status !== "sending") return false;
  if (!(guestId in c.results)) return false;

  const newResults = { ...c.results, [guestId]: result };
  const newSent = result === "sent" ? c.sentCount + 1 : c.sentCount;
  const newFailed = result === "failed" ? c.failedCount + 1 : c.failedCount;

  const allDone = Object.values(newResults).every((r) => r !== "pending");
  const newStatus = allDone ? "completed" : "sending";

  _update(campaignId, {
    results: newResults,
    sentCount: newSent,
    failedCount: newFailed,
    status: newStatus,
    completedAt: allDone ? Date.now() : null,
  });

  return true;
}

/**
 * Get summary stats for a campaign.
 * @param {string} id
 * @returns {{ total: number, sent: number, failed: number, pending: number } | null}
 */
export function getCampaignStats(id) {
  const c = _find(id);
  if (!c) return null;
  const vals = Object.values(c.results);
  return {
    total: vals.length,
    sent: vals.filter((r) => r === "sent").length,
    failed: vals.filter((r) => r === "failed").length,
    pending: vals.filter((r) => r === "pending").length,
  };
}
