/**
 * tests/unit/sheets.test.mjs — Unit tests for src/services/sheets.js (S6.5)
 * Covers: enqueueWrite debouncing, mergeLastWriteWins, syncStatus, onSyncStatus
 *
 * Network calls (sheetsPost) are NOT made — SHEETS_WEBAPP_URL is unset in tests.
 *
 * Run: npm test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { enqueueWrite, onSyncStatus, syncStatus, mergeLastWriteWins } from "../../src/services/sheets.js";

beforeEach(() => {
  vi.useFakeTimers();
});

// ── enqueueWrite ──────────────────────────────────────────────────────────────
describe("enqueueWrite", () => {
  it("calls syncFn after the debounce delay", async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    enqueueWrite("testKey", fn);
    expect(fn).not.toHaveBeenCalled(); // not yet
    await vi.runAllTimersAsync();
    expect(fn).toHaveBeenCalledOnce();
  });

  it("debounces multiple calls — only the last fn runs", async () => {
    const fn1 = vi.fn().mockResolvedValue(undefined);
    const fn2 = vi.fn().mockResolvedValue(undefined);
    enqueueWrite("debounceKey", fn1);
    enqueueWrite("debounceKey", fn2); // replaces fn1
    await vi.runAllTimersAsync();
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledOnce();
  });

  it("independent keys run independently", async () => {
    const fn1 = vi.fn().mockResolvedValue(undefined);
    const fn2 = vi.fn().mockResolvedValue(undefined);
    enqueueWrite("keyA", fn1);
    enqueueWrite("keyB", fn2);
    await vi.runAllTimersAsync();
    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).toHaveBeenCalledOnce();
  });
});

// ── syncStatus / onSyncStatus ─────────────────────────────────────────────────
describe("syncStatus / onSyncStatus", () => {
  it("returns a string", () => {
    expect(typeof syncStatus()).toBe("string");
  });

  it("onSyncStatus registers a listener (no throw)", () => {
    expect(() => onSyncStatus(() => {})).not.toThrow();
  });
});

// ── mergeLastWriteWins ────────────────────────────────────────────────────────
describe("mergeLastWriteWins", () => {
  const makeRecord = (id, updatedAt, extra = {}) => ({ id, updatedAt, ...extra });

  it("keeps local-only records", () => {
    const local = [makeRecord("a", "2025-01-01"), makeRecord("b", "2025-01-02")];
    const remote = [makeRecord("a", "2025-01-01")];
    const merged = mergeLastWriteWins(local, remote);
    const ids = merged.map((r) => r.id);
    expect(ids).toContain("b");
  });

  it("remote wins when newer", () => {
    const local = [makeRecord("x", "2024-01-01", { name: "old" })];
    const remote = [makeRecord("x", "2025-06-01", { name: "new" })];
    const merged = mergeLastWriteWins(local, remote);
    expect(merged.find((r) => r.id === "x")?.name).toBe("new");
  });

  it("local wins when newer", () => {
    const local = [makeRecord("y", "2025-12-01", { name: "local-newer" })];
    const remote = [makeRecord("y", "2024-01-01", { name: "remote-old" })];
    const merged = mergeLastWriteWins(local, remote);
    expect(merged.find((r) => r.id === "y")?.name).toBe("local-newer");
  });

  it("adds remote-only records to result", () => {
    const local = [makeRecord("a", "2025-01-01")];
    const remote = [makeRecord("a", "2025-01-01"), makeRecord("new_remote", "2025-02-01")];
    const merged = mergeLastWriteWins(local, remote);
    expect(merged.map((r) => r.id)).toContain("new_remote");
  });

  it("returns all records when inputs are non-overlapping", () => {
    const local = [makeRecord("l1", "2025-01-01"), makeRecord("l2", "2025-01-02")];
    const remote = [makeRecord("r1", "2025-03-01")];
    const merged = mergeLastWriteWins(local, remote);
    expect(merged).toHaveLength(3);
  });

  it("handles empty arrays", () => {
    expect(mergeLastWriteWins([], [])).toEqual([]);
    expect(mergeLastWriteWins([makeRecord("a", "2025-01-01")], [])).toHaveLength(1);
    expect(mergeLastWriteWins([], [makeRecord("a", "2025-01-01")])).toHaveLength(1);
  });
});
