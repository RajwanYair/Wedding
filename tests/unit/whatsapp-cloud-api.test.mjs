import { describe, it, expect } from "vitest";
import {
  WA_API_VERSION,
  WABA_BASE_URL,
  DELIVERY_STATUSES,
  MESSAGE_TYPES,
  INTERACTIVE_TYPES,
  isValidPhoneForWaba,
  formatPhoneForWaba,
  buildTextMessage,
  buildTemplateMessage,
  buildInteractiveMessage,
  buildMediaMessage,
  parseWebhookPayload,
  parseDeliveryStatus,
  buildStatusWebhook,
  buildMessagesEndpoint,
  isWebhookVerification,
} from "../../src/utils/whatsapp-cloud-api.js";

// ── Constants ─────────────────────────────────────────────────────────────

describe("WA_API_VERSION", () => {
  it("starts with v", () => expect(WA_API_VERSION).toMatch(/^v\d+\.\d+$/));
});

describe("WABA_BASE_URL", () => {
  it("contains the API version", () => expect(WABA_BASE_URL).toContain(WA_API_VERSION));
  it("contains {phoneNumberId} placeholder", () => expect(WABA_BASE_URL).toContain("{phoneNumberId}"));
});

describe("DELIVERY_STATUSES", () => {
  it("is frozen", () => expect(Object.isFrozen(DELIVERY_STATUSES)).toBe(true));
  it("has expected statuses", () => {
    expect(DELIVERY_STATUSES.SENT).toBe("sent");
    expect(DELIVERY_STATUSES.DELIVERED).toBe("delivered");
    expect(DELIVERY_STATUSES.READ).toBe("read");
    expect(DELIVERY_STATUSES.FAILED).toBe("failed");
  });
});

describe("MESSAGE_TYPES", () => {
  it("is frozen", () => expect(Object.isFrozen(MESSAGE_TYPES)).toBe(true));
  it("has TEXT and TEMPLATE", () => {
    expect(MESSAGE_TYPES.TEXT).toBe("text");
    expect(MESSAGE_TYPES.TEMPLATE).toBe("template");
  });
});

describe("INTERACTIVE_TYPES", () => {
  it("is frozen", () => expect(Object.isFrozen(INTERACTIVE_TYPES)).toBe(true));
  it("has BUTTON and LIST", () => {
    expect(INTERACTIVE_TYPES.BUTTON).toBe("button");
    expect(INTERACTIVE_TYPES.LIST).toBe("list");
  });
});

// ── isValidPhoneForWaba ───────────────────────────────────────────────────

describe("isValidPhoneForWaba()", () => {
  it("accepts valid E.164 with +", () => expect(isValidPhoneForWaba("+972541234567")).toBe(true));
  it("accepts digits only", () => expect(isValidPhoneForWaba("972541234567")).toBe(true));
  it("rejects phone with spaces", () => expect(isValidPhoneForWaba("972 54 123 4567")).toBe(false));
  it("rejects too-short number", () => expect(isValidPhoneForWaba("123456789")).toBe(false));
  it("rejects too-long number", () => expect(isValidPhoneForWaba("1234567890123456")).toBe(false));
  it("rejects non-string", () => expect(isValidPhoneForWaba(972541234567)).toBe(false));
  it("rejects empty string", () => expect(isValidPhoneForWaba("")).toBe(false));
});

// ── formatPhoneForWaba ────────────────────────────────────────────────────

describe("formatPhoneForWaba()", () => {
  it("strips non-digits", () => expect(formatPhoneForWaba("+972-54-123-4567")).toBe("972541234567"));
  it("handles no country code", () => expect(formatPhoneForWaba("0541234567")).toBe("0541234567"));
  it("returns null for too-short result", () => expect(formatPhoneForWaba("12345")).toBeNull());
  it("returns null for non-string", () => expect(formatPhoneForWaba(null)).toBeNull());
});

// ── buildTextMessage ──────────────────────────────────────────────────────

