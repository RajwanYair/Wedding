/**
 * tests/unit/audit-retention.test.mjs — S456: coverage for audit-retention.js
 */
import { describe, it, expect } from "vitest";
import {
  pruneAuditLog,
  countExpired,
  summariseByAction,
} from "../../src/utils/audit-retention.js";

const NOW = new Date("2026-07-01T00:00:00Z").getTime();
const DAY = 24 * 60 * 60 * 1000;

describe("audit-retention — pruneAuditLog", () => {
  it("keeps entries within the retention window", () => {
    const entries = [
      { ts: NOW - 5 * DAY, action: "a" },
      { ts: NOW - 1 * DAY, action: "b" },
    ];
    expect(pruneAuditLog(entries, 30, NOW)).toHaveLength(2);
  });

  it("removes entries older than the retention window", () => {
    const entries = [
      { ts: NOW - 31 * DAY, action: "old" },
      { ts: NOW - 1 * DAY, action: "new" },
    ];
    const pruned = pruneAuditLog(entries, 30, NOW);
    expect(pruned).toHaveLength(1);
    expect(pruned[0].action).toBe("new");
  });

  it("accepts ISO-string timestamps", () => {
    const entries = [
      { ts: new Date(NOW - 1 * DAY).toISOString(), action: "iso" },
      { ts: new Date(NOW - 90 * DAY).toISOString(), action: "old" },
    ];
    const pruned = pruneAuditLog(entries, 30, NOW);
    expect(pruned).toHaveLength(1);
  });

  it("drops entries with missing/unparseable timestamps", () => {
    const entries = [
      { action: "no-ts" },
      { ts: "not-a-date", action: "bad" },
      { ts: NOW, action: "good" },
    ];
    expect(pruneAuditLog(entries, 30, NOW)).toEqual([{ ts: NOW, action: "good" }]);
  });

  it("returns a copy when days <= 0 (no-op)", () => {
    const entries = [{ ts: NOW, action: "a" }];
    const result = pruneAuditLog(entries, 0, NOW);
    expect(result).toEqual(entries);
    expect(result).not.toBe(entries);
  });

  it("handles non-array input safely", () => {
    expect(pruneAuditLog(null, 30, NOW)).toEqual([]);
    expect(pruneAuditLog(undefined, 30, NOW)).toEqual([]);
  });
});

describe("audit-retention — countExpired", () => {
  it("counts entries that would be pruned", () => {
    const entries = [
      { ts: NOW - 365 * DAY },
      { ts: NOW - 100 * DAY },
      { ts: NOW - 10 * DAY },
    ];
    expect(countExpired(entries, 30, NOW)).toBe(2);
  });

  it("returns 0 for empty/invalid input", () => {
    expect(countExpired([], 30, NOW)).toBe(0);
    expect(countExpired(null, 30, NOW)).toBe(0);
  });
});

describe("audit-retention — summariseByAction", () => {
  it("counts entries per action", () => {
    const entries = [
      { action: "login" },
      { action: "login" },
      { action: "delete_guest" },
      {},
    ];
    expect(summariseByAction(entries)).toEqual({
      login: 2,
      delete_guest: 1,
      unknown: 1,
    });
  });

  it("returns empty object for non-array input", () => {
    expect(summariseByAction(null)).toEqual({});
  });
});
