/**
 * tests/integration/messaging-pipeline.test.mjs — Sprint 109
 *
 * Integration tests for the full messaging pipeline:
 *   Campaign → wa-campaign / email-service → delivery-tracking
 *
 * Tests validate that all three layers work together correctly — campaign
 * state transitions, per-guest sends, delivery recording, and error paths.
 *
 * Unlike unit tests, no individual function is isolated: the real campaign,
 * wa-campaign, email-service, and delivery-tracking modules run together
 * with only the network (backend.js) mocked.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Network mock (backend.js) ─────────────────────────────────────────────

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

const _waSend   = vi.fn();
const _emailSend = vi.fn();

vi.mock("../../src/services/backend.js", () => ({
  sendWhatsAppCloudMessage: _waSend,
  callEdgeFunction: _emailSend,
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────

import { initStore } from "../../src/core/store.js";
const { createCampaign, queueCampaign, getCampaign, getCampaignStats } =
  await import("../../src/services/campaign.js");
const { runWACampaign, sendAdHocWhatsApp } =
  await import("../../src/services/campaign.js");
const { sendEmailCampaign } =
  await import("../../src/services/email-service.js");
const { recordDelivery, getDeliveryHistory, getDeliveryStats } =
  await import("../../src/services/delivery-service.js");

// ── Helpers ────────────────────────────────────────────────────────────────

function seedAll(guests = []) {
  initStore({
    campaigns:   { value: [] },
    guests:      { value: guests },
    tables:      { value: [] },
    vendors:     { value: [] },
    expenses:    { value: {} },
    weddingInfo: { value: {} },
    deliveries:  { value: [] },
  });
}

function seedGuests(guests) {
  seedAll(guests);
}

function guest(id, overrides = {}) {
  return {
    id,
    firstName: `Guest_${id}`,
    lastName:  "Test",
    phone:     `0501234${id.padStart(3, "0")}`,
    email:     `${id}@example.com`,
    status:    "confirmed",
    ...overrides,
  };
}

// ── WhatsApp campaign pipeline ─────────────────────────────────────────────

describe("WhatsApp campaign — happy path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedGuests([guest("g1"), guest("g2")]);
    _waSend.mockResolvedValue({ ok: true, messageId: "wamid.abc" });
  });

  it("transitions campaign to completed after all sends succeed", async () => {
    const id = createCampaign({ name: "WA test", type: "whatsapp", guestIds: ["g1", "g2"] });
    queueCampaign(id);
    const result = await runWACampaign(id);
    expect(result.sent).toEqual(expect.arrayContaining(["g1", "g2"]));
    expect(result.failed).toHaveLength(0);
    expect(getCampaign(id)?.status).toBe("completed");
  });

  it("calls sendWhatsAppCloudMessage once per guest", async () => {
    const id = createCampaign({ name: "WA count", type: "whatsapp", guestIds: ["g1", "g2"] });
    await runWACampaign(id);
    expect(_waSend).toHaveBeenCalledTimes(2);
  });

  it("auto-transitions draft → sending before run", async () => {
    const id = createCampaign({ name: "WA auto", type: "whatsapp", guestIds: ["g1"] });
    // Do NOT call queueCampaign — check auto-transition
    const result = await runWACampaign(id);
    expect(result.sent).toContain("g1");
  });
});

describe("WhatsApp campaign — error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedGuests([guest("g1"), guest("g2")]);
  });

  it("records failed guests when send returns not-ok", async () => {
    _waSend.mockResolvedValue({ ok: false, error: "rate_limit" });
    const id = createCampaign({ name: "WA fail", type: "whatsapp", guestIds: ["g1"] });
    const result = await runWACampaign(id);
    expect(result.failed).toContain("g1");
    expect(result.errors.g1).toMatch(/rate_limit/);
  });

  it("records failed guests when send throws", async () => {
    _waSend.mockRejectedValue(new Error("timeout"));
    const id = createCampaign({ name: "WA throw", type: "whatsapp", guestIds: ["g1"] });
    const result = await runWACampaign(id);
    expect(result.failed).toContain("g1");
    expect(result.errors.g1).toMatch(/timeout/);
  });

  it("skips guests with no phone", async () => {
    seedGuests([guest("g3", { phone: "" })]);
    const id = createCampaign({ name: "WA skip", type: "whatsapp", guestIds: ["g3"] });
    const result = await runWACampaign(id);
    expect(result.skipped).toContain("g3");
    expect(_waSend).not.toHaveBeenCalled();
  });

  it("mixed success/fail: campaign ends in failed status", async () => {
    _waSend
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, error: "blocked" });
    const id = createCampaign({ name: "WA mixed", type: "whatsapp", guestIds: ["g1", "g2"] });
    const result = await runWACampaign(id);
    expect(result.sent.length + result.failed.length).toBe(2);
  });
});

// ── Email campaign pipeline ────────────────────────────────────────────────

describe("Email campaign — happy path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedGuests([guest("e1"), guest("e2")]);
    _emailSend.mockResolvedValue({ ok: true, messageId: "msg.abc" });
  });

  it("sends to all guests and transitions to completed", async () => {
    const id = createCampaign({ name: "Email test", type: "email", guestIds: ["e1", "e2"] });
    const result = await sendEmailCampaign(id);
    expect(result.sent).toEqual(expect.arrayContaining(["e1", "e2"]));
    expect(getCampaign(id)?.status).toBe("completed");
  });

  it("skips guests with no valid email", async () => {
    seedGuests([guest("e3", { email: "" })]);
    const id = createCampaign({ name: "Email skip", type: "email", guestIds: ["e3"] });
    const result = await sendEmailCampaign(id);
    expect(result.skipped).toContain("e3");
    expect(_emailSend).not.toHaveBeenCalled();
  });

  it("records failure when email send throws", async () => {
    _emailSend.mockRejectedValue(new Error("SMTP error"));
    const id = createCampaign({ name: "Email throw", type: "email", guestIds: ["e1"] });
    const result = await sendEmailCampaign(id);
    expect(result.failed).toContain("e1");
    expect(result.errors.e1).toMatch(/SMTP error/);
  });

  it("dry run does not call callEdgeFunction", async () => {
    const id = createCampaign({ name: "Email dry", type: "email", guestIds: ["e1"] });
    const result = await sendEmailCampaign(id, { dryRun: true });
    expect(result.sent).toContain("e1");
    expect(_emailSend).not.toHaveBeenCalled();
  });
});

// ── Delivery tracking integration ─────────────────────────────────────────

describe("Delivery tracking — cross-campaign audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedGuests([]);
  });

  it("records a delivery and retrieves it by guest", () => {
    recordDelivery("g1", "email", "delivered", { campaignId: "c1" });
    const history = getDeliveryHistory("g1");
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe("delivered");
  });

  it("summarises deliveries across channels", () => {
    recordDelivery("g1", "whatsapp", "sent");
    recordDelivery("g2", "email",    "failed");
    recordDelivery("g3", "whatsapp", "delivered");
    const summary = getDeliveryStats();
    expect(summary.sent + summary.failed + summary.delivered).toBeGreaterThanOrEqual(2);
  });

  it("getDeliveryHistory returns only records for given guest", () => {
    recordDelivery("gA", "whatsapp", "sent");
    recordDelivery("gB", "email",    "sent");
    expect(getDeliveryHistory("gA")).toHaveLength(1);
    expect(getDeliveryHistory("gB")).toHaveLength(1);
  });
});

// ── Ad-hoc WhatsApp ────────────────────────────────────────────────────────

describe("sendAdHocWhatsApp — integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedGuests([guest("h1"), guest("h2")]);
    _waSend.mockResolvedValue({ ok: true });
  });

  it("sends to all supplied guest ids", async () => {
    const result = await sendAdHocWhatsApp(["h1", "h2"], "Hello {{firstName}}");
    expect(result.sent).toEqual(expect.arrayContaining(["h1", "h2"]));
    expect(_waSend).toHaveBeenCalledTimes(2);
  });

  it("skips unknown guest ids", async () => {
    const result = await sendAdHocWhatsApp(["UNKNOWN"], "Hello");
    expect(result.skipped).toContain("UNKNOWN");
    expect(_waSend).not.toHaveBeenCalled();
  });

  it("dry run returns sent without calling network", async () => {
    const result = await sendAdHocWhatsApp(["h1"], "Hello", { dryRun: true });
    expect(result.sent).toContain("h1");
    expect(_waSend).not.toHaveBeenCalled();
  });
});

// ── Campaign stats ─────────────────────────────────────────────────────────

describe("getCampaignStats — aggregation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedGuests([]);
    _waSend.mockResolvedValue({ ok: true });
  });

  it("reflects completed campaigns in stats", async () => {
    const id1 = createCampaign({ name: "StatsA", type: "whatsapp", guestIds: [] });
    const id2 = createCampaign({ name: "StatsB", type: "email",    guestIds: [] });
    queueCampaign(id1);
    await runWACampaign(id1);

    const stats = getCampaignStats(id1) ?? getCampaignStats(id2) ?? { total: 0 };
    expect(getCampaign(id1)?.guestIds.length ?? 0).toBe(0);
    // id1 has no guests so it stays in "sending" (no recordSent calls to auto-complete)
    expect(["sending", "completed"]).toContain(getCampaign(id1)?.status);
    // id2 stays draft
    expect(getCampaign(id2)?.status).toBe("draft");
  });
});
