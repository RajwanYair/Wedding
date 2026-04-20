/**
 * src/utils/whatsapp-business.js
 * WhatsApp Business API (Cloud API) helper — pure data, no network calls.
 * Builds message payloads, parses webhooks, validates phone numbers.
 *
 * @module whatsapp-business
 */

// ── Constants ──────────────────────────────────────────────────────────────

/** Current supported WA Cloud API version */
export const WA_API_VERSION = "v20.0";

/** Base URL template — replace {phoneNumberId} at call time */
export const WABA_BASE_URL = `https://graph.facebook.com/${WA_API_VERSION}/{phoneNumberId}/messages`;

/** Delivery status strings from webhook `statuses[].status` */
export const DELIVERY_STATUSES = Object.freeze({
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read",
  FAILED: "failed",
  DELETED: "deleted",
});

/** Supported Cloud API message types */
export const MESSAGE_TYPES = Object.freeze({
  TEXT: "text",
  TEMPLATE: "template",
  INTERACTIVE: "interactive",
  IMAGE: "image",
  DOCUMENT: "document",
  AUDIO: "audio",
  VIDEO: "video",
  STICKER: "sticker",
  LOCATION: "location",
  CONTACTS: "contacts",
  REACTION: "reaction",
});

/** Interactive message sub-types */
export const INTERACTIVE_TYPES = Object.freeze({
  BUTTON: "button",
  LIST: "list",
  PRODUCT: "product",
  PRODUCT_LIST: "product_list",
});

// ── Phone helpers ──────────────────────────────────────────────────────────

/**
 * Returns true if `phone` is a valid E.164 string (no spaces/dashes).
 * Accepts leading `+` or pure digits; minimum 10, maximum 15 digits.
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidPhoneForWaba(phone) {
  if (typeof phone !== "string") return false;
  const cleaned = phone.startsWith("+") ? phone.slice(1) : phone;
  return /^\d{10,15}$/.test(cleaned);
}

/**
 * Normalises phone to digit-only string (no leading +).
 * Returns null for invalid input.
 * @param {string} phone
 * @returns {string|null}
 */
export function formatPhoneForWaba(phone) {
  if (typeof phone !== "string") return null;
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 10 || cleaned.length > 15) return null;
  return cleaned;
}

// ── Message builders ───────────────────────────────────────────────────────

/**
 * Builds a simple text message payload.
 * @param {{ to: string, body: string, previewUrl?: boolean }} opts
 * @returns {object}
 */
export function buildTextMessage({ to, body, previewUrl = false }) {
  if (!to || !body) throw new Error("to and body are required");
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: MESSAGE_TYPES.TEXT,
    text: { preview_url: previewUrl, body },
  };
}

/**
 * Builds a template message payload.
 * @param {{ to: string, templateName: string, languageCode: string, components?: object[] }} opts
 * @returns {object}
 */
export function buildTemplateMessage({ to, templateName, languageCode = "en_US", components = [] }) {
  if (!to || !templateName) throw new Error("to and templateName are required");
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: MESSAGE_TYPES.TEMPLATE,
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  };
}

/**
 * Builds an interactive reply-button message.
 * @param {{ to: string, bodyText: string, buttons: Array<{ id: string, title: string }>, headerText?: string, footerText?: string }} opts
 * @returns {object}
 */
export function buildInteractiveMessage({ to, bodyText, buttons, headerText, footerText }) {
  if (!to || !bodyText || !Array.isArray(buttons) || buttons.length === 0) {
    throw new Error("to, bodyText and buttons are required");
  }
  if (buttons.length > 3) throw new Error("WA interactive buttons: max 3 allowed");

  const interactive = {
    type: INTERACTIVE_TYPES.BUTTON,
    body: { text: bodyText },
    action: {
      buttons: buttons.map((b) => ({
        type: "reply",
        reply: { id: b.id, title: b.title },
      })),
    },
  };

  if (headerText) interactive.header = { type: "text", text: headerText };
  if (footerText) interactive.footer = { text: footerText };

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: MESSAGE_TYPES.INTERACTIVE,
    interactive,
  };
}

