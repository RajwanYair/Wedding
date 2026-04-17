/**
 * src/services/sms-service.js — Sprint 123
 *
 * SMS send service via a Supabase Edge Function.
 * Provides a dev-mode stub so unit tests can run without network.
 */

import { callEdgeFunction } from "./backend.js";

/**
 * @typedef {{ to: string, body: string }} SmsMessage
 * @typedef {{ sent: number, failed: number, errors: string[] }} SmsBatchResult
 */

/** Dev-mode stub: if set, this function is called instead of the Edge Function. */
let _stub = null;

/**
 * Override the SMS sender for testing/dev.
 * @param {((msgs: SmsMessage[]) => Promise<SmsBatchResult>) | null} fn
 */
export function setSmsStub(fn) {
  _stub = fn;
}

/**
 * Send a single SMS message.
 * @param {string} to   E.164 phone number
 * @param {string} body Message body (max 160 chars recommended)
 * @returns {Promise<SmsBatchResult>}
 */
export async function sendSms(to, body) {
  return sendSmsBatch([{ to, body }]);
}

/**
 * Send a batch of SMS messages via the `sms-dispatcher` Edge Function.
 * @param {SmsMessage[]} messages
 * @returns {Promise<SmsBatchResult>}
 */
export async function sendSmsBatch(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { sent: 0, failed: 0, errors: [] };
  }

  for (const msg of messages) {
    if (!msg.to || !msg.body) throw new Error("Each message must have to and body");
  }

  if (_stub) return _stub(messages);

  return /** @type {SmsBatchResult} */ (
    await callEdgeFunction("sms-dispatcher", { messages })
  );
}

/**
 * Validate a phone number is minimally E.164-like.
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidPhone(phone) {
  return /^\+\d{7,15}$/.test(phone);
}
