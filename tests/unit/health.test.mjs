/**
 * tests/unit/health.test.mjs
 *
 * Unit tests for src/services/health.js
 * Tests: captureHealthError, getHealthReport (status/warnings/counts),
 *        resetHealthState, offline queue integration.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mock offline-queue ────────────────────────────────────────────────────
vi.mock("../../src/services/offline-queue.js", () => ({
  getQueueStats: vi.fn(() => ({ total: 0, exhausted: 0, oldestAddedAt: null })),
}));

let captureHealthError, getHealthReport, resetHealthState;

beforeEach(async () => {
  vi.resetAllMocks();
  vi.resetModules();
  ({ captureHealthError, getHealthReport, resetHealthState } =
    await import("../../src/services/health.js"));
  resetHealthState();
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe("health — getHealthReport initial", () => {
  it("returns healthy status when no errors exist", () => {
    const report = getHealthReport();
    expect(report.status).toBe("healthy");
    expect(report.errors).toBe(0);
    expect(report.warnings).toHaveLength(0);
  });

  it("includes offlineQueue from getQueueStats", () => {
    const report = getHealthReport();
    expect(report.offlineQueue).toEqual({ total: 0, exhausted: 0, oldestAddedAt: null });
  });
});

describe("health — captureHealthError", () => {
  it("increments error count", () => {
    captureHealthError(new Error("test error"));
    expect(getHealthReport().errors).toBe(1);
  });

  it("stores error message in recentErrors", () => {
    captureHealthError(new Error("boom"), "ctx1");
    const report = getHealthReport();
    expect(report.recentErrors[0].msg).toBe("boom");
    expect(report.recentErrors[0].context).toBe("ctx1");
  });

  it("accepts string errors", () => {
    captureHealthError("string error");
    expect(getHealthReport().recentErrors[0].msg).toBe("string error");
  });

  it("only keeps last 10 in recentErrors", () => {
    for (let i = 0; i < 15; i++) captureHealthError(`err ${i}`);
    expect(getHealthReport().recentErrors).toHaveLength(10);
    expect(getHealthReport().recentErrors[9].msg).toBe("err 14");
  });
});

describe("health — status transitions", () => {
  it("changes to degraded when error count > 5", () => {
    for (let i = 0; i < 6; i++) captureHealthError(`err ${i}`);
    expect(getHealthReport().status).toBe("degraded");
  });

  it("changes to critical when error count > 10", () => {
    for (let i = 0; i < 11; i++) captureHealthError(`err ${i}`);
    expect(getHealthReport().status).toBe("critical");
  });

  it("adds warning for exhausted offline items", async () => {
    const { getQueueStats } = await import("../../src/services/offline-queue.js");
    getQueueStats.mockReturnValue({ total: 0, exhausted: 2, oldestAddedAt: null });
    const report = getHealthReport();
    expect(report.warnings).toContain("2 offline items exhausted (dropped)");
    expect(report.status).toBe("degraded");
  });

  it("adds warning for large offline queue", async () => {
    const { getQueueStats } = await import("../../src/services/offline-queue.js");
    getQueueStats.mockReturnValue({ total: 11, exhausted: 0, oldestAddedAt: null });
    const report = getHealthReport();
    expect(report.warnings.some((w) => w.includes("pending"))).toBe(true);
  });
});

describe("health — resetHealthState", () => {
  it("clears all captured errors", () => {
    captureHealthError("error 1");
    captureHealthError("error 2");
    resetHealthState();
    expect(getHealthReport().errors).toBe(0);
  });

  it("restores healthy status after reset", () => {
    for (let i = 0; i < 12; i++) captureHealthError(`e ${i}`);
    resetHealthState();
    expect(getHealthReport().status).toBe("healthy");
  });
});
