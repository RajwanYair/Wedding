/**
 * S725 integration tests — Badge printer wired into checkin.js
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore } from "../../src/core/store.js";

vi.mock("../../src/core/sync.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(),
}));
vi.mock("../../src/core/ui.js", () => ({ showToast: vi.fn(), announce: vi.fn() }));
vi.mock("../../src/services/security.js", () => ({
  isNFCSupported: vi.fn(() => false),
  startNFCScan: vi.fn(),
}));

beforeEach(() => {
  initStore({});
});

import {
  buildBadgeLayout,
  formatBadgeText,
  createBadgePrintJob,
  batchBadgePrintJobs,
  markBadgePrinting,
  markBadgeDone,
  markBadgeFailed,
  getBadgeQueueStats,
  filterBadgesByStatus,
  resetBadgeJobCounter,
} from "../../src/sections/checkin.js";

beforeEach(() => {
  resetBadgeJobCounter();
});

describe("S725 -- buildBadgeLayout", () => {
  it("builds a badge layout with guest name", () => {
    const badge = buildBadgeLayout({ name: "Moshe Cohen" });
    expect(badge.guestName).toBe("Moshe Cohen");
    expect(badge).toHaveProperty("widthMm");
    expect(badge).toHaveProperty("heightMm");
  });

  it("includes table name when provided", () => {
    const badge = buildBadgeLayout({ name: "Yael", tableName: "Table 1" });
    expect(badge.tableName).toBe("Table 1");
  });

  it("uses tableNumber as fallback for tableName", () => {
    const badge = buildBadgeLayout({ name: "Dan", tableNumber: 5 });
    expect(badge.tableName).toBe("5");
  });
});

describe("S725 -- formatBadgeText", () => {
  it("returns a non-empty string for a valid badge", () => {
    const badge = buildBadgeLayout({ name: "Rivka", tableName: "Table 3", meal: "vegetarian" });
    const text = formatBadgeText(badge);
    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0);
  });
});

describe("S725 -- createBadgePrintJob", () => {
  it("creates a print job with id and queued status", () => {
    const badge = buildBadgeLayout({ name: "Shlomo" });
    const job = createBadgePrintJob(badge);
    expect(job).toHaveProperty("id");
    expect(job.status).toBe("queued");
    expect(job).toHaveProperty("createdAt");
  });
});

describe("S725 -- batchBadgePrintJobs", () => {
  it("creates one job per guest", () => {
    const guests = [
      { name: "Alice", tableName: "A" },
      { name: "Bob", tableName: "B" },
    ];
    const jobs = batchBadgePrintJobs(guests, {});
    expect(jobs.length).toBe(2);
    jobs.forEach((j) => expect(j.status).toBe("queued"));
  });
});

describe("S725 -- markBadgePrinting / markBadgeDone / markBadgeFailed", () => {
  it("transitions job through printing -> done", () => {
    const badge = buildBadgeLayout({ name: "Levi" });
    let job = createBadgePrintJob(badge);
    job = markBadgePrinting(job);
    expect(job.status).toBe("printing");
    job = markBadgeDone(job);
    expect(job.status).toBe("done");
  });

  it("transitions job to failed", () => {
    const badge = buildBadgeLayout({ name: "Ora" });
    let job = createBadgePrintJob(badge);
    job = markBadgeFailed(job);
    expect(job.status).toBe("failed");
  });
});

describe("S725 -- getBadgeQueueStats", () => {
  it("counts jobs by status", () => {
    const guests = [{ name: "A" }, { name: "B" }, { name: "C" }];
    let jobs = batchBadgePrintJobs(guests, {});
    jobs[0] = markBadgeDone(markBadgePrinting(jobs[0]));
    jobs[1] = markBadgeFailed(jobs[1]);
    const stats = getBadgeQueueStats(jobs);
    expect(stats.total).toBe(3);
    expect(stats.done).toBe(1);
    expect(stats.failed).toBe(1);
  });
});

describe("S725 -- filterBadgesByStatus", () => {
  it("filters jobs by status", () => {
    const guests = [{ name: "X" }, { name: "Y" }];
    let jobs = batchBadgePrintJobs(guests, {});
    jobs[0] = markBadgeDone(markBadgePrinting(jobs[0]));
    const done = filterBadgesByStatus(jobs, "done");
    expect(done.length).toBe(1);
    expect(done[0].status).toBe("done");
  });
});