describe("buildTextMessage()", () => {
  it("returns correct shape", () => {
    const msg = buildTextMessage({ to: "972541234567", body: "Hello" });
    expect(msg.messaging_product).toBe("whatsapp");
    expect(msg.type).toBe(MESSAGE_TYPES.TEXT);
    expect(msg.to).toBe("972541234567");
    expect(msg.text.body).toBe("Hello");
  });

  it("preview_url defaults to false", () => {
    expect(buildTextMessage({ to: "972541234567", body: "x" }).text.preview_url).toBe(false);
  });

  it("throws without to", () => {
    expect(() => buildTextMessage({ body: "Hi" })).toThrow();
  });

  it("throws without body", () => {
    expect(() => buildTextMessage({ to: "972541234567" })).toThrow();
  });
});

// ── buildTemplateMessage ──────────────────────────────────────────────────

describe("buildTemplateMessage()", () => {
  it("returns correct shape", () => {
    const msg = buildTemplateMessage({ to: "972541234567", templateName: "wedding_invite" });
    expect(msg.type).toBe(MESSAGE_TYPES.TEMPLATE);
    expect(msg.template.name).toBe("wedding_invite");
    expect(msg.template.language.code).toBe("en_US");
  });

  it("uses provided languageCode", () => {
    const msg = buildTemplateMessage({
      to: "972541234567",
      templateName: "rsvp",
      languageCode: "he",
    });
    expect(msg.template.language.code).toBe("he");
  });

  it("throws without templateName", () => {
    expect(() => buildTemplateMessage({ to: "972541234567" })).toThrow();
  });
});

// ── buildInteractiveMessage ───────────────────────────────────────────────

describe("buildInteractiveMessage()", () => {
  const buttons = [
    { id: "yes", title: "Yes" },
    { id: "no", title: "No" },
  ];

  it("returns correct shape", () => {
    const msg = buildInteractiveMessage({ to: "972541234567", bodyText: "Coming?", buttons });
    expect(msg.type).toBe(MESSAGE_TYPES.INTERACTIVE);
    expect(msg.interactive.type).toBe(INTERACTIVE_TYPES.BUTTON);
    expect(msg.interactive.action.buttons).toHaveLength(2);
  });

  it("includes header when provided", () => {
    const msg = buildInteractiveMessage({
      to: "972541234567",
      bodyText: "Coming?",
      buttons,
      headerText: "RSVP",
    });
    expect(msg.interactive.header.text).toBe("RSVP");
  });

  it("includes footer when provided", () => {
    const msg = buildInteractiveMessage({
      to: "972541234567",
      bodyText: "Coming?",
      buttons,
      footerText: "Dana & Tal",
    });
    expect(msg.interactive.footer.text).toBe("Dana & Tal");
  });

  it("throws when buttons > 3", () => {
    const tooMany = [1, 2, 3, 4].map((i) => ({ id: String(i), title: `Btn ${i}` }));
    expect(() =>
      buildInteractiveMessage({ to: "972541234567", bodyText: "x", buttons: tooMany })
    ).toThrow();
  });

  it("throws without buttons array", () => {
    expect(() =>
      buildInteractiveMessage({ to: "972541234567", bodyText: "x", buttons: [] })
    ).toThrow();
  });
});

// ── buildMediaMessage ─────────────────────────────────────────────────────

describe("buildMediaMessage()", () => {
  it("builds an image message", () => {
    const msg = buildMediaMessage({
      to: "972541234567",
      mediaType: MESSAGE_TYPES.IMAGE,
      link: "https://example.com/photo.jpg",
      caption: "Our venue",
    });
    expect(msg.type).toBe(MESSAGE_TYPES.IMAGE);
    expect(msg.image.link).toBe("https://example.com/photo.jpg");
    expect(msg.image.caption).toBe("Our venue");
  });

  it("builds a document message with filename", () => {
    const msg = buildMediaMessage({
      to: "972541234567",
      mediaType: MESSAGE_TYPES.DOCUMENT,
      link: "https://example.com/invite.pdf",
      filename: "invite.pdf",
    });
    expect(msg.document.filename).toBe("invite.pdf");
  });

  it("throws for unsupported media type", () => {
    expect(() =>
      buildMediaMessage({ to: "x", mediaType: "unknown", link: "https://x.com/x.bin" })
    ).toThrow();
  });

  it("throws without link", () => {
    expect(() =>
      buildMediaMessage({ to: "972541234567", mediaType: MESSAGE_TYPES.IMAGE })
    ).toThrow();
  });
});

