/**
 * tests/unit/outreach-campaigns.test.mjs — S352: services/outreach.js campaign helpers
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────

const _store = new Map();

vi.mock("../../src/core/store.js", () => ({
  storeGet: (k) => _store.get(k) ?? null,
  storeSet: vi.fn((k, v) => _store.set(k, v)),
  storeUpsert: vi.fn((k, record) => {
    const arr = _store.get(k) ?? [];
    arr.push(record);
    _store.set(k, arr);
  }),
}));

vi.mock("../../src/services/backend.js", () => ({
  sendWhatsAppCloudMessage: vi.fn(),
  callEdgeFunction: vi.fn(),
}));
vi.mock("../../src/utils/message-templates.js", () => ({
  getTemplate: vi.fn(() => null),
  renderTemplate: vi.fn(() => "rendered message"),
}));
vi.mock("../../src/utils/phone.js", () => ({ cleanPhone: (p) => p }));
vi.mock("../../src/utils/sanitize.js", () => ({
  sanitize: (d, _s) => ({ value: d, errors: [] }),
}));

import {
  createCampaign,
  getCampaign,
  listCampaigns,
  deleteCampaign,
  queueCampaign,
  startCampaign,
  cancelCampaign,
  recordSent,
  getCampaignStats,
  recordDelivery,
  getDeliveryHistory,
  getUndelivered,
  getLatestDelivery,
  getDeliveryStats,
  clearGuestDeliveries,
} from "../../src/services/outreach.js";

beforeEach(() => {
  _store.clear();
  vi.clearAllMocks();
});

// ── createCampaign ─────────────────────────────────────────────────────────

describe("createCampaign", () => {
  it("creates a campaign in draft status", () => {
    const id = createCampaign({ name: "Test", type: "whatsapp", guestIds: ["g1", "g2"] });
    const c = getCampaign(id);
    expect(c).not.toBeNull();
    expect(c.status).toBe("draft");
    expect(c.name).toBe("Test");
    expect(c.guestIds).toEqual(["g1", "g2"]);
  });

  it("initializes all guest results as pending", () => {
    const id = createCampaign({ name: "X", type: "whatsapp", guestIds: ["g1", "g2"] });
    const c = getCampaign(id);
    expect(c.results.g1).toBe("pending");
    expect(c.results.g2).toBe("pending");
  });

  it("returns unique ids for separate campaigns", () => {
    const id1 = createCampaign({ name: "A", type: "whatsapp", guestIds: [] });
    const id2 = createCampaign({ name: "B", type: "whatsapp", guestIds: [] });
    expect(id1).not.toBe(id2);
  });
});

// ── getCampaign ────────────────────────────────────────────────────────────

describe("getCampaign", () => {
  it("returns null for unknown id", () => {
    expect(getCampaign("nonexistent")).toBeNull();
  });

  it("returns campaign for known id", () => {
    const id = createCampaign({ name: "T", type: "whatsapp", guestIds: [] });
    expect(getCampaign(id)).not.toBeNull();
  });
});

// ── listCampaigns ──────────────────────────────────────────────────────────

describe("listCampaigns", () => {
  it("returns all campaigns when no filter", () => {
    createCampaign({ name: "A", type: "whatsapp", guestIds: [] });
    createCampaign({ name: "B", type: "whatsapp", guestIds: [] });
    expect(listCampaigns()).toHaveLength(2);
  });

  it("filters by status", () => {
    const id = createCampaign({ name: "A", type: "whatsapp", guestIds: [] });
    queueCampaign(id);
    createCampaign({ name: "B", type: "whatsapp", guestIds: [] }); // draft
    expect(listCampaigns("queued")).toHaveLength(1);
    expect(listCampaigns("draft")).toHaveLength(1);
  });
});

// ── deleteCampaign ─────────────────────────────────────────────────────────

describe("deleteCampaign", () => {
  it("deletes a draft campaign", () => {
    const id = createCampaign({ name: "T", type: "whatsapp", guestIds: [] });
    expect(deleteCampaign(id)).toBe(true);
    expect(getCampaign(id)).toBeNull();
  });

  it("returns false for non-existent campaign", () => {
    expect(deleteCampaign("ghost")).toBe(false);
  });

  it("refuses to delete a sending campaign", () => {
    const id = createCampaign({ name: "T", type: "whatsapp", guestIds: ["g1"] });
    queueCampaign(id);
    startCampaign(id);
    expect(deleteCampaign(id)).toBe(false);
  });
});

// ── Campaign state machine ─────────────────────────────────────────────────

describe("campaign state machine", () => {
  it("draft → queued via queueCampaign", () => {
    const id = createCampaign({ name: "T", type: "whatsapp", guestIds: [] });
    expect(queueCampaign(id)).toBe(true);
    expect(getCampaign(id).status).toBe("queued");
  });

  it("queued → sending via startCampaign", () => {
    const id = createCampaign({ name: "T", type: "whatsapp", guestIds: [] });
    queueCampaign(id);
    expect(startCampaign(id)).toBe(true);
    expect(getCampaign(id).status).toBe("sending");
  });

  it("draft → cancelled via cancelCampaign", () => {
    const id = createCampaign({ name: "T", type: "whatsapp", guestIds: [] });
    expect(cancelCampaign(id)).toBe(true);
    expect(getCampaign(id).status).toBe("cancelled");
  });

  it("queued → cancelled via cancelCampaign", () => {
    const id = createCampaign({ name: "T", type: "whatsapp", guestIds: [] });
    queueCampaign(id);
    expect(cancelCampaign(id)).toBe(true);
    expect(getCampaign(id).status).toBe("cancelled");
  });

  it("cannot queue a non-draft campaign", () => {
    const id = createCampaign({ name: "T", type: "whatsapp", guestIds: [] });
    queueCampaign(id);
    expect(queueCampaign(id)).toBe(false); // already queued
  });

  it("cannot start a non-queued campaign", () => {
    const id = createCampaign({ name: "T", type: "whatsapp", guestIds: [] });
    expect(startCampaign(id)).toBe(false); // still draft
  });
});

// ── recordSent ─────────────────────────────────────────────────────────────

describe("recordSent", () => {
  it("records a sent result", () => {
    const id = createCampaign({ name: "T", type: "whatsapp", guestIds: ["g1", "g2"] });
    queueCampaign(id);
    startCampaign(id);
    expect(recordSent(id, "g1", "sent")).toBe(true);
    expect(getCampaign(id).results.g1).toBe("sent");
  });

  it("transitions to completed when all results resolved", () => {
    const id = createCampaign({ name: "T", type: "whatsapp", guestIds: ["g1"] });
    queueCampaign(id);
    startCampaign(id);
    recordSent(id, "g1", "sent");
    expect(getCampaign(id).status).toBe("completed");
  });

  it("returns false for unknown guest", () => {
    const id = createCampaign({ name: "T", type: "whatsapp", guestIds: ["g1"] });
    queueCampaign(id);
    startCampaign(id);
    expect(recordSent(id, "ghost", "sent")).toBe(false);
  });
});

// ── getCampaignStats ───────────────────────────────────────────────────────

describe("getCampaignStats", () => {
  it("returns null for unknown campaign", () => {
    expect(getCampaignStats("ghost")).toBeNull();
  });

  it("counts sent/failed/pending correctly", () => {
    const id = createCampaign({ name: "T", type: "whatsapp", guestIds: ["g1", "g2", "g3"] });
    queueCampaign(id);
    startCampaign(id);
    recordSent(id, "g1", "sent");
    recordSent(id, "g2", "failed");
    const stats = getCampaignStats(id);
    expect(stats.total).toBe(3);
    expect(stats.sent).toBe(1);
    expect(stats.failed).toBe(1);
    expect(stats.pending).toBe(1);
  });
});

// ── Delivery tracking ──────────────────────────────────────────────────────

describe("recordDelivery + getDeliveryHistory", () => {
  it("records a delivery", () => {
    recordDelivery("g1", "whatsapp", "sent");
    const history = getDeliveryHistory("g1");
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe("sent");
  });

  it("returns empty history for unknown guest", () => {
    expect(getDeliveryHistory("ghost")).toHaveLength(0);
  });
});

describe("getUndelivered", () => {
  it("returns only failed and bounced records", () => {
    recordDelivery("g1", "whatsapp", "sent");
    recordDelivery("g2", "whatsapp", "failed");
    recordDelivery("g3", "email", "bounced");
    const undelivered = getUndelivered();
    expect(undelivered).toHaveLength(2);
    expect(undelivered.every((r) => r.status === "failed" || r.status === "bounced")).toBe(true);
  });
});

describe("getLatestDelivery", () => {
  it("returns a delivery record for guest+channel", () => {
    recordDelivery("g1", "whatsapp", "sent");
    const latest = getLatestDelivery("g1", "whatsapp");
    expect(latest?.status).toBe("sent");
    expect(latest?.guestId).toBe("g1");
    expect(latest?.channel).toBe("whatsapp");
  });

  it("returns undefined when no matching record", () => {
    expect(getLatestDelivery("ghost", "whatsapp")).toBeUndefined();
  });
});

describe("getDeliveryStats", () => {
  it("returns zeros for empty store", () => {
    const stats = getDeliveryStats();
    expect(stats.total).toBe(0);
    expect(stats.sent).toBe(0);
  });

  it("counts delivery statuses correctly", () => {
    recordDelivery("g1", "whatsapp", "sent");
    recordDelivery("g2", "whatsapp", "delivered");
    recordDelivery("g3", "whatsapp", "failed");
    const stats = getDeliveryStats();
    expect(stats.total).toBe(3);
    expect(stats.sent).toBe(1);
    expect(stats.delivered).toBe(1);
    expect(stats.failed).toBe(1);
  });
});

describe("clearGuestDeliveries", () => {
  it("removes all deliveries for a specific guest", () => {
    recordDelivery("g1", "whatsapp", "sent");
    recordDelivery("g2", "whatsapp", "sent");
    clearGuestDeliveries("g1");
    expect(getDeliveryHistory("g1")).toHaveLength(0);
    expect(getDeliveryHistory("g2")).toHaveLength(1);
  });
});
