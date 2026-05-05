// tests/unit/registry-thankyou.test.mjs — S635 Registry thank-you automation
import { describe, it, expect } from "vitest";
import {
  pendingThankYous,
  buildMessage,
  batchMessages,
  thankYouProgress,
  overdueThankYous,
} from "../../src/utils/registry-thankyou.js";

function makeGift(id, received = false, giverId, receivedAt) {
  return { id, name: `Gift ${id}`, price: 100, received, giverId, receivedAt };
}

describe("registry-thankyou", () => {
  describe("pendingThankYous", () => {
    it("returns received gifts that have not been thanked", () => {
      const gifts = [makeGift("g1", true, "u1"), makeGift("g2", true, "u2"), makeGift("g3")];
      const log = [{ giftId: "g1", giverId: "u1", sentAt: new Date().toISOString() }];
      const pending = pendingThankYous(gifts, log);
      expect(pending).toHaveLength(1);
      expect(pending[0].giftId).toBe("g2");
    });
    it("returns empty when all thanked", () => {
      const gifts = [makeGift("g1", true, "u1")];
      const log = [{ giftId: "g1", giverId: "u1", sentAt: new Date().toISOString() }];
      expect(pendingThankYous(gifts, log)).toHaveLength(0);
    });
    it("handles null log", () => {
      const gifts = [makeGift("g1", true, "u1")];
      expect(pendingThankYous(gifts, null)).toHaveLength(1);
    });
  });

  describe("buildMessage", () => {
    it("returns Hebrew message by default", () => {
      const msg = buildMessage("מנורה", "יאיר");
      expect(msg).toContain("יאיר");
      expect(msg).toContain("מנורה");
      expect(msg).toContain("תודה");
    });
    it("returns English message", () => {
      const msg = buildMessage("Vase", "John", "en");
      expect(msg).toContain("John");
      expect(msg).toContain("Vase");
      expect(msg).toContain("Thank you");
    });
    it("uses default guest name when no giver name", () => {
      expect(buildMessage("מתנה", undefined, "he")).toContain("אורח/ת");
      expect(buildMessage("Gift", undefined, "en")).toContain("Dear Guest");
    });
  });

  describe("batchMessages", () => {
    it("generates messages for all pending", () => {
      const gifts = [makeGift("g1", true, "u1"), makeGift("g2", true, "u2")];
      const batch = batchMessages(gifts, [], { u1: "Alice", u2: "Bob" }, "en");
      expect(batch).toHaveLength(2);
      expect(batch[0].message).toContain("Alice");
    });
    it("handles empty giver names", () => {
      const gifts = [makeGift("g1", true, "u1")];
      const batch = batchMessages(gifts, [], undefined, "en");
      expect(batch[0].message).toContain("Dear Guest");
    });
  });

  describe("thankYouProgress", () => {
    it("computes rate", () => {
      const gifts = [makeGift("g1", true, "u1"), makeGift("g2", true, "u2"), makeGift("g3")];
      const log = [{ giftId: "g1", giverId: "u1", sentAt: new Date().toISOString(), channel: "whatsapp" }];
      const progress = thankYouProgress(gifts, log);
      expect(progress.received).toBe(2);
      expect(progress.thanked).toBe(1);
      expect(progress.pending).toBe(1);
      expect(progress.rate).toBe(50);
      expect(progress.channels.whatsapp).toBe(1);
    });
    it("returns 0 rate when no gifts received", () => {
      expect(thankYouProgress([makeGift("g1")], []).rate).toBe(0);
    });
  });

  describe("overdueThankYous", () => {
    it("finds overdue gifts", () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000).toISOString();
      const gifts = [makeGift("g1", true, "u1", tenDaysAgo)];
      const overdue = overdueThankYous(gifts, [], 7, new Date());
      expect(overdue).toHaveLength(1);
      expect(overdue[0].daysSinceReceived).toBeGreaterThanOrEqual(10);
    });
    it("excludes recently received", () => {
      const yesterday = new Date(Date.now() - 86_400_000).toISOString();
      const gifts = [makeGift("g1", true, "u1", yesterday)];
      expect(overdueThankYous(gifts, [], 7, new Date())).toHaveLength(0);
    });
    it("excludes already thanked", () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000).toISOString();
      const gifts = [makeGift("g1", true, "u1", tenDaysAgo)];
      const log = [{ giftId: "g1", giverId: "u1", sentAt: new Date().toISOString() }];
      expect(overdueThankYous(gifts, log, 7, new Date())).toHaveLength(0);
    });
  });
});
