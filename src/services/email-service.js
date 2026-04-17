/**
 * src/services/email-service.js — Email service (Sprint 44)
 *
 * Provides a thin, testable email dispatch layer that wraps the
 * `send-email` Edge Function via `callEdgeFunction` from backend.js.
 *
 * All email addresses are validated before dispatch.  HTML content is
 * sanitized via `sanitizeInput`.  The service integrates with the campaign
 * state tracker (campaign.js) to record send outcomes.
 *
 * Usage:
 *   import { sendEmail, sendEmailCampaign } from "../services/email-service.js";
 *
 *   await sendEmail({ to: "alice@example.com", subject: "RSVP", html: "<p>Hi</p>" });
 *   await sendEmailCampaign("campaign-id");
 */

import { callEdgeFunction } from "./backend.js";
import { storeGet } from "../core/store.js";
import { getCampaign, startCampaign, recordSent, queueCampaign } from "./campaign.js";
import { getTemplate, renderTemplate } from "../utils/message-templates.js";
import { sanitize } from "../utils/sanitize.js";

// ── Validation ─────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}$/;

/**
 * @param {unknown} raw
 * @returns {boolean}
 */
export function isValidEmail(raw) {
  if (typeof raw !== "string") return false;
  return EMAIL_RE.test(raw.trim());
}

// ── Core send ──────────────────────────────────────────────────────────────

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
 *
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

  // Validate and sanitize optional replyTo
  const replyTo = msg.replyTo
    ? sanitize(msg.replyTo, { type: "email", required: false }).value ?? undefined
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
 *
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

// ── Campaign integration ──────────────────────────────────────────────────

/**
 * @typedef {{
 *   sent: string[],
 *   failed: string[],
 *   skipped: string[],
 *   errors: Record<string, string>,
 * }} EmailCampaignResult
 */

/**
 * Run an email campaign: resolve guest emails from the store, render the
 * campaign template, and dispatch via `sendEmail`.
 *
 * @param {string} campaignId
 * @param {{ dryRun?: boolean, subjectTemplate?: string }} [opts]
 * @returns {Promise<EmailCampaignResult>}
 */
export async function sendEmailCampaign(campaignId, opts = {}) {
  const campaign = getCampaign(campaignId);
  if (!campaign) throw new Error(`email-service: campaign "${campaignId}" not found`);
  if (campaign.type !== "email") throw new Error("email-service: campaign type must be email");

  // Auto-transition to sending
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
