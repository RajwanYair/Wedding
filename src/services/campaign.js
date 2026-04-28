/**
 * src/services/campaign.js — Unified campaign service (S191)
 *
 * Merged from:
 *   - campaign.js    (S42) — campaign state tracker
 *   - wa-campaign.js (S43) — WhatsApp campaign runner
 */

import { storeGet, storeSet } from "../core/store.js";
import { sendWhatsAppCloudMessage } from "./backend.js";
import { getTemplate, renderTemplate } from "../utils/message-templates.js";
import { cleanPhone } from "../utils/phone.js";

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

// ── WhatsApp campaign runner (merged from wa-campaign.js, S43) ────────────

/**
 * @typedef {{
 *   sent: string[],
 *   failed: string[],
 *   skipped: string[],
 *   errors: Record<string, string>,
 * }} WACampaignResult
 */

/**
 * Execute all pending sends for a WhatsApp campaign.
 * @param {string} campaignId
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {Promise<WACampaignResult>}
 */
export async function runWACampaign(campaignId, opts = {}) {
  const campaign = getCampaign(campaignId);
  if (!campaign) throw new Error(`wa-campaign: campaign "${campaignId}" not found`);
  if (campaign.type !== "whatsapp") throw new Error("wa-campaign: campaign type must be whatsapp");

  if (campaign.status === "draft") queueCampaign(campaignId);
  if (campaign.status !== "sending") {
    const refreshed = getCampaign(campaignId);
    if (refreshed?.status === "queued") startCampaign(campaignId);
    else if (refreshed?.status !== "sending") {
      throw new Error(`wa-campaign: campaign is in status "${refreshed?.status}", cannot start`);
    }
  }

  const guests = /** @type {import('../types').Guest[]} */ (storeGet("guests") ?? []);
  const guestMap = new Map(guests.map((g) => [g.id, g]));
  const tmpl = getTemplate(campaign.templateName) ?? "{{firstName}}";

  /** @type {WACampaignResult} */
  const result = { sent: [], failed: [], skipped: [], errors: {} };

  for (const guestId of campaign.guestIds) {
    const latest = getCampaign(campaignId);
    if (!latest || latest.results[guestId] !== "pending") {
      result.skipped.push(guestId);
      continue;
    }

    const guest = guestMap.get(guestId);
    if (!guest?.phone) {
      result.skipped.push(guestId);
      recordSent(campaignId, guestId, "failed");
      result.errors[guestId] = "no phone number";
      continue;
    }

    const phone = cleanPhone(guest.phone);
    const text = renderTemplate(tmpl, { ...guest });

    if (opts.dryRun) {
      recordSent(campaignId, guestId, "sent");
      result.sent.push(guestId);
      continue;
    }

    try {
      const res = await sendWhatsAppCloudMessage(phone, { text });
      if (res.ok) {
        recordSent(campaignId, guestId, "sent");
        result.sent.push(guestId);
      } else {
        recordSent(campaignId, guestId, "failed");
        result.failed.push(guestId);
        result.errors[guestId] = res.error ?? "unknown error";
      }
    } catch (err) {
      recordSent(campaignId, guestId, "failed");
      result.failed.push(guestId);
      result.errors[guestId] = err instanceof Error ? err.message : String(err);
    }
  }

  return result;
}

/**
 * Run an ad-hoc WhatsApp send to a list of guests without a full campaign.
 * @param {string[]} guestIds
 * @param {string} messageText
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {Promise<WACampaignResult>}
 */
export async function sendAdHocWhatsApp(guestIds, messageText, opts = {}) {
  const guests = /** @type {import('../types').Guest[]} */ (storeGet("guests") ?? []);
  const guestMap = new Map(guests.map((g) => [g.id, g]));

  /** @type {WACampaignResult} */
  const result = { sent: [], failed: [], skipped: [], errors: {} };

  for (const guestId of guestIds) {
    const guest = guestMap.get(guestId);
    if (!guest?.phone) {
      result.skipped.push(guestId);
      result.errors[guestId] = "no phone number";
      continue;
    }

    const phone = cleanPhone(guest.phone);

    if (opts.dryRun) {
      result.sent.push(guestId);
      continue;
    }

    try {
      const res = await sendWhatsAppCloudMessage(phone, { text: messageText });
      if (res.ok) {
        result.sent.push(guestId);
      } else {
        result.failed.push(guestId);
        result.errors[guestId] = res.error ?? "unknown error";
      }
    } catch (err) {
      result.failed.push(guestId);
      result.errors[guestId] = err instanceof Error ? err.message : String(err);
    }
  }

  return result;
}
