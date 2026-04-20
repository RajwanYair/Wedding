import { describe, it, expect } from "vitest";
import {
  CAMPAIGN_STATUSES,
  RECIPIENT_STATUSES,
  createCampaign,
  addCampaignRecipient,
  updateRecipientStatus,
  getCampaignStats,
  getDeliveryRate,
  getReadRate,
  filterByStatus,
  buildCampaignReport,
} from "../../src/utils/campaign-tracker.js";

// ── CAMPAIGN_STATUSES ─────────────────────────────────────────────────────

describe("CAMPAIGN_STATUSES", () => {
  it("is frozen", () => expect(Object.isFrozen(CAMPAIGN_STATUSES)).toBe(true));
  it("has DRAFT", () => expect(CAMPAIGN_STATUSES.DRAFT).toBe("draft"));
  it("has SENT", () => expect(CAMPAIGN_STATUSES.SENT).toBe("sent"));
});

// ── RECIPIENT_STATUSES ────────────────────────────────────────────────────

describe("RECIPIENT_STATUSES", () => {
  it("is frozen", () => expect(Object.isFrozen(RECIPIENT_STATUSES)).toBe(true));
  it("has PENDING", () => expect(RECIPIENT_STATUSES.PENDING).toBe("pending"));
  it("has READ", () => expect(RECIPIENT_STATUSES.READ).toBe("read"));
});

// ── createCampaign ────────────────────────────────────────────────────────

describe("createCampaign()", () => {
  it("returns null for missing name", () => expect(createCampaign({ message: "Hi" })).toBeNull());
  it("returns null for missing message", () => expect(createCampaign({ name: "WA blast" })).toBeNull());

  it("creates campaign with draft status", () => {
    const c = createCampaign({ name: "Save the date", message: "Join us!" });
    expect(c.id).toMatch(/^campaign_/);
    expect(c.status).toBe(CAMPAIGN_STATUSES.DRAFT);
    expect(c.recipients).toEqual([]);
  });

  it("stores scheduledAt as ISO string", () => {
    const c = createCampaign({ name: "Reminder", message: "Hi", scheduledAt: "2025-06-01T10:00:00Z" });
    expect(c.scheduledAt).toMatch(/^2025-06-01/);
  });

  it("sets scheduledAt null when omitted", () => {
    const c = createCampaign({ name: "X", message: "Y" });
    expect(c.scheduledAt).toBeNull();
  });
});

// ── addCampaignRecipient ──────────────────────────────────────────────────

describe("addCampaignRecipient()", () => {
  it("returns null for missing guestId", () => {
    const c = createCampaign({ name: "A", message: "B" });
    expect(addCampaignRecipient(c, { phone: "0541234567" })).toBeNull();
  });

  it("returns null for null campaign", () => {
    expect(addCampaignRecipient(null, { guestId: "g1", phone: "0541234567" })).toBeNull();
  });

  it("adds recipient with pending status", () => {
    const c = createCampaign({ name: "A", message: "B" });
    const updated = addCampaignRecipient(c, { guestId: "g1", phone: "0541234567", name: "Sara" });
    expect(updated.recipients).toHaveLength(1);
    expect(updated.recipients[0].status).toBe(RECIPIENT_STATUSES.PENDING);
  });

  it("does not mutate original campaign", () => {
    const c = createCampaign({ name: "A", message: "B" });
    addCampaignRecipient(c, { guestId: "g1", phone: "054" });
    expect(c.recipients).toHaveLength(0);
  });
});

// ── updateRecipientStatus ─────────────────────────────────────────────────

describe("updateRecipientStatus()", () => {
  it("returns null for invalid status", () => {
    const c = createCampaign({ name: "A", message: "B" });
    const c2 = addCampaignRecipient(c, { guestId: "g1", phone: "054" });
    expect(updateRecipientStatus(c2, "g1", "bounced")).toBeNull();
  });

  it("updates matching recipient", () => {
    const c = createCampaign({ name: "A", message: "B" });
    const c2 = addCampaignRecipient(c, { guestId: "g1", phone: "054" });
    const c3 = updateRecipientStatus(c2, "g1", "delivered", { deliveredAt: "2025-06-01T12:00:00Z" });
    expect(c3.recipients[0].status).toBe("delivered");
    expect(c3.recipients[0].deliveredAt).toBe("2025-06-01T12:00:00Z");
  });

  it("does not mutate original campaign", () => {
    const c = createCampaign({ name: "A", message: "B" });
    const c2 = addCampaignRecipient(c, { guestId: "g1", phone: "054" });
    updateRecipientStatus(c2, "g1", "read");
    expect(c2.recipients[0].status).toBe("pending");
  });
});

