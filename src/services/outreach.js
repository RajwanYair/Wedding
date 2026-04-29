/**
 * src/services/outreach.js — S268 merged: campaign + delivery.
 *
 * Merged from:
 *   - campaign.js  (S191) — campaign state tracker + WhatsApp runner
 *   - delivery.js  (S228) — delivery tracking + webhook + email service
 *
 * Store keys: campaigns, deliveries, webhooks, webhookDeliveries
 */

import { storeGet, storeSet, storeUpsert } from "../core/store.js";
import { sendWhatsAppCloudMessage, callEdgeFunction } from "./backend.js";
import { getTemplate, renderTemplate } from "../utils/message-templates.js";
import { cleanPhone } from "../utils/phone.js";
import { sanitize } from "../utils/sanitize.js";

// ══════════════════════════════════════════════════════════════════════════
// §1 — Campaign service (merged from campaign.js, S191)
// ══════════════════════════════════════════════════════════════════════════

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
  next[idx] = /** @type {Campaign} */ (updated);
  _save(next);
  return /** @type {Campaign} */ (updated);
}

/** @returns {string} */
function _genId() {
  return `cmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

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
 * Delete a campaign. Only `draft` or `cancelled` campaigns may be deleted.
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

// ══════════════════════════════════════════════════════════════════════════
// §2 — Delivery tracking (merged from delivery.js §1, S228)
// ══════════════════════════════════════════════════════════════════════════

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

/** @returns {DeliveryRecord[]} */
function getAllRecords() {
  return /** @type {DeliveryRecord[]} */ (storeGet("deliveries") ?? []);
}

/**
 * Record a delivery event for a guest.
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
 * @param {{ channel?: DeliveryChannel }} [filter]
 * @returns {DeliveryRecord[]}
 */
export function getUndelivered(filter = {}) {
  let records = getAllRecords().filter((r) => r.status === "failed" || r.status === "bounced");
  if (filter.channel) records = records.filter((r) => r.channel === filter.channel);
  return records.sort((a, b) => b.ts - a.ts);
}

/**
 * Get the most recent delivery record for a guest on a given channel.
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
 * @param {{ campaignId?: string, channel?: DeliveryChannel }} [filter]
 * @returns {{ total: number, sent: number, delivered: number, read: number, failed: number, bounced: number }}
 */
export function getDeliveryStats(filter = {}) {
  let records = getAllRecords();
  if (filter.campaignId) records = records.filter((r) => r.campaignId === filter.campaignId);
  if (filter.channel) records = records.filter((r) => r.channel === filter.channel);
  const stats = { total: records.length, sent: 0, delivered: 0, read: 0, failed: 0, bounced: 0 };
  for (const r of records) {
    if (r.status in stats) stats[r.status]++;
  }
  return stats;
}

/**
 * Clear all delivery records for a specific guest (e.g. on guest deletion).
 * @param {string} guestId
 */
export function clearGuestDeliveries(guestId) {
  const remaining = getAllRecords().filter((r) => r.guestId !== guestId);
  storeSet("deliveries", remaining);
}

// ══════════════════════════════════════════════════════════════════════════
// §3 — Webhook service (merged from delivery.js §2)
// ══════════════════════════════════════════════════════════════════════════

/**
 * @typedef {{
 *   id:         string,
 *   url:        string,
 *   events:     string[],
 *   secret?:    string | null,
 *   active:     boolean,
 *   createdAt:  number,
 *   updatedAt:  number,
 * }} Webhook
 *
 * @typedef {{
 *   id:         string,
 *   webhookId:  string,
 *   event:      string,
 *   payload:    unknown,
 *   status:     "pending" | "delivered" | "failed",
 *   statusCode?: number,
 *   error?:     string,
 *   ts:         number,
 * }} WebhookDelivery
 */

/** @returns {Webhook[]} */
function _getWebhooks() {
  return /** @type {Webhook[]} */ (storeGet("webhooks") ?? []);
}

/** @param {Webhook[]} hooks */
function _saveWebhooks(hooks) {
  storeSet("webhooks", hooks);
}

/** @returns {WebhookDelivery[]} */
function _getDeliveries() {
  return /** @type {WebhookDelivery[]} */ (storeGet("webhookDeliveries") ?? []);
}

/** @param {WebhookDelivery[]} deliveries */
function _saveDeliveries(deliveries) {
  storeSet("webhookDeliveries", deliveries);
}

function _id() {
  return `wh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Register a new webhook.
 * @param {{ url: string, events: string[], secret?: string }} opts
 * @returns {string}
 */
export function registerWebhook({ url, events, secret }) {
  if (!url || !Array.isArray(events) || events.length === 0) {
    throw new Error("webhook-service: url and at least one event are required");
  }
  const hook = /** @type {Webhook} */ ({
    id: _id(),
    url,
    events: [...new Set(events)],
    secret: secret ?? null,
    active: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  _saveWebhooks([..._getWebhooks(), hook]);
  return hook.id;
}

/**
 * Get a webhook by id.
 * @param {string} id
 * @returns {Webhook | null}
 */
export function getWebhook(id) {
  return _getWebhooks().find((h) => h.id === id) ?? null;
}

/**
 * List all registered webhooks, optionally filtered by event.
 * @param {string} [event]
 * @returns {Webhook[]}
 */
export function listWebhooks(event) {
  const hooks = _getWebhooks();
  if (!event) return hooks;
  return hooks.filter((h) => h.events.includes(event));
}

/**
 * Update a webhook's url, events, or active state.
 * @param {string} id
 * @param {{ url?: string, events?: string[], active?: boolean, secret?: string }} patch
 * @returns {boolean}
 */
export function updateWebhook(id, patch) {
  const hooks = _getWebhooks();
  const idx = hooks.findIndex((h) => h.id === id);
  if (idx === -1) return false;
  const current = hooks[idx];
  if (!current) return false;
  hooks[idx] = /** @type {import('../types').Webhook} */ ({ ...current, ...patch, updatedAt: Date.now() });
  _saveWebhooks(hooks);
  return true;
}

/**
 * Remove a webhook.
 * @param {string} id
 * @returns {boolean}
 */
export function removeWebhook(id) {
  const hooks = _getWebhooks();
  const filtered = hooks.filter((h) => h.id !== id);
  if (filtered.length === hooks.length) return false;
  _saveWebhooks(filtered);
  return true;
}

/**
 * Dispatch an event to all active webhooks subscribed to that event.
 * @param {string}  event
 * @param {unknown} payload
 * @param {{ fetcher?: typeof fetch }} [opts]
 * @returns {Promise<{ delivered: number, failed: number }>}
 */
export async function dispatchWebhookEvent(event, payload, opts = {}) {
  const fetcher = opts.fetcher ?? globalThis.fetch;
  const hooks = listWebhooks(event).filter((h) => h.active);
  let delivered = 0;
  let failed = 0;
  const deliveries = _getDeliveries();

  for (const hook of hooks) {
    const deliveryId = `whd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    /** @type {WebhookDelivery} */
    const delivery = {
      id: deliveryId,
      webhookId: hook.id,
      event,
      payload,
      status: "pending",
      ts: Date.now(),
    };

    try {
      const body = JSON.stringify({ event, payload, ts: delivery.ts });
      const headers = /** @type {Record<string,string>} */ ({ "Content-Type": "application/json" });
      if (hook.secret) {
        const sig = await _hmacHex(hook.secret, body);
        headers["x-webhook-signature"] = `sha256=${sig}`;
      }
      const res = await fetcher(hook.url, { method: "POST", headers, body });
      delivery.status = res.ok ? "delivered" : "failed";
      delivery.statusCode = res.status;
      if (res.ok) delivered++;
      else {
        failed++;
        delivery.error = `HTTP ${res.status}`;
      }
    } catch (err) {
      delivery.status = "failed";
      delivery.error = err instanceof Error ? err.message : String(err);
      failed++;
    }

    deliveries.push(delivery);
  }

  _saveDeliveries(deliveries);
  return { delivered, failed };
}

/**
 * Get delivery history for a webhook.
 * @param {string} webhookId
 * @returns {WebhookDelivery[]}
 */
export function getWebhookDeliveries(webhookId) {
  return _getDeliveries().filter((d) => d.webhookId === webhookId);
}

/**
 * Verify an HMAC-SHA256 "sha256=..." signature against a raw body string.
 * @param {string} secret
 * @param {string} body
 * @param {string} signature
 * @returns {Promise<boolean>}
 */
export async function verifyWebhookSignature(secret, body, signature) {
  if (!signature.startsWith("sha256=")) return false;
  const expected = signature.slice(7);
  const actual = await _hmacHex(secret, body);
  return actual === expected;
}

/**
 * @param {string} secret
 * @param {string} message
 * @returns {Promise<string>}
 */
async function _hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ══════════════════════════════════════════════════════════════════════════
// §4 — Email service (merged from delivery.js §3)
// ══════════════════════════════════════════════════════════════════════════

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}$/;

/**
 * @param {unknown} raw
 * @returns {boolean}
 */
export function isValidEmail(raw) {
  if (typeof raw !== "string") return false;
  return EMAIL_RE.test(raw.trim());
}

/**
 * @typedef {{
 *   to: string,
 *   subject: string,
 *   html?: string,
 *   text?: string,
 *   replyTo?: string,
 * }} EmailMessage
 *
 * @typedef {{ ok: boolean, messageId?: string, error?: string }} SendResult
 */

/**
 * Send a single email via the `send-email` Edge Function.
 * @param {EmailMessage} msg
 * @returns {Promise<SendResult>}
 */
export async function sendEmail(msg) {
  if (!isValidEmail(msg.to)) {
    return { ok: false, error: `Invalid recipient address: ${msg.to}` };
  }
  if (!msg.subject?.trim()) {
    return { ok: false, error: "Subject is required" };
  }
  if (!msg.html && !msg.text) {
    return { ok: false, error: "Either html or text body is required" };
  }
  const replyTo = msg.replyTo
    ? (sanitize(/** @type {any} */ (msg.replyTo), /** @type {any} */ ({ type: "email", required: false })).value ?? undefined)
    : undefined;
  return callEdgeFunction("send-email", {
    to: msg.to.trim(),
    subject: msg.subject.trim(),
    html: msg.html,
    text: msg.text,
    replyTo,
  });
}

/**
 * Send a batch of emails, returning an array of results in order.
 * @param {EmailMessage[]} messages
 * @returns {Promise<SendResult[]>}
 */
export async function sendEmailBatch(messages) {
  const results = [];
  for (const msg of messages) {
    results.push(await sendEmail(msg));
  }
  return results;
}

/**
 * @typedef {{
 *   sent: string[],
 *   failed: string[],
 *   skipped: string[],
 *   errors: Record<string, string>,
 * }} EmailCampaignResult
 */

/**
 * Run an email campaign.
 * @param {string} campaignId
 * @param {{ dryRun?: boolean, subjectTemplate?: string }} [opts]
 * @returns {Promise<EmailCampaignResult>}
 */
export async function sendEmailCampaign(campaignId, opts = {}) {
  const campaign = getCampaign(campaignId);
  if (!campaign) throw new Error(`email-service: campaign "${campaignId}" not found`);
  if (campaign.type !== "email") throw new Error("email-service: campaign type must be email");

  if (campaign.status === "draft") queueCampaign(campaignId);
  const refreshed = getCampaign(campaignId);
  if (refreshed?.status === "queued") startCampaign(campaignId);
  else if (refreshed?.status !== "sending") {
    throw new Error(`email-service: campaign status "${refreshed?.status}" cannot start`);
  }

  const guests = /** @type {import('../types').Guest[]} */ (storeGet("guests") ?? []);
  const guestMap = new Map(guests.map((g) => [g.id, g]));
  const tmpl = getTemplate(campaign.templateName) ?? "{{firstName}}";
  const subjectTmpl = opts.subjectTemplate ?? "הזמנה לחתונה — {{firstName}}";

  /** @type {EmailCampaignResult} */
  const result = { sent: [], failed: [], skipped: [], errors: {} };

  for (const guestId of campaign.guestIds) {
    const latest = getCampaign(campaignId);
    if (!latest || latest.results[guestId] !== "pending") {
      result.skipped.push(guestId);
      continue;
    }
    const guest = guestMap.get(guestId);
    if (!guest?.email || !isValidEmail(guest.email)) {
      result.skipped.push(guestId);
      recordSent(campaignId, guestId, "failed");
      result.errors[guestId] = "no valid email";
      continue;
    }
    const html = renderTemplate(tmpl, { ...guest });
    const subject = renderTemplate(subjectTmpl, { ...guest });
    if (opts.dryRun) {
      recordSent(campaignId, guestId, "sent");
      result.sent.push(guestId);
      continue;
    }
    try {
      const res = await sendEmail({ to: guest.email, subject, html });
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
