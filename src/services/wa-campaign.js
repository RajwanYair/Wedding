/**
 * src/services/wa-campaign.js — WhatsApp campaign service (Sprint 43)
 *
 * Orchestrates a WhatsApp outbound campaign: selects guests, renders
 * message text via message-templates, dispatches via sendWhatsAppCloudMessage,
 * and updates campaign state through the campaign state tracker.
 *
 * All network I/O is delegated to `sendWhatsAppCloudMessage` (backend.js)
 * so this module stays fully unit-testable by mocking backend.js.
 *
 * Usage:
 *   import { runWACampaign } from "../services/wa-campaign.js";
 *
 *   await runWACampaign("campaign-id-123");
 */

import { storeGet } from "../core/store.js";
import { sendWhatsAppCloudMessage } from "./backend.js";
import { getCampaign, startCampaign, recordSent, queueCampaign } from "./campaign.js";
import { getTemplate, renderTemplate } from "../utils/message-templates.js";
import { cleanPhone } from "../utils/phone.js";

// ── Types ──────────────────────────────────────────────────────────────────
/**
 * @typedef {{
 *   sent: string[],
 *   failed: string[],
 *   skipped: string[],
 *   errors: Record<string, string>,
 * }} WACampaignResult
 */

// ── Core runner ────────────────────────────────────────────────────────────

/**
 * Execute all pending sends for a WhatsApp campaign.
 *
 * - Transitions the campaign through `queued → sending` automatically when
 *   it is still in `draft` or `queued`.
 * - Sends messages in serial to avoid rate-limiting.
 * - Guest phone numbers are resolved from the `guests` store.
 * - Message text is rendered via the campaign's `templateName`.
 *
 * @param {string} campaignId
 * @param {{ dryRun?: boolean }} [opts]  Pass `dryRun: true` to skip actual sends
 * @returns {Promise<WACampaignResult>}
 */
export async function runWACampaign(campaignId, opts = {}) {
  const campaign = getCampaign(campaignId);
  if (!campaign) throw new Error(`wa-campaign: campaign "${campaignId}" not found`);
  if (campaign.type !== "whatsapp") throw new Error("wa-campaign: campaign type must be whatsapp");

  // Auto-transition to sending
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
 * A simpler helper: run an ad-hoc WhatsApp send to a list of guests without
 * creating a full campaign.  Useful for one-off nudges.
 *
 * @param {string[]} guestIds
 * @param {string} messageText  Pre-rendered message text
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
