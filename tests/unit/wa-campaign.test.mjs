/**
 * tests/unit/wa-campaign.test.mjs — Unit tests for WhatsApp campaign service (Sprint 43)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

// Mock the WhatsApp send function
const _sendMock = vi.fn();
vi.mock("../../src/services/backend.js", () => ({
  sendWhatsAppCloudMessage: _sendMock,
  callEdgeFunction: vi.fn(),
}));

import { initStore, storeSet } from "../../src/core/store.js";
const { createCampaign, queueCampaign } = await import("../../src/services/campaign.js");
const { runWACampaign, sendAdHocWhatsApp } = await import("../../src/services/wa-campaign.js");
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

const G1 = makeGuest({ id: "g1", firstName: "Alice", phone: "0501234567" });
const G2 = makeGuest({ id: "g2", firstName: "Bob", phone: "" });

beforeEach(() => {
  _sendMock.mockReset();
  seedStore([G1, G2]);
});

// ── runWACampaign (dryRun) ────────────────────────────────────────────────

describe("runWACampaign — dryRun", () => {
  it("sends to guests with phones; skips those without", async () => {
    const id = createCampaign({
      name: "Test", type: "whatsapp", guestIds: ["g1", "g2"],
      templateName: "rsvpConfirm",
    });
    queueCampaign(id);
    const result = await runWACampaign(id, { dryRun: true });
    expect(result.sent).toContain("g1");
    expect(result.skipped).toContain("g2");
    expect(_sendMock).not.toHaveBeenCalled();
  });

  it("does not throw for empty guestIds", async () => {
    const id = createCampaign({ name: "E", type: "whatsapp", guestIds: [] });
    queueCampaign(id);
    await expect(runWACampaign(id, { dryRun: true })).resolves.toBeDefined();
  });
});

// ── runWACampaign (live) ──────────────────────────────────────────────────

describe("runWACampaign — live sends", () => {
  it("records sent on ok response", async () => {
    _sendMock.mockResolvedValue({ ok: true, messageId: "wamid.123" });
    const id = createCampaign({
      name: "Live", type: "whatsapp", guestIds: ["g1"],
      templateName: "rsvpConfirm",
    });
    queueCampaign(id);
    const result = await runWACampaign(id);
    expect(result.sent).toContain("g1");
    expect(_sendMock).toHaveBeenCalledOnce();
  });

  it("records failed on error response", async () => {
    _sendMock.mockResolvedValue({ ok: false, error: "rate_limit" });
    const id = createCampaign({
      name: "Fail", type: "whatsapp", guestIds: ["g1"],
      templateName: "rsvpConfirm",
    });
    queueCampaign(id);
    const result = await runWACampaign(id);
    expect(result.failed).toContain("g1");
    expect(result.errors.g1).toBe("rate_limit");
  });

  it("records failed when send throws", async () => {
    _sendMock.mockRejectedValue(new Error("network error"));
    const id = createCampaign({
      name: "Throw", type: "whatsapp", guestIds: ["g1"],
      templateName: "rsvpConfirm",
    });
    queueCampaign(id);
    const result = await runWACampaign(id);
    expect(result.failed).toContain("g1");
    expect(result.errors.g1).toContain("network error");
  });

  it("throws for non-existent campaign", async () => {
    await expect(runWACampaign("__bad__")).rejects.toThrow("not found");
  });

  it("throws for non-whatsapp campaign", async () => {
    const id = createCampaign({ name: "E", type: "email", guestIds: [] });
    queueCampaign(id);
    await expect(runWACampaign(id)).rejects.toThrow("whatsapp");
  });
});

// ── sendAdHocWhatsApp ─────────────────────────────────────────────────────

describe("sendAdHocWhatsApp", () => {
  it("dryRun sends to guests with phones", async () => {
    const result = await sendAdHocWhatsApp(["g1", "g2"], "Hello!", { dryRun: true });
    expect(result.sent).toContain("g1");
    expect(result.skipped).toContain("g2");
  });

  it("records errors for guest without phone", async () => {
    const result = await sendAdHocWhatsApp(["g2"], "Hi", { dryRun: true });
    expect(result.errors.g2).toContain("no phone");
  });

  it("calls sendWhatsAppCloudMessage for each guest with phone", async () => {
    _sendMock.mockResolvedValue({ ok: true });
    await sendAdHocWhatsApp(["g1"], "Hey!", {});
    expect(_sendMock).toHaveBeenCalledOnce();
    const [phone, msg] = _sendMock.mock.calls[0];
    expect(phone).toBe("972501234567");
    expect(msg.text).toBe("Hey!");
  });
});