// ── getCampaignStats ──────────────────────────────────────────────────────

describe("getCampaignStats()", () => {
  it("returns zeroes for null campaign", () => {
    const s = getCampaignStats(null);
    expect(s.total).toBe(0);
  });

  it("counts statuses correctly", () => {
    let c = createCampaign({ name: "A", message: "B" });
    c = addCampaignRecipient(c, { guestId: "g1", phone: "111" });
    c = addCampaignRecipient(c, { guestId: "g2", phone: "222" });
    c = updateRecipientStatus(c, "g1", "delivered");
    c = updateRecipientStatus(c, "g2", "read");
    const s = getCampaignStats(c);
    expect(s.total).toBe(2);
    expect(s.delivered).toBe(1);
    expect(s.read).toBe(1);
    expect(s.pending).toBe(0);
  });
});

// ── getDeliveryRate ───────────────────────────────────────────────────────

describe("getDeliveryRate()", () => {
  it("returns 0 for empty campaign", () => {
    const c = createCampaign({ name: "A", message: "B" });
    expect(getDeliveryRate(c)).toBe(0);
  });

  it("calculates (delivered + read) / total", () => {
    let c = createCampaign({ name: "A", message: "B" });
    c = addCampaignRecipient(c, { guestId: "g1", phone: "1" });
    c = addCampaignRecipient(c, { guestId: "g2", phone: "2" });
    c = addCampaignRecipient(c, { guestId: "g3", phone: "3" });
    c = addCampaignRecipient(c, { guestId: "g4", phone: "4" });
    c = updateRecipientStatus(c, "g1", "delivered");
    c = updateRecipientStatus(c, "g2", "read");
    expect(getDeliveryRate(c)).toBeCloseTo(0.5);
  });
});

// ── getReadRate ───────────────────────────────────────────────────────────

describe("getReadRate()", () => {
  it("returns 0 for empty campaign", () => {
    expect(getReadRate(createCampaign({ name: "A", message: "B" }))).toBe(0);
  });

  it("returns read / total", () => {
    let c = createCampaign({ name: "A", message: "B" });
    c = addCampaignRecipient(c, { guestId: "g1", phone: "1" });
    c = addCampaignRecipient(c, { guestId: "g2", phone: "2" });
    c = updateRecipientStatus(c, "g1", "read");
    expect(getReadRate(c)).toBeCloseTo(0.5);
  });
});

// ── filterByStatus ────────────────────────────────────────────────────────

describe("filterByStatus()", () => {
  it("returns empty array for null campaign", () => expect(filterByStatus(null, "read")).toEqual([]));

  it("returns only matching recipients", () => {
    let c = createCampaign({ name: "A", message: "B" });
    c = addCampaignRecipient(c, { guestId: "g1", phone: "1" });
    c = addCampaignRecipient(c, { guestId: "g2", phone: "2" });
    c = updateRecipientStatus(c, "g2", "read");
    const reads = filterByStatus(c, "read");
    expect(reads).toHaveLength(1);
    expect(reads[0].guestId).toBe("g2");
  });
});

// ── buildCampaignReport ───────────────────────────────────────────────────

describe("buildCampaignReport()", () => {
  it("returns null for null campaign", () => expect(buildCampaignReport(null)).toBeNull());

  it("includes deliveryRate as percentage", () => {
    let c = createCampaign({ name: "A", message: "B" });
    c = addCampaignRecipient(c, { guestId: "g1", phone: "1" });
    c = updateRecipientStatus(c, "g1", "delivered");
    const report = buildCampaignReport(c);
    expect(report.deliveryRate).toBe(100);
    expect(report.name).toBe("A");
  });
});
