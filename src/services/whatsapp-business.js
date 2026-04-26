/**
 * src/services/whatsapp-business.js — WhatsApp Business Cloud API stub (Sprint 38)
 *
 * Provides helpers for integrating with the WhatsApp Business Cloud API
 * (Meta Graph API v19+). When the API is not configured the service
 * degrades gracefully — messages are logged and a mock response returned.
 *
 * This module contains ONLY pure payload-building and config-checking logic.
 * Actual HTTP requests are intentionally left to the caller so the module
 * stays testable without network access.
 *
 * API reference: https://developers.facebook.com/docs/whatsapp/cloud-api/
 *
 * Roadmap ref: Phase 4.1 — WhatsApp Business API integration
 *
 * @typedef {{
 *   phoneNumberId: string,
 *   accessToken:   string,
 *   apiVersion?:   string,
 * }} WaBusinessConfig
 *
 * @typedef {{
 *   name:        string,
 *   language?:   string,
 *   components?: WaTemplateComponent[],
 * }} WaTemplateRef
 *
 * @typedef {{
 *   type:       "header" | "body" | "button",
 *   parameters: WaTemplateParam[],
 * }} WaTemplateComponent
 *
 * @typedef {{
 *   type:  "text" | "currency" | "date_time" | "image" | "document" | "video",
 *   text?: string,
 * }} WaTemplateParam
 */

const DEFAULT_API_VERSION = "v19.0";
const GRAPH_BASE = "https://graph.facebook.com";

// ── Config helpers ─────────────────────────────────────────────────────────

/**
 * Return true when all required WhatsApp Business config keys are present
 * and non-empty.
 *
 * @param {Partial<WaBusinessConfig>} config
 * @returns {boolean}
 */
export function isBusinessAPIConfigured(config) {
  return (
    typeof config?.phoneNumberId === "string" &&
    config.phoneNumberId.length > 0 &&
    typeof config?.accessToken === "string" &&
    config.accessToken.length > 0
  );
}

/**
 * Build the Graph API messages endpoint URL for a given config.
 *
 * @param {WaBusinessConfig} config
 * @returns {string}
 */
export function buildApiEndpoint(config) {
  const version = config.apiVersion ?? DEFAULT_API_VERSION;
  return `${GRAPH_BASE}/${version}/${config.phoneNumberId}/messages`;
}

// ── Payload builder ────────────────────────────────────────────────────────

/**
 * Build a WhatsApp Cloud API template message payload.
 *
 * @param {string}           to           Recipient phone number in E.164 format
 * @param {WaTemplateRef}    templateRef  Template name + language + components
 * @returns {object}  JSON-serialisable payload for POST /messages
 */
export function buildTemplatePayload(to, templateRef) {
  return {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateRef.name,
      language: {
        code: templateRef.language ?? "he",
      },
      ...(templateRef.components?.length ? { components: templateRef.components } : {}),
    },
  };
}

/**
 * Build a plain-text message payload.
 *
 * @param {string} to
 * @param {string} text
 * @param {{ previewUrl?: boolean }} [opts]
 * @returns {object}
 */
export function buildTextPayload(to, text, opts = {}) {
  return {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: {
      preview_url: opts.previewUrl ?? false,
      body: text,
    },
  };
}

// ── Mock send (no network) ─────────────────────────────────────────────────

/**
 * Simulate sending a template message without making a real HTTP request.
 * Useful for preview / dry-run mode and in test environments.
 *
 * Returns a mock API response object that mirrors the real Cloud API shape.
 *
 * @param {string}           to
 * @param {WaTemplateRef}    templateRef
 * @param {WaBusinessConfig} config
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {{ success: boolean, payload: object, endpoint: string, dryRun: boolean }}
 */
export function sendTemplateMessage(to, templateRef, config, opts = {}) {
  const dryRun = opts.dryRun !== false; // default: dry-run for safety
  const payload = buildTemplatePayload(to, templateRef);
  const endpoint = isBusinessAPIConfigured(config) ? buildApiEndpoint(config) : "(not configured)";

  return {
    success: true,
    payload,
    endpoint,
    dryRun,
  };
}
