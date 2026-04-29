/**
 * tests/unit/wa-messaging.test.mjs — S359: services/wa-messaging.js
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/utils/message-templates.js", () => ({
  renderTemplate: vi.fn((tpl, vars) => {
    // simple pass-through: replace {{var}} tokens only
    return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
  }),
}));

import {
  isBusinessAPIConfigured,
  buildApiEndpoint,
  buildTemplatePayload,
  buildTextPayload,
  sendTemplateMessage,
  getVariableHints,
  personalizeMessage,
  applyTone,
  generateToneVariants,
  MESSAGE_TONES,
  WEDDING_TEMPLATES,
} from "../../src/services/wa-messaging.js";

beforeEach(() => vi.clearAllMocks());

// ── isBusinessAPIConfigured ────────────────────────────────────────────────

describe("isBusinessAPIConfigured", () => {
  it("returns true when both fields present", () => {
    expect(isBusinessAPIConfigured({ phoneNumberId: "123", accessToken: "tok" })).toBe(true);
  });

  it("returns false when phoneNumberId missing", () => {
    expect(isBusinessAPIConfigured({ phoneNumberId: "", accessToken: "tok" })).toBe(false);
  });

  it("returns false when accessToken missing", () => {
    expect(isBusinessAPIConfigured({ phoneNumberId: "123", accessToken: "" })).toBe(false);
  });

  it("returns false for null config", () => {
    expect(isBusinessAPIConfigured(null)).toBe(false);
  });
});

// ── buildApiEndpoint ───────────────────────────────────────────────────────

describe("buildApiEndpoint", () => {
  it("builds endpoint with default version", () => {
    const url = buildApiEndpoint({ phoneNumberId: "123", accessToken: "tok" });
    expect(url).toBe("https://graph.facebook.com/v19.0/123/messages");
  });

  it("uses custom apiVersion", () => {
    const url = buildApiEndpoint({ phoneNumberId: "456", accessToken: "tok", apiVersion: "v20.0" });
    expect(url).toContain("v20.0");
  });
});

// ── buildTemplatePayload ───────────────────────────────────────────────────

describe("buildTemplatePayload", () => {
  it("returns correct shape", () => {
    const payload = buildTemplatePayload("+972501234567", { name: "invite", language: "he" });
    expect(payload.messaging_product).toBe("whatsapp");
    expect(payload.to).toBe("+972501234567");
    expect(payload.type).toBe("template");
    expect(payload.template.name).toBe("invite");
    expect(payload.template.language.code).toBe("he");
  });

  it("defaults language to he", () => {
    const payload = buildTemplatePayload("+972", { name: "test" });
    expect(payload.template.language.code).toBe("he");
  });

  it("omits components when none provided", () => {
    const payload = buildTemplatePayload("+972", { name: "test" });
    expect(payload.template).not.toHaveProperty("components");
  });

  it("includes components when provided", () => {
    const comps = [{ type: "body", parameters: [{ type: "text", text: "hi" }] }];
    const payload = buildTemplatePayload("+972", { name: "test", components: comps });
    expect(payload.template.components).toEqual(comps);
  });
});

// ── buildTextPayload ───────────────────────────────────────────────────────

describe("buildTextPayload", () => {
  it("returns correct shape", () => {
    const p = buildTextPayload("+972", "hello");
    expect(p.type).toBe("text");
    expect(p.text.body).toBe("hello");
    expect(p.text.preview_url).toBe(false);
  });

  it("respects previewUrl option", () => {
    const p = buildTextPayload("+972", "check this", { previewUrl: true });
    expect(p.text.preview_url).toBe(true);
  });
});

// ── sendTemplateMessage ────────────────────────────────────────────────────

describe("sendTemplateMessage", () => {
  const config = { phoneNumberId: "123", accessToken: "tok" };

  it("returns dry-run by default", () => {
    const result = sendTemplateMessage("+972", { name: "invite" }, config);
    expect(result.dryRun).toBe(true);
    expect(result.success).toBe(true);
  });

  it("includes payload and endpoint", () => {
    const result = sendTemplateMessage("+972", { name: "invite" }, config);
    expect(result.payload).toHaveProperty("messaging_product");
    expect(result.endpoint).toContain("graph.facebook.com");
  });

  it("shows (not configured) when config missing", () => {
    const result = sendTemplateMessage("+972", { name: "invite" }, {});
    expect(result.endpoint).toBe("(not configured)");
  });
});

// ── getVariableHints ───────────────────────────────────────────────────────

describe("getVariableHints", () => {
  it("returns array of hint objects", () => {
    const hints = getVariableHints();
    expect(hints.length).toBeGreaterThan(0);
    expect(hints[0]).toHaveProperty("key");
    expect(hints[0]).toHaveProperty("label");
  });

  it("includes name and date hints", () => {
    const keys = getVariableHints().map((h) => h.key);
    expect(keys).toContain("name");
    expect(keys).toContain("date");
  });
});

// ── personalizeMessage ─────────────────────────────────────────────────────

describe("personalizeMessage", () => {
  const guest = { id: "g1", firstName: "ישראל", lastName: "ישראלי" };
  const info = { date: "15.08.2025", venue: "אולם הגנים", groom: "יוסף", bride: "מרים" };

  it("replaces {name}", () => {
    const result = personalizeMessage("שלום {name}!", guest, info);
    expect(result).toContain("ישראל ישראלי");
  });

  it("replaces {firstName}", () => {
    const result = personalizeMessage("{firstName}", guest, info);
    expect(result).toBe("ישראל");
  });

  it("replaces {date} and {venue}", () => {
    const result = personalizeMessage("{date} @ {venue}", guest, info);
    expect(result).toContain("15.08.2025");
    expect(result).toContain("אולם הגנים");
  });

  it("replaces {tableName}", () => {
    const result = personalizeMessage("{tableName}", guest, info, "שולחן 3");
    expect(result).toBe("שולחן 3");
  });
});

// ── WEDDING_TEMPLATES ──────────────────────────────────────────────────────

describe("WEDDING_TEMPLATES", () => {
  it("contains invite, confirm, reminder, table, general", () => {
    expect(WEDDING_TEMPLATES).toHaveProperty("invite");
    expect(WEDDING_TEMPLATES).toHaveProperty("confirm");
    expect(WEDDING_TEMPLATES).toHaveProperty("reminder");
    expect(WEDDING_TEMPLATES).toHaveProperty("table");
    expect(WEDDING_TEMPLATES).toHaveProperty("general");
  });
});

// ── applyTone ──────────────────────────────────────────────────────────────

describe("applyTone", () => {
  it("formal tone adds greeting and sign-off (he)", () => {
    const result = applyTone("ברוכים הבאים", "formal", "he");
    expect(result).toContain("שלום רב");
    expect(result).toContain("בברכה");
  });

  it("casual tone adds hi prefix (he)", () => {
    const result = applyTone("ברוכים הבאים", "casual", "he");
    expect(result).toContain("היי");
  });

  it("playful tone adds party emoji (en)", () => {
    const result = applyTone("Welcome!", "playful", "en");
    expect(result).toContain("🎉");
  });

  it("minimal tone collapses and trims whitespace", () => {
    const result = applyTone("  Hello   World  ", "minimal");
    expect(result).toBe("Hello World");
  });

  it("returns empty string for empty input", () => {
    expect(applyTone("", "formal")).toBe("");
  });
});

// ── generateToneVariants ───────────────────────────────────────────────────

describe("generateToneVariants", () => {
  it("generates one variant per tone", () => {
    const variants = generateToneVariants("base text");
    for (const tone of MESSAGE_TONES) {
      expect(variants).toHaveProperty(tone);
      expect(typeof variants[tone]).toBe("string");
    }
  });
});

// ── MESSAGE_TONES ──────────────────────────────────────────────────────────

describe("MESSAGE_TONES", () => {
  it("contains all four tones", () => {
    expect(MESSAGE_TONES).toContain("formal");
    expect(MESSAGE_TONES).toContain("casual");
    expect(MESSAGE_TONES).toContain("playful");
    expect(MESSAGE_TONES).toContain("minimal");
  });
});
