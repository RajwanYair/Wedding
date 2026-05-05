// tests/unit/whatsapp-scheduler.test.mjs — S642 WhatsApp scheduler + A/B
import { describe, it, expect, beforeEach } from "vitest";
import {
  scheduleMessage,
  resetIdCounter,
  createAbTest,
  markSent,
  markDelivered,
  markFailed,
  cancelMessage,
  getReadyToSend,
  abStats,
  queueSummary,
} from "../../src/utils/whatsapp-scheduler.js";

beforeEach(() => resetIdCounter());

describe("whatsapp-scheduler", () => {
  describe("scheduleMessage", () => {
    it("creates queued message", () => {
      const m = scheduleMessage("972541234567", "tpl1", "2026-06-01T10:00:00Z");
      expect(m.id).toBe("sched_1");
      expect(m.status).toBe("queued");
      expect(m.variant).toBe("control");
    });
    it("accepts variant", () => {
      expect(scheduleMessage("972541234567", "tpl1", "2026-06-01", "A").variant).toBe("A");
    });
  });

  describe("createAbTest", () => {
    it("splits evenly by default", () => {
      const phones = ["1", "2", "3", "4"];
      const { a, b } = createAbTest(phones, "tplA", "tplB", "2026-06-01");
      expect(a).toHaveLength(2);
      expect(b).toHaveLength(2);
      expect(a[0].variant).toBe("A");
      expect(b[0].variant).toBe("B");
    });
    it("respects split ratio", () => {
      const { a, b } = createAbTest(["1", "2", "3", "4", "5"], "tplA", "tplB", "2026-06-01", 80);
      expect(a).toHaveLength(4);
      expect(b).toHaveLength(1);
    });
  });

  describe("markSent", () => {
    it("transitions queued to sent", () => {
      const m = scheduleMessage("1", "t", "2026-06-01");
      expect(markSent(m).status).toBe("sent");
    });
    it("no-op for non-queued", () => {
      const m = markSent(scheduleMessage("1", "t", "2026-06-01"));
      expect(markSent(m).status).toBe("sent");
    });
  });

  describe("markDelivered", () => {
    it("transitions sent to delivered", () => {
      const m = markSent(scheduleMessage("1", "t", "2026-06-01"));
      expect(markDelivered(m).status).toBe("delivered");
    });
  });

  describe("markFailed", () => {
    it("marks queued as failed", () => {
      const m = scheduleMessage("1", "t", "2026-06-01");
      const f = markFailed(m, "invalid phone");
      expect(f.status).toBe("failed");
      expect(f.failReason).toBe("invalid phone");
    });
  });

  describe("cancelMessage", () => {
    it("cancels queued", () => {
      expect(cancelMessage(scheduleMessage("1", "t", "2026-06-01")).status).toBe("cancelled");
    });
    it("no-op for sent", () => {
      const m = markSent(scheduleMessage("1", "t", "2026-06-01"));
      expect(cancelMessage(m).status).toBe("sent");
    });
  });

  describe("getReadyToSend", () => {
    it("returns queued messages past scheduled time", () => {
      const queue = [
        scheduleMessage("1", "t", "2025-01-01"),
        scheduleMessage("2", "t", "2099-01-01"),
      ];
      expect(getReadyToSend(queue, new Date("2026-06-01"))).toHaveLength(1);
    });
  });

  describe("abStats", () => {
    it("computes per-variant stats", () => {
      const msgs = [
        markDelivered(markSent(scheduleMessage("1", "tA", "2026-06-01", "A"))),
        markSent(scheduleMessage("2", "tA", "2026-06-01", "A")),
        markFailed(scheduleMessage("3", "tB", "2026-06-01", "B"), "err"),
      ];
      const stats = abStats(msgs);
      expect(stats).toHaveLength(2);
      const aStats = stats.find((s) => s.variant === "A");
      expect(aStats.total).toBe(2);
      expect(aStats.delivered).toBe(1);
      expect(aStats.deliveryRate).toBe(50);
    });
  });

  describe("queueSummary", () => {
    it("counts by status", () => {
      const queue = [
        scheduleMessage("1", "t", "2026-06-01"),
        markSent(scheduleMessage("2", "t", "2026-06-01")),
        cancelMessage(scheduleMessage("3", "t", "2026-06-01")),
      ];
      const s = queueSummary(queue);
      expect(s.total).toBe(3);
      expect(s.queued).toBe(1);
      expect(s.sent).toBe(1);
      expect(s.cancelled).toBe(1);
    });
    it("handles empty", () => {
      expect(queueSummary([]).total).toBe(0);
    });
  });
});