// ── parseWebhookPayload ───────────────────────────────────────────────────

describe("parseWebhookPayload()", () => {
  it("returns empty array for null", () => expect(parseWebhookPayload(null)).toEqual([]));

  it("returns empty array for wrong object type", () => {
    expect(parseWebhookPayload({ object: "page" })).toEqual([]);
  });

  it("parses a text message", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "E1",
          changes: [
            {
              value: {
                messages: [
                  {
                    from: "972541234567",
                    id: "MSG1",
                    type: "text",
                    timestamp: "1700000000",
                    text: { body: "Hello" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const result = parseWebhookPayload(payload);
    expect(result).toHaveLength(1);
    expect(result[0].from).toBe("972541234567");
    expect(result[0].text).toBe("Hello");
    expect(result[0].type).toBe("text");
  });

  it("returns empty for no messages", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [{ id: "E1", changes: [{ value: { messages: [] } }] }],
    };
    expect(parseWebhookPayload(payload)).toEqual([]);
  });
});

// ── parseDeliveryStatus ───────────────────────────────────────────────────

describe("parseDeliveryStatus()", () => {
  it("returns empty array for null", () => expect(parseDeliveryStatus(null)).toEqual([]));

  it("parses a delivered status", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "E1",
          changes: [
            {
              value: {
                statuses: [
                  {
                    id: "MSG1",
                    status: "delivered",
                    timestamp: "1700000000",
                    recipient_id: "972541234567",
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const result = parseDeliveryStatus(payload);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("delivered");
    expect(result[0].recipientId).toBe("972541234567");
  });
});

// ── buildStatusWebhook ────────────────────────────────────────────────────

describe("buildStatusWebhook()", () => {
  it("builds a parseable webhook payload", () => {
    const webhook = buildStatusWebhook({
      phoneNumberId: "PN1",
      messageId: "MSG1",
      recipientId: "972541234567",
      status: DELIVERY_STATUSES.READ,
    });
    const parsed = parseDeliveryStatus(webhook);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].status).toBe(DELIVERY_STATUSES.READ);
  });
});

// ── buildMessagesEndpoint ─────────────────────────────────────────────────

describe("buildMessagesEndpoint()", () => {
  it("contains the phone number ID", () => {
    expect(buildMessagesEndpoint("123456789")).toContain("123456789");
  });

  it("contains the API version", () => {
    expect(buildMessagesEndpoint("PN1")).toContain(WA_API_VERSION);
  });

  it("throws without phoneNumberId", () => {
    expect(() => buildMessagesEndpoint("")).toThrow();
  });
});

// ── isWebhookVerification ─────────────────────────────────────────────────

describe("isWebhookVerification()", () => {
  it("returns true for valid challenge", () => {
    const query = { "hub.mode": "subscribe", "hub.verify_token": "secret", "hub.challenge": "12345" };
    expect(isWebhookVerification(query, "secret")).toBe(true);
  });

  it("returns false for wrong token", () => {
    const query = { "hub.mode": "subscribe", "hub.verify_token": "wrong", "hub.challenge": "12345" };
    expect(isWebhookVerification(query, "secret")).toBe(false);
  });

  it("returns false for missing challenge", () => {
    const query = { "hub.mode": "subscribe", "hub.verify_token": "secret" };
    expect(isWebhookVerification(query, "secret")).toBe(false);
  });

  it("returns false for null query", () => {
    expect(isWebhookVerification(null, "secret")).toBe(false);
  });
});
