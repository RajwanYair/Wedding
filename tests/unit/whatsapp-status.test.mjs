import { describe, it, expect } from "vitest";
import {
  WA_STATUS,
  isDelivered,
  isRead,
  isFailed,
  parseStatusWebhook,
  buildStatusTimeline,
  getLatestStatus,
  summarizeStatuses,
} from "../../src/utils/whatsapp-status.js";

// ── WA_STATUS ─────────────────────────────────────────────────────────────

describe("WA_STATUS", () => {
  it("is frozen", () => expect(Object.isFrozen(WA_STATUS)).toBe(true));
  it("has PENDING", () => expect(WA_STATUS.PENDING).toBe("pending"));
  it("has READ", () => expect(WA_STATUS.READ).toBe("read"));
  it("has FAILED", () => expect(WA_STATUS.FAILED).toBe("failed"));
});

// ── Predicates ────────────────────────────────────────────────────────────

describe("isDelivered()", () => {
  it("returns true for delivered", () => expect(isDelivered("delivered")).toBe(true));
  it("returns true for read (super-delivered)", () => expect(isDelivered("read")).toBe(true));
  it("returns false for sent", () => expect(isDelivered("sent")).toBe(false));
  it("returns false for failed", () => expect(isDelivered("failed")).toBe(false));
});

describe("isRead()", () => {
  it("returns true for read", () => expect(isRead("read")).toBe(true));
  it("returns false for delivered", () => expect(isRead("delivered")).toBe(false));
});

describe("isFailed()", () => {
  it("returns true for failed", () => expect(isFailed("failed")).toBe(true));
  it("returns false for delivered", () => expect(isFailed("delivered")).toBe(false));
});

// ── parseStatusWebhook ────────────────────────────────────────────────────

describe("parseStatusWebhook()", () => {
  it("returns null for non-object", () => expect(parseStatusWebhook(null)).toBeNull());
  it("returns null for missing id", () => expect(parseStatusWebhook({ status: "sent" })).toBeNull());
  it("returns null for missing status", () => expect(parseStatusWebhook({ id: "msg1" })).toBeNull());

  it("parses valid payload", () => {
    const result = parseStatusWebhook({
      id: "msg1",
      status: "delivered",
      timestamp: "1717228800",
      recipient_id: "+972541234567",
    });
    expect(result.messageId).toBe("msg1");
    expect(result.status).toBe("delivered");
    expect(result.recipientId).toBe("+972541234567");
    expect(result.timestamp).toMatch(/^2024/);
  });

  it("defaults unknown status to failed", () => {
    const result = parseStatusWebhook({ id: "m1", status: "bounced" });
    expect(result.status).toBe("failed");
  });

  it("sets errors to empty array when absent", () => {
    const result = parseStatusWebhook({ id: "m1", status: "sent" });
    expect(result.errors).toEqual([]);
  });
});

// ── buildStatusTimeline ───────────────────────────────────────────────────

describe("buildStatusTimeline()", () => {
  it("returns empty array for non-array", () => expect(buildStatusTimeline(null)).toEqual([]));

  it("sorts by timestamp ascending", () => {
    const s1 = parseStatusWebhook({ id: "m1", status: "delivered", timestamp: "1717228900" });
    const s2 = parseStatusWebhook({ id: "m1", status: "sent", timestamp: "1717228800" });
    const timeline = buildStatusTimeline([s1, s2]);
    expect(timeline[0].status).toBe("sent");
    expect(timeline[1].status).toBe("delivered");
  });

  it("places null timestamps last", () => {
    const s1 = { messageId: "m1", status: "read", timestamp: null };
    const s2 = parseStatusWebhook({ id: "m1", status: "sent", timestamp: "1717228800" });
    const timeline = buildStatusTimeline([s1, s2]);
    expect(timeline[0].status).toBe("sent");
  });

  it("does not mutate original array", () => {
    const s1 = parseStatusWebhook({ id: "m1", status: "delivered", timestamp: "1717228900" });
    const s2 = parseStatusWebhook({ id: "m1", status: "sent", timestamp: "1717228800" });
    const original = [s1, s2];
    buildStatusTimeline(original);
    expect(original[0].status).toBe("delivered");
  });
});

// ── getLatestStatus ───────────────────────────────────────────────────────

describe("getLatestStatus()", () => {
  it("returns pending for empty list", () => expect(getLatestStatus([])).toBe("pending"));
  it("returns failed if present regardless of order", () => {
    expect(getLatestStatus(["delivered", "failed", "read"])).toBe("failed");
  });
  it("returns read over delivered", () => {
    expect(getLatestStatus(["sent", "delivered", "read"])).toBe("read");
  });
  it("returns delivered over sent", () => {
    expect(getLatestStatus(["sent", "delivered"])).toBe("delivered");
  });
  it("returns pending for non-array", () => expect(getLatestStatus(null)).toBe("pending"));
});

// ── summarizeStatuses ─────────────────────────────────────────────────────

describe("summarizeStatuses()", () => {
  it("returns zeroes for non-array", () => {
    const s = summarizeStatuses(null);
    expect(s.total).toBe(0);
    expect(s.deliveryRate).toBe(0);
  });

  it("counts each status", () => {
    const s = summarizeStatuses(["sent", "delivered", "read", "failed", "pending"]);
    expect(s.total).toBe(5);
    expect(s.sent).toBe(1);
    expect(s.delivered).toBe(1);
    expect(s.read).toBe(1);
    expect(s.failed).toBe(1);
  });

  it("calculates deliveryRate as (delivered + read) / total", () => {
    const s = summarizeStatuses(["delivered", "read", "pending", "pending"]);
    expect(s.deliveryRate).toBeCloseTo(0.5);
  });

  it("calculates readRate as read / total", () => {
    const s = summarizeStatuses(["read", "delivered", "delivered", "delivered"]);
    expect(s.readRate).toBeCloseTo(0.25);
  });
});