/**
 * Builds a media message (image/document/audio/video).
 * @param {{ to: string, mediaType: string, link: string, caption?: string, filename?: string }} opts
 * @returns {object}
 */
export function buildMediaMessage({ to, mediaType, link, caption, filename }) {
  const allowed = [
    MESSAGE_TYPES.IMAGE,
    MESSAGE_TYPES.DOCUMENT,
    MESSAGE_TYPES.AUDIO,
    MESSAGE_TYPES.VIDEO,
  ];
  if (!allowed.includes(mediaType)) throw new Error(`Unsupported media type: ${mediaType}`);
  if (!to || !link) throw new Error("to and link are required");

  const media = { link };
  if (caption && mediaType !== MESSAGE_TYPES.AUDIO) media.caption = caption;
  if (filename && mediaType === MESSAGE_TYPES.DOCUMENT) media.filename = filename;

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: mediaType,
    [mediaType]: media,
  };
}

// ── Webhook parsers ────────────────────────────────────────────────────────

/**
 * Parses a WA Cloud API webhook body and returns normalized message entries.
 * @param {object|null} payload - Raw webhook JSON
 * @returns {Array<{ from: string, messageId: string, type: string, text?: string, timestamp: string }>}
 */
export function parseWebhookPayload(payload) {
  if (!payload || payload.object !== "whatsapp_business_account") return [];

  const results = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const messages = change.value?.messages ?? [];
      for (const msg of messages) {
        const normalized = {
          from: msg.from,
          messageId: msg.id,
          type: msg.type,
          timestamp: msg.timestamp,
        };
        if (msg.type === MESSAGE_TYPES.TEXT) {
          normalized.text = msg.text?.body ?? "";
        }
        results.push(normalized);
      }
    }
  }

  return results;
}

/**
 * Extracts delivery status updates from a webhook body.
 * @param {object|null} payload
 * @returns {Array<{ recipientId: string, messageId: string, status: string, timestamp: string }>}
 */
export function parseDeliveryStatus(payload) {
  if (!payload || payload.object !== "whatsapp_business_account") return [];

  const results = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const statuses = change.value?.statuses ?? [];
      for (const s of statuses) {
        results.push({
          recipientId: s.recipient_id,
          messageId: s.id,
          status: s.status,
          timestamp: s.timestamp,
        });
      }
    }
  }

  return results;
}

/**
 * Builds a synthetic delivery status webhook payload (for testing).
 * @param {{ phoneNumberId: string, messageId: string, recipientId: string, status: string, timestamp?: string }} opts
 * @returns {object}
 */
export function buildStatusWebhook({ phoneNumberId, messageId, recipientId, status, timestamp }) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "ENTRY_ID",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "1234567890", phone_number_id: phoneNumberId },
              statuses: [
                {
                  id: messageId,
                  status,
                  timestamp: timestamp ?? String(Math.floor(Date.now() / 1000)),
                  recipient_id: recipientId,
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  };
}

/**
 * Builds the full Cloud API endpoint URL for a given phone number ID.
 * @param {string} phoneNumberId
 * @returns {string}
 */
export function buildMessagesEndpoint(phoneNumberId) {
  if (!phoneNumberId) throw new Error("phoneNumberId is required");
  return `https://graph.facebook.com/${WA_API_VERSION}/${phoneNumberId}/messages`;
}

/**
 * Returns true if a payload represents a valid WA webhook challenge verification.
 * @param {{ "hub.mode"?: string, "hub.challenge"?: string, "hub.verify_token"?: string }} query
 * @param {string} verifyToken
 * @returns {boolean}
 */
export function isWebhookVerification(query, verifyToken) {
  return (
    query?.["hub.mode"] === "subscribe" &&
    query?.["hub.verify_token"] === verifyToken &&
    Boolean(query?.["hub.challenge"])
  );
}
