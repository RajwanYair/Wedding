import { describe, it, expect } from "vitest";
import {
  statusDistribution,
  responseRate,
  confirmedHeadcount,
  responsesByDate,
  dailyVelocity,
  predictCompletionDays,
  pendingGuestIds,
  responseFunnel,
  rsvpSummary,
} from "../../src/utils/rsvp-analytics.js";

const now = new Date().toISOString();
const yesterday = new Date(Date.now() - 86400000).toISOString();

/** @type {import("../../src/utils/rsvp-analytics.js").RsvpResponse[]} */
const SAMPLE = [
  { guestId: "g1", status: "confirmed", respondedAt: now, partySize: 2 },
  { guestId: "g2", status: "confirmed", respondedAt: yesterday, partySize: 3 },
  { guestId: "g3", status: "declined", respondedAt: now },
  { guestId: "g4", status: "pending", respondedAt: "" },
  { guestId: "g5", status: "maybe", respondedAt: now },
];

describe("rsvp-analytics-trends", () => {
  describe("statusDistribution", () => {
    it("counts each status", () => {
      const dist = statusDistribution(SAMPLE);
      expect(dist.confirmed).toBe(2);
      expect(dist.declined).toBe(1);
      expect(dist.pending).toBe(1);
      expect(dist.maybe).toBe(1);
      expect(dist.total).toBe(5);
    });

    it("returns zeros for non-array", () => {
      expect(statusDistribution(null).total).toBe(0);
    });
  });

  describe("responseRate", () => {
    it("calculates percentage of non-pending", () => {
      expect(responseRate(SAMPLE)).toBe(80);
    });

    it("returns 0 for empty", () => {
      expect(responseRate([])).toBe(0);
    });
  });

  describe("confirmedHeadcount", () => {
    it("sums party sizes for confirmed guests", () => {
      expect(confirmedHeadcount(SAMPLE)).toBe(5);
    });

    it("defaults partySize to 1", () => {
      const responses = [{ guestId: "g1", status: "confirmed", respondedAt: now }];
      expect(confirmedHeadcount(responses)).toBe(1);
    });
  });

  describe("responsesByDate", () => {
    it("groups responses by date", () => {
      const byDate = responsesByDate(SAMPLE);
      const todayKey = now.slice(0, 10);
      expect(byDate[todayKey]).toBeGreaterThanOrEqual(2);
    });

    it("returns empty for non-array", () => {
      expect(responsesByDate(null)).toEqual({});
    });
  });

  describe("dailyVelocity", () => {
    it("calculates daily velocity", () => {
      const velocity = dailyVelocity(SAMPLE, 7);
      expect(velocity).toBeGreaterThanOrEqual(0);
    });

    it("returns 0 for empty", () => {
      expect(dailyVelocity([], 7)).toBe(0);
    });
  });

  describe("predictCompletionDays", () => {
    it("returns 0 when no pending", () => {
      const all = [{ guestId: "g1", status: "confirmed", respondedAt: now }];
      expect(predictCompletionDays(all)).toBe(0);
    });

    it("returns null when velocity is 0", () => {
      const old = [{ guestId: "g1", status: "pending", respondedAt: "" }];
      expect(predictCompletionDays(old)).toBeNull();
    });

    it("returns null for non-array", () => {
      expect(predictCompletionDays(null)).toBeNull();
    });
  });

  describe("pendingGuestIds", () => {
    it("returns IDs of pending guests", () => {
      expect(pendingGuestIds(SAMPLE)).toEqual(["g4"]);
    });

    it("returns empty for non-array", () => {
      expect(pendingGuestIds(null)).toEqual([]);
    });
  });

  describe("responseFunnel", () => {
    it("builds response funnel", () => {
      const funnel = responseFunnel(SAMPLE);
      expect(funnel.invited).toBe(5);
      expect(funnel.responded).toBe(4);
      expect(funnel.confirmed).toBe(2);
    });
  });

  describe("rsvpSummary", () => {
    it("returns full summary object", () => {
      const summary = rsvpSummary(SAMPLE);
      expect(summary.distribution.total).toBe(5);
      expect(summary.rate).toBe(80);
      expect(summary.headcount).toBe(5);
      expect(summary.funnel.invited).toBe(5);
    });
  });
});
