/**
 * tests/unit/campaign.test.mjs — Unit tests for campaign state tracker (Sprint 42)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

import { initStore } from "../../src/core/store.js";
const {
  createCampaign,
  getCampaign,
  listCampaigns,
  deleteCampaign,
  queueCampaign,
  startCampaign,
  cancelCampaign,
  recordSent,
  getCampaignStats,
} = await import("../../src/services/outreach.js");

function seedStore() {
  initStore({
    campaigns: { value: [] },
    guests: { value: [] },
    tables: { value: [] },
    vendors: { value: [] },
    expenses: { value: [] },
    weddingInfo: { value: {} },
  });
}

beforeEach(() => seedStore());

// ── createCampaign ────────────────────────────────────────────────────────

describe("createCampaign", () => {
  it("returns a string id", () => {
    const id = createCampaign({ name: "RSVP", type: "whatsapp", guestIds: ["g1"] });
    expect(typeof id).toBe("string");
    expect(id.startsWith("cmp-")).toBe(true);
  });

  it("persists campaign in store", () => {
    const id = createCampaign({ name: "RSVP", type: "whatsapp", guestIds: ["g1"] });
    expect(getCampaign(id)).not.toBeNull();
  });

  it("initial status is draft", () => {
    const id = createCampaign({ name: "RSVP", type: "whatsapp", guestIds: ["g1"] });
    expect(getCampaign(id)?.status).toBe("draft");
  });

  it("populates results with pending for each guestId", () => {
    const id = createCampaign({ name: "X", type: "email", guestIds: ["a", "b", "c"] });
    const c = getCampaign(id);
    expect(c?.results).toEqual({ a: "pending", b: "pending", c: "pending" });
  });
});

// ── listCampaigns ─────────────────────────────────────────────────────────

describe("listCampaigns", () => {
  it("returns all campaigns when no filter", () => {
    createCampaign({ name: "A", type: "whatsapp", guestIds: [] });
    createCampaign({ name: "B", type: "email", guestIds: [] });
    expect(listCampaigns()).toHaveLength(2);
  });

  it("filters by status", () => {
    const id = createCampaign({ name: "A", type: "whatsapp", guestIds: [] });
    queueCampaign(id);
    expect(listCampaigns("queued")).toHaveLength(1);
    expect(listCampaigns("draft")).toHaveLength(0);
  });
});

// ── deleteCampaign ────────────────────────────────────────────────────────

describe("deleteCampaign", () => {
  it("deletes a draft campaign", () => {
    const id = createCampaign({ name: "D", type: "whatsapp", guestIds: [] });
    expect(deleteCampaign(id)).toBe(true);
    expect(getCampaign(id)).toBeNull();
  });

  it("cannot delete a sending campaign", () => {
    const id = createCampaign({ name: "D", type: "whatsapp", guestIds: ["g1"] });
    queueCampaign(id);
    startCampaign(id);
    expect(deleteCampaign(id)).toBe(false);
  });

  it("returns false for unknown id", () => {
    expect(deleteCampaign("__missing__")).toBe(false);
  });
});

// ── Lifecycle: queueCampaign / startCampaign / cancelCampaign ────────────

describe("campaign lifecycle", () => {
  it("draft → queued via queueCampaign", () => {
    const id = createCampaign({ name: "L", type: "whatsapp", guestIds: [] });
    expect(queueCampaign(id)).toBe(true);
    expect(getCampaign(id)?.status).toBe("queued");
  });

  it("queueCampaign fails when already sending", () => {
    const id = createCampaign({ name: "L", type: "whatsapp", guestIds: ["g1"] });
    queueCampaign(id); startCampaign(id);
    expect(queueCampaign(id)).toBe(false);
  });

  it("queued → sending via startCampaign", () => {
    const id = createCampaign({ name: "L", type: "whatsapp", guestIds: ["g1"] });
    queueCampaign(id);
    expect(startCampaign(id)).toBe(true);
    expect(getCampaign(id)?.status).toBe("sending");
    expect(getCampaign(id)?.startedAt).toBeGreaterThan(0);
  });

  it("startCampaign fails on draft", () => {
    const id = createCampaign({ name: "L", type: "whatsapp", guestIds: ["g1"] });
    expect(startCampaign(id)).toBe(false);
  });

  it("cancelCampaign from draft", () => {
    const id = createCampaign({ name: "L", type: "whatsapp", guestIds: [] });
    expect(cancelCampaign(id)).toBe(true);
    expect(getCampaign(id)?.status).toBe("cancelled");
  });

  it("cancelCampaign from queued", () => {
    const id = createCampaign({ name: "L", type: "whatsapp", guestIds: [] });
    queueCampaign(id);
    expect(cancelCampaign(id)).toBe(true);
    expect(getCampaign(id)?.status).toBe("cancelled");
  });

  it("cancelCampaign fails when sending", () => {
    const id = createCampaign({ name: "L", type: "whatsapp", guestIds: ["g1"] });
    queueCampaign(id); startCampaign(id);
    expect(cancelCampaign(id)).toBe(false);
  });
});

// ── recordSent ────────────────────────────────────────────────────────────

describe("recordSent", () => {
  it("records sent result for a guest", () => {
    const id = createCampaign({ name: "R", type: "whatsapp", guestIds: ["g1", "g2"] });
    queueCampaign(id); startCampaign(id);
    expect(recordSent(id, "g1", "sent")).toBe(true);
    expect(getCampaign(id)?.results.g1).toBe("sent");
    expect(getCampaign(id)?.sentCount).toBe(1);
  });

  it("records failed result and increments failedCount", () => {
    const id = createCampaign({ name: "R", type: "whatsapp", guestIds: ["g1"] });
    queueCampaign(id); startCampaign(id);
    recordSent(id, "g1", "failed");
    expect(getCampaign(id)?.failedCount).toBe(1);
  });

  it("auto-completes when all guests done", () => {
    const id = createCampaign({ name: "R", type: "whatsapp", guestIds: ["g1", "g2"] });
    queueCampaign(id); startCampaign(id);
    recordSent(id, "g1", "sent");
    recordSent(id, "g2", "sent");
    expect(getCampaign(id)?.status).toBe("completed");
    expect(getCampaign(id)?.completedAt).toBeGreaterThan(0);
  });

  it("returns false for non-sending campaign", () => {
    const id = createCampaign({ name: "R", type: "whatsapp", guestIds: ["g1"] });
    expect(recordSent(id, "g1", "sent")).toBe(false);
  });

  it("returns false for unknown guest", () => {
    const id = createCampaign({ name: "R", type: "whatsapp", guestIds: ["g1"] });
    queueCampaign(id); startCampaign(id);
    expect(recordSent(id, "unknown_guest", "sent")).toBe(false);
  });
});

// ── getCampaignStats ──────────────────────────────────────────────────────

describe("getCampaignStats", () => {
  it("returns correct stats", () => {
    const id = createCampaign({ name: "S", type: "whatsapp", guestIds: ["a", "b", "c"] });
    queueCampaign(id); startCampaign(id);
    recordSent(id, "a", "sent");
    recordSent(id, "b", "failed");
    const stats = getCampaignStats(id);
    expect(stats?.total).toBe(3);
    expect(stats?.sent).toBe(1);
    expect(stats?.failed).toBe(1);
    expect(stats?.pending).toBe(1);
  });

  it("returns null for unknown id", () => {
    expect(getCampaignStats("__missing__")).toBeNull();
  });
});
