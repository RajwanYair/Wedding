/**
 * tests/unit/email-service.test.mjs — Unit tests for email service (Sprint 44)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

const _edgeMock = vi.fn();
vi.mock("../../src/services/backend.js", () => ({
  callEdgeFunction: _edgeMock,
  sendWhatsAppCloudMessage: vi.fn(),
}));

import { initStore } from "../../src/core/store.js";
const { createCampaign, queueCampaign } = await import("../../src/services/campaign.js");
const {
  isValidEmail,
  sendEmail,
  sendEmailBatch,
  sendEmailCampaign,
} = await import("../../src/services/delivery.js");
import { makeGuest } from "./helpers.js";

function seedStore(guests = []) {
  initStore({
    campaigns: { value: [] },
    guests: { value: guests },
    tables: { value: [] },
    vendors: { value: [] },
    expenses: { value: [] },
    weddingInfo: { value: {} },
  });
}

beforeEach(() => {
  _edgeMock.mockReset();
  seedStore();
});

// ── isValidEmail ──────────────────────────────────────────────────────────

describe("isValidEmail", () => {
  it("accepts a standard email", () => {
    expect(isValidEmail("alice@example.com")).toBe(true);
  });

  it("rejects an email without @", () => {
    expect(isValidEmail("notanemail")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });

  it("rejects null", () => {
    expect(isValidEmail(null)).toBe(false);
  });
});

// ── sendEmail ─────────────────────────────────────────────────────────────

describe("sendEmail", () => {
  it("returns error for invalid recipient", async () => {
    const res = await sendEmail({ to: "bad", subject: "Test", text: "Hi" });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("Invalid recipient");
  });

  it("returns error for missing subject", async () => {
    const res = await sendEmail({ to: "a@b.com", subject: "", text: "Hi" });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("Subject");
  });

  it("returns error when both html and text are missing", async () => {
    const res = await sendEmail({ to: "a@b.com", subject: "OK" });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("html or text");
  });

  it("dispatches to send-email Edge Function on valid input", async () => {
    _edgeMock.mockResolvedValue({ ok: true, messageId: "msg123" });
    const res = await sendEmail({ to: "alice@example.com", subject: "RSVP", text: "Hi" });
    expect(res.ok).toBe(true);
    expect(_edgeMock).toHaveBeenCalledWith("send-email", expect.objectContaining({
      to: "alice@example.com",
    }));
  });
});

// ── sendEmailBatch ────────────────────────────────────────────────────────

describe("sendEmailBatch", () => {
  it("returns results for each message", async () => {
    _edgeMock.mockResolvedValue({ ok: true });
    const results = await sendEmailBatch([
      { to: "a@b.com", subject: "Hi", text: "A" },
      { to: "c@d.com", subject: "Hi", text: "B" },
    ]);
    expect(results).toHaveLength(2);
    expect(results[0].ok).toBe(true);
    expect(results[1].ok).toBe(true);
  });

  it("validates each message independently", async () => {
    const results = await sendEmailBatch([
      { to: "bad", subject: "Hi", text: "A" },
      { to: "ok@x.com", subject: "Hi", text: "B" },
    ]);
    expect(results[0].ok).toBe(false);
    // second was not sent because first failed (validation only, no edge call)
    expect(_edgeMock).toHaveBeenCalledTimes(1);
  });
});

// ── sendEmailCampaign (dryRun) ────────────────────────────────────────────

describe("sendEmailCampaign — dryRun", () => {
  it("sends to guests with valid emails; skips those without", async () => {
    const g1 = makeGuest({ id: "g1", email: "alice@example.com" });
    const g2 = makeGuest({ id: "g2", email: "" });
    seedStore([g1, g2]);

    const id = createCampaign({ name: "T", type: "email", guestIds: ["g1", "g2"], templateName: "generalInfo" });
    queueCampaign(id);
    const result = await sendEmailCampaign(id, { dryRun: true });
    expect(result.sent).toContain("g1");
    expect(result.skipped).toContain("g2");
    expect(_edgeMock).not.toHaveBeenCalled();
  });

  it("does not throw for empty guestIds", async () => {
    const id = createCampaign({ name: "E", type: "email", guestIds: [] });
    queueCampaign(id);
    await expect(sendEmailCampaign(id, { dryRun: true })).resolves.toBeDefined();
  });
});

// ── sendEmailCampaign — errors ─────────────────────────────────────────────

describe("sendEmailCampaign — errors", () => {
  it("throws for non-existent campaign", async () => {
    await expect(sendEmailCampaign("__bad__")).rejects.toThrow("not found");
  });

  it("throws for non-email campaign type", async () => {
    const id = createCampaign({ name: "W", type: "whatsapp", guestIds: [] });
    queueCampaign(id);
    await expect(sendEmailCampaign(id)).rejects.toThrow("email");
  });
});
