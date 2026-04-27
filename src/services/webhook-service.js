/**
 * src/services/webhook-service.js — Generic webhook management (Sprint 111)
 *
 * Register outbound webhooks, verify inbound HMAC signatures, and dispatch
 * event payloads to registered endpoints.
 *
 * All registered webhooks are persisted to the `webhooks` store key.
 * The HMAC verification helper uses Web Crypto (SubtleCrypto) so it works
 * in both browser and Node/Deno environments.
 *
 * Usage:
 *   import { registerWebhook, dispatchWebhookEvent, verifyWebhookSignature } from "./webhook-service.js";
 *
 *   const id = registerWebhook({ url: "https://example.com/hook", events: ["guest.rsvp"] });
 *   await dispatchWebhookEvent("guest.rsvp", { guestId: "g1" });
 */

import { storeGet, storeSet } from "../core/store.js";

// ── Types ──────────────────────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────────

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

// ── Registration ──────────────────────────────────────────────────────────

/**
 * Register a new webhook.
 * @param {{ url: string, events: string[], secret?: string }} opts
 * @returns {string}  registered webhook id
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

// ── Dispatch ──────────────────────────────────────────────────────────────

/**
 * Dispatch an event to all active webhooks subscribed to that event.
 * Returns a summary of deliveries.
 *
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
      const headers = /** @type {Record<string,string>} */ ({
        "Content-Type": "application/json",
      });

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

// ── Signature verification ────────────────────────────────────────────────

/**
 * Verify an HMAC-SHA256 "sha256=..." signature against a raw body string.
 * Returns true when signature is valid.
 *
 * @param {string} secret
 * @param {string} body
 * @param {string} signature   e.g. "sha256=abcdef..."
 * @returns {Promise<boolean>}
 */
export async function verifyWebhookSignature(secret, body, signature) {
  if (!signature.startsWith("sha256=")) return false;
  const expected = signature.slice(7);
  const actual = await _hmacHex(secret, body);
  // Constant-time comparison not available in pure JS across all envs:
  // compare as lowercase hex strings (good enough for server-side verification)
  return actual === expected;
}

// ── HMAC helper ────────────────────────────────────────────────────────────

/**
 * @param {string} secret
 * @param {string} message
 * @returns {Promise<string>}  hex-encoded HMAC-SHA256
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
