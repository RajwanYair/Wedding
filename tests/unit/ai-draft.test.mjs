import { describe, it, expect } from "vitest";
import {
  AI_TONES,
  AI_LANGUAGES,
  DRAFT_CONTEXTS,
  buildSystemPrompt,
  buildInvitationPrompt,
  buildRsvpReminderPrompt,
  buildRsvpConfirmationPrompt,
  buildDayOfPrompt,
  buildThankYouPrompt,
  buildVendorOutreachPrompt,
  parseAiResponse,
  sanitizeAiOutput,
  estimateTokenCount,
  estimatePromptTokens,
  buildBulkInvitationPrompts,
} from "../../src/utils/ai-draft.js";

// ── Constants ─────────────────────────────────────────────────────────────

describe("AI_TONES", () => {
  it("is frozen", () => expect(Object.isFrozen(AI_TONES)).toBe(true));
  it("has expected keys", () => {
    expect(AI_TONES.FORMAL).toBe("formal");
    expect(AI_TONES.CASUAL).toBe("casual");
    expect(AI_TONES.PLAYFUL).toBe("playful");
    expect(AI_TONES.WARM).toBe("warm");
    expect(AI_TONES.ELEGANT).toBe("elegant");
  });
});

describe("AI_LANGUAGES", () => {
  it("is frozen", () => expect(Object.isFrozen(AI_LANGUAGES)).toBe(true));
  it("has expected codes", () => {
    expect(AI_LANGUAGES.HEBREW).toBe("he");
    expect(AI_LANGUAGES.ENGLISH).toBe("en");
    expect(AI_LANGUAGES.ARABIC).toBe("ar");
    expect(AI_LANGUAGES.RUSSIAN).toBe("ru");
  });
});

describe("DRAFT_CONTEXTS", () => {
  it("is frozen", () => expect(Object.isFrozen(DRAFT_CONTEXTS)).toBe(true));
  it("has expected context keys", () => {
    expect(DRAFT_CONTEXTS.INVITATION).toBeDefined();
    expect(DRAFT_CONTEXTS.RSVP_REMINDER).toBeDefined();
    expect(DRAFT_CONTEXTS.RSVP_CONFIRMATION).toBeDefined();
    expect(DRAFT_CONTEXTS.DAY_OF).toBeDefined();
    expect(DRAFT_CONTEXTS.THANK_YOU).toBeDefined();
    expect(DRAFT_CONTEXTS.VENDOR_OUTREACH).toBeDefined();
  });
});

// ── buildSystemPrompt ─────────────────────────────────────────────────────

describe("buildSystemPrompt()", () => {
  it("returns a non-empty string", () => {
    expect(typeof buildSystemPrompt()).toBe("string");
    expect(buildSystemPrompt().length).toBeGreaterThan(10);
  });

  it("includes language in prompt", () => {
    const p = buildSystemPrompt({ language: "en" });
    expect(p).toContain("en");
  });

  it("includes tone in prompt", () => {
    const p = buildSystemPrompt({ tone: AI_TONES.FORMAL });
    expect(p).toContain("formal");
  });

  it("includes couple name when provided", () => {
    const p = buildSystemPrompt({ coupleName: "Dana & Tal" });
    expect(p).toContain("Dana & Tal");
  });

  it("adds RTL note for Hebrew", () => {
    const p = buildSystemPrompt({ language: AI_LANGUAGES.HEBREW });
    expect(p).toContain("right-to-left");
  });

  it("adds RTL note for Arabic", () => {
    const p = buildSystemPrompt({ language: AI_LANGUAGES.ARABIC });
    expect(p).toContain("right-to-left");
  });

  it("does NOT add RTL note for English", () => {
    const p = buildSystemPrompt({ language: AI_LANGUAGES.ENGLISH });
    expect(p).not.toContain("right-to-left");
  });
});

// ── buildInvitationPrompt ─────────────────────────────────────────────────

