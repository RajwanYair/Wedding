// tests/unit/checkin-kiosk-helpers.test.mjs — S643 Checkin kiosk helpers
import { describe, it, expect } from "vitest";
import {
  createSession,
  recordScan,
  recordFailedScan,
  setOnlineStatus,
  buildBadgeData,
  verifyQrPayload,
  verifyNfcPayload,
  bufferCheckin,
  flushBuffer,
  sessionStats,
} from "../../src/utils/checkin-kiosk.js";

describe("checkin-kiosk helpers", () => {
  describe("createSession", () => {
    it("creates session with defaults", () => {
      const s = createSession("k1");
      expect(s.kioskId).toBe("k1");
      expect(s.scansProcessed).toBe(0);
      expect(s.online).toBe(true);
    });
    it("uses default id when empty", () => {
      expect(createSession("").kioskId).toBe("kiosk_default");
    });
  });

  describe("recordScan / recordFailedScan", () => {
    it("increments scansProcessed", () => {
      const s = recordScan(createSession("k1"));
      expect(s.scansProcessed).toBe(1);
    });
    it("increments failedScans", () => {
      const s = recordFailedScan(createSession("k1"));
      expect(s.failedScans).toBe(1);
    });
  });

  describe("setOnlineStatus", () => {
    it("sets offline", () => {
      expect(setOnlineStatus(createSession("k1"), false).online).toBe(false);
    });
  });

  describe("buildBadgeData", () => {
    it("builds badge from guest", () => {
      const badge = buildBadgeData({ id: "g1", name: "Alice", table: 5, meal: "fish" });
      expect(badge.guestName).toBe("Alice");
      expect(badge.tableNumber).toBe(5);
      expect(badge.qrPayload).toBe("checkin:g1");
    });
    it("defaults missing fields", () => {
      const badge = buildBadgeData({ id: "g1", name: "Bob" });
      expect(badge.tableNumber).toBe(0);
      expect(badge.meal).toBe("");
    });
  });

  describe("verifyQrPayload", () => {
    const guestMap = new Map([["g1", { name: "Alice" }]]);
    it("validates known guest", () => {
      const r = verifyQrPayload("checkin:g1", guestMap);
      expect(r.valid).toBe(true);
      expect(r.guestName).toBe("Alice");
    });
    it("rejects unknown guest", () => {
      expect(verifyQrPayload("checkin:g99", guestMap).valid).toBe(false);
    });
    it("rejects invalid format", () => {
      expect(verifyQrPayload("badformat", guestMap).valid).toBe(false);
    });
  });

  describe("verifyNfcPayload", () => {
    const guestMap = new Map([["g1", { name: "Bob" }]]);
    it("validates known guest", () => {
      expect(verifyNfcPayload("g1", guestMap).valid).toBe(true);
    });
    it("rejects unknown", () => {
      expect(verifyNfcPayload("g99", guestMap).valid).toBe(false);
    });
  });

  describe("bufferCheckin / flushBuffer", () => {
    it("buffers checkin entries", () => {
      const buf = bufferCheckin([], "g1");
      expect(buf).toHaveLength(1);
      expect(buf[0].guestId).toBe("g1");
    });
    it("flushes buffer", () => {
      const buf = bufferCheckin([], "g1");
      const { items, buffer } = flushBuffer(buf);
      expect(items).toHaveLength(1);
      expect(buffer).toHaveLength(0);
    });
  });

  describe("sessionStats", () => {
    it("computes success rate", () => {
      let s = createSession("k1");
      s = recordScan(recordScan(recordFailedScan(s)));
      const stats = sessionStats(s);
      expect(stats.scansProcessed).toBe(2);
      expect(stats.failedScans).toBe(1);
      expect(stats.successRate).toBe(67);
    });
    it("handles null", () => {
      expect(sessionStats(null).successRate).toBe(0);
    });
  });
});
