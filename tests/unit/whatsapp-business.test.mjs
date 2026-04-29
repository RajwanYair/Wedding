/**
 * tests/unit/whatsapp-business.test.mjs — Sprint 38
 *
 * Tests for src/services/whatsapp-business.js —
 *   isBusinessAPIConfigured, buildApiEndpoint, buildTemplatePayload,
 *   buildTextPayload, sendTemplateMessage
 */

import { describe, it, expect } from "vitest";
import {
  isBusinessAPIConfigured,
  buildApiEndpoint,
  buildTemplatePayload,
  buildTextPayload,
  sendTemplateMessage,
} from "../../src/services/wa-messaging.js";

const VALID_CONFIG = {
  phoneNumberId: "123456789",
  accessToken:   "EAABsample",
};

// ── isBusinessAPIConfigured ────────────────────────────────────────────

describe("isBusinessAPIConfigured()", () => {
  it("returns true when both required fields are present", () => {
    expect(isBusinessAPIConfigured(VALID_CONFIG)).toBe(true);
  });

  it("returns false when phoneNumberId is missing", () => {
    expect(isBusinessAPIConfigured({ accessToken: "tok" })).toBe(false);
  });

  it("returns false when accessToken is missing", () => {
    expect(isBusinessAPIConfigured({ phoneNumberId: "123" })).toBe(false);
  });

  it("returns false for empty config object", () => {
    expect(isBusinessAPIConfigured({})).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isBusinessAPIConfigured(null)).toBe(false);
    expect(isBusinessAPIConfigured(undefined)).toBe(false);
  });
});

// ── buildApiEndpoint ───────────────────────────────────────────────────

describe("buildApiEndpoint()", () => {
  it("builds a valid Graph API URL", () => {
    const url = buildApiEndpoint(VALID_CONFIG);
    expect(url).toContain("https://graph.facebook.com/");
    expect(url).toContain(VALID_CONFIG.phoneNumberId);
    expect(url).toContain("/messages");
  });

  it("uses default API version v19.0 when not specified", () => {
    expect(buildApiEndpoint(VALID_CONFIG)).toContain("v19.0");
  });

  it("respects a custom apiVersion", () => {
    const url = buildApiEndpoint({ ...VALID_CONFIG, apiVersion: "v20.0" });
    expect(url).toContain("v20.0");
  });
});

// ── buildTemplatePayload ───────────────────────────────────────────────

describe("buildTemplatePayload()", () => {
  it("sets messaging_product to whatsapp", () => {
    const p = buildTemplatePayload("+972541112233", { name: "rsvp_confirm" });
    expect(p.messaging_product).toBe("whatsapp");
  });

  it("sets type to template", () => {
    const p = buildTemplatePayload("+972541112233", { name: "rsvp_confirm" });
    expect(p.type).toBe("template");
  });

  it("includes the template name and language", () => {
    const p = buildTemplatePayload("+1234567890", { name: "my_tmpl", language: "en_US" });
    expect(p.template.name).toBe("my_tmpl");
    expect(p.template.language.code).toBe("en_US");
  });

  it("defaults language to 'he'", () => {
    const p = buildTemplatePayload("+972541112233", { name: "t" });
    expect(p.template.language.code).toBe("he");
  });

  it("omits components when not provided", () => {
    const p = buildTemplatePayload("+972541112233", { name: "t" });
    expect(p.template.components).toBeUndefined();
  });

  it("includes components when provided", () => {
    const comp = [{ type: "body", parameters: [{ type: "text", text: "Avi" }] }];
    const p = buildTemplatePayload("+972541112233", { name: "t", components: comp });
    expect(p.template.components).toEqual(comp);
  });
});

// ── buildTextPayload ───────────────────────────────────────────────────

describe("buildTextPayload()", () => {
  it("builds a text message payload", () => {
    const p = buildTextPayload("+972541112233", "Hello!");
    expect(p.type).toBe("text");
    expect(p.text.body).toBe("Hello!");
  });

  it("defaults preview_url to false", () => {
    expect(buildTextPayload("+1", "hi").text.preview_url).toBe(false);
  });
});

// ── sendTemplateMessage ────────────────────────────────────────────────

describe("sendTemplateMessage()", () => {
  it("returns success=true in dry-run mode", () => {
    const r = sendTemplateMessage("+972541112233", { name: "rsvp_confirm" }, VALID_CONFIG);
    expect(r.success).toBe(true);
    expect(r.dryRun).toBe(true);
  });

  it("includes the built payload in the result", () => {
    const r = sendTemplateMessage("+1234", { name: "t" }, VALID_CONFIG);
    expect(r.payload.type).toBe("template");
  });

  it("includes endpoint URL when config is valid", () => {
    const r = sendTemplateMessage("+1234", { name: "t" }, VALID_CONFIG);
    expect(r.endpoint).toContain("graph.facebook.com");
  });

  it("reports endpoint as not-configured when config is missing", () => {
    const r = sendTemplateMessage("+1234", { name: "t" }, {});
    expect(r.endpoint).toBe("(not configured)");
  });
});