describe("buildInvitationPrompt()", () => {
  const base = {
    guestName: "Noa Cohen",
    coupleName: "Dana & Tal",
    weddingDate: "2026-09-15",
    venue: "The Garden Hall",
  };

  it("returns { system, user, context }", () => {
    const p = buildInvitationPrompt(base);
    expect(p).toHaveProperty("system");
    expect(p).toHaveProperty("user");
    expect(p).toHaveProperty("context");
  });

  it("context is INVITATION", () => {
    expect(buildInvitationPrompt(base).context).toBe(DRAFT_CONTEXTS.INVITATION);
  });

  it("user prompt includes guest name", () => {
    expect(buildInvitationPrompt(base).user).toContain("Noa Cohen");
  });

  it("user prompt includes venue", () => {
    expect(buildInvitationPrompt(base).user).toContain("The Garden Hall");
  });

  it("user prompt includes wedding date", () => {
    expect(buildInvitationPrompt(base).user).toContain("2026-09-15");
  });

  it("includes additionalDetails when provided", () => {
    const p = buildInvitationPrompt({ ...base, additionalDetails: "Dress code: smart casual" });
    expect(p.user).toContain("Dress code");
  });
});

// ── buildRsvpReminderPrompt ───────────────────────────────────────────────

describe("buildRsvpReminderPrompt()", () => {
  const base = {
    guestName: "Mia Levy",
    coupleName: "Dana & Tal",
    deadlineDate: "2026-08-01",
  };

  it("returns correct shape", () => {
    const p = buildRsvpReminderPrompt(base);
    expect(p).toHaveProperty("system");
    expect(p).toHaveProperty("user");
    expect(p.context).toBe(DRAFT_CONTEXTS.RSVP_REMINDER);
  });

  it("user includes guest name and deadline", () => {
    const p = buildRsvpReminderPrompt(base);
    expect(p.user).toContain("Mia Levy");
    expect(p.user).toContain("2026-08-01");
  });
});

// ── buildRsvpConfirmationPrompt ───────────────────────────────────────────

describe("buildRsvpConfirmationPrompt()", () => {
  const base = {
    guestName: "Lior Ben-David",
    coupleName: "Dana & Tal",
    weddingDate: "2026-09-15",
  };

  it("returns context RSVP_CONFIRMATION", () => {
    expect(buildRsvpConfirmationPrompt(base).context).toBe(DRAFT_CONTEXTS.RSVP_CONFIRMATION);
  });

  it("includes table number when provided", () => {
    const p = buildRsvpConfirmationPrompt({ ...base, tableNumber: 7 });
    expect(p.user).toContain("7");
  });

  it("omits table info when tableNumber is null", () => {
    const p = buildRsvpConfirmationPrompt({ ...base, tableNumber: null });
    expect(p.user).not.toContain("table number");
  });
});

// ── buildDayOfPrompt ──────────────────────────────────────────────────────

describe("buildDayOfPrompt()", () => {
  const base = {
    guestName: "Ron Shapira",
    coupleName: "Dana & Tal",
    weddingDate: "2026-09-15",
    venue: "The Garden Hall",
    startTime: "18:00",
  };

  it("returns context DAY_OF", () => {
    expect(buildDayOfPrompt(base).context).toBe(DRAFT_CONTEXTS.DAY_OF);
  });

  it("includes start time", () => {
    expect(buildDayOfPrompt(base).user).toContain("18:00");
  });

  it("includes parking info when provided", () => {
    const p = buildDayOfPrompt({ ...base, parkingInfo: "Free parking on-site" });
    expect(p.user).toContain("Free parking on-site");
  });
});

// ── buildThankYouPrompt ───────────────────────────────────────────────────

describe("buildThankYouPrompt()", () => {
  it("returns context THANK_YOU", () => {
    const p = buildThankYouPrompt({ guestName: "Yael", coupleName: "Dana & Tal" });
    expect(p.context).toBe(DRAFT_CONTEXTS.THANK_YOU);
  });

  it("includes guest name", () => {
    const p = buildThankYouPrompt({ guestName: "Yael", coupleName: "Dana & Tal" });
    expect(p.user).toContain("Yael");
  });
});

// ── buildVendorOutreachPrompt ─────────────────────────────────────────────

describe("buildVendorOutreachPrompt()", () => {
  it("returns context VENDOR_OUTREACH", () => {
    const p = buildVendorOutreachPrompt({
      vendorName: "Photo Studio",
      coupleName: "Dana & Tal",
      serviceType: "photographer",
      weddingDate: "2026-09-15",
    });
    expect(p.context).toBe(DRAFT_CONTEXTS.VENDOR_OUTREACH);
  });

  it("defaults to English for vendor messages", () => {
    const p = buildVendorOutreachPrompt({
      vendorName: "Band X",
      coupleName: "Dana & Tal",
      serviceType: "music band",
      weddingDate: "2026-09-15",
    });
    expect(p.system).toContain("en");
  });
});

// ── parseAiResponse ───────────────────────────────────────────────────────

describe("parseAiResponse()", () => {
  it("returns null for null input", () => {
    expect(parseAiResponse(null)).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(parseAiResponse("string")).toBeNull();
    expect(parseAiResponse(42)).toBeNull();
  });

  it("parses OpenAI chat completions format", () => {
    const response = {
      choices: [{ message: { content: "  Hello world  " } }],
    };
    expect(parseAiResponse(response)).toBe("Hello world");
  });

  it("parses Anthropic messages format", () => {
    const response = {
      content: [{ type: "text", text: "  Shalom  " }],
    };
    expect(parseAiResponse(response)).toBe("Shalom");
  });

  it("parses simple { text } format", () => {
    expect(parseAiResponse({ text: "  Direct text  " })).toBe("Direct text");
  });

  it("parses simple { message } format", () => {
    expect(parseAiResponse({ message: "  Hello  " })).toBe("Hello");
  });

  it("returns null for unrecognized format", () => {
    expect(parseAiResponse({ unknown: "field" })).toBeNull();
  });
});

// ── sanitizeAiOutput ──────────────────────────────────────────────────────

describe("sanitizeAiOutput()", () => {
  it("removes bold markers", () => {
    expect(sanitizeAiOutput("Hello **world**!")).toBe("Hello world!");
  });

  it("removes italic markers", () => {
    expect(sanitizeAiOutput("Hello *world*!")).toBe("Hello world!");
  });

  it("removes leading/trailing quotes", () => {
    expect(sanitizeAiOutput('"Hello world"')).toBe("Hello world");
  });

  it("removes markdown headings", () => {
    expect(sanitizeAiOutput("## Subject\nBody")).toBe("Subject\nBody");
  });

  it("collapses triple+ newlines to double", () => {
    const input = "line1\n\n\n\nline2";
    expect(sanitizeAiOutput(input)).toBe("line1\n\nline2");
  });

  it("trims whitespace", () => {
    expect(sanitizeAiOutput("  hello  ")).toBe("hello");
  });

  it("passes through clean text unchanged", () => {
    expect(sanitizeAiOutput("Shalom, Noa!")).toBe("Shalom, Noa!");
  });
});

// ── estimateTokenCount ────────────────────────────────────────────────────

describe("estimateTokenCount()", () => {
  it("returns 0 for empty string", () => {
    expect(estimateTokenCount("")).toBe(0);
  });

  it("returns ceiling of chars / 4", () => {
    expect(estimateTokenCount("abcd")).toBe(1);
    expect(estimateTokenCount("abcde")).toBe(2);
    expect(estimateTokenCount("a".repeat(100))).toBe(25);
  });
});

// ── estimatePromptTokens ──────────────────────────────────────────────────

describe("estimatePromptTokens()", () => {
  it("returns system, user and total token counts", () => {
    const result = estimatePromptTokens({ system: "a".repeat(40), user: "b".repeat(20) });
    expect(result.systemTokens).toBe(10);
    expect(result.userTokens).toBe(5);
    expect(result.totalTokens).toBe(15);
  });
});

// ── buildBulkInvitationPrompts ────────────────────────────────────────────

describe("buildBulkInvitationPrompts()", () => {
  it("returns one prompt per guest", () => {
    const result = buildBulkInvitationPrompts({
      guests: [{ name: "Noa" }, { name: "Tal" }, { name: "Dana" }],
      coupleName: "Bride & Groom",
      weddingDate: "2026-09-15",
      venue: "Hall",
    });
    expect(result).toHaveLength(3);
  });

  it("each item has guestName and prompt", () => {
    const result = buildBulkInvitationPrompts({
      guests: [{ name: "Noa" }],
      coupleName: "Bride & Groom",
      weddingDate: "2026-09-15",
      venue: "Hall",
    });
    expect(result[0].guestName).toBe("Noa");
    expect(result[0].prompt).toHaveProperty("system");
    expect(result[0].prompt).toHaveProperty("user");
  });

  it("returns empty array for empty guests list", () => {
    const result = buildBulkInvitationPrompts({
      guests: [],
      coupleName: "Bride & Groom",
      weddingDate: "2026-09-15",
      venue: "Hall",
    });
    expect(result).toEqual([]);
  });
});
