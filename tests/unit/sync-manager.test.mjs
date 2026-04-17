/**
 * tests/unit/sync-manager.test.mjs — Sprint 161
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  enqueueSync,
  flushSync,
  getSyncStatus,
  getPendingKeys,
  getFailedKeys,
  clearFailure,
  onSyncStatusChange,
  _resetForTesting,
} from "../../src/services/sync-manager.js";

beforeEach(() => {
  vi.restoreAllMocks();
  _resetForTesting();
});

describe("enqueueSync / getSyncStatus", () => {
  it("increments queued count when task is enqueued", () => {
    enqueueSync("guests", vi.fn().mockResolvedValue());
    const status = getSyncStatus();
    expect(status.queued).toBe(1);
  });

  it("replaces existing task for the same key (last-write-wins)", () => {
    const fn1 = vi.fn().mockResolvedValue();
    const fn2 = vi.fn().mockResolvedValue();
    enqueueSync("guests", fn1);
    enqueueSync("guests", fn2);
    expect(getSyncStatus().queued).toBe(1);
  });

  it("enqueues multiple different keys", () => {
    enqueueSync("guests", vi.fn().mockResolvedValue());
    enqueueSync("tables", vi.fn().mockResolvedValue());
    expect(getSyncStatus().queued).toBe(2);
  });
});

describe("getPendingKeys", () => {
  it("returns queued key names", () => {
    enqueueSync("guests", vi.fn().mockResolvedValue());
    enqueueSync("vendors", vi.fn().mockResolvedValue());
    const keys = getPendingKeys();
    expect(keys).toContain("guests");
    expect(keys).toContain("vendors");
  });

  it("returns empty array initially", () => {
    expect(getPendingKeys()).toEqual([]);
  });
});

describe("flushSync — success path", () => {
  it("calls the write function", async () => {
    const fn = vi.fn().mockResolvedValue();
    enqueueSync("guests", fn);
    await flushSync();
    expect(fn).toHaveBeenCalledOnce();
  });

  it("clears the queue after success", async () => {
    enqueueSync("guests", vi.fn().mockResolvedValue());
    await flushSync();
    expect(getSyncStatus().queued).toBe(0);
  });

  it("marks inFlight as 0 after completion", async () => {
    enqueueSync("guests", vi.fn().mockResolvedValue());
    await flushSync();
    expect(getSyncStatus().inFlight).toBe(0);
  });
});

describe("flushSync — failure path", () => {
  it("marks key as failed after MAX_RETRIES attempts", async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockRejectedValue(new Error("network"));
    enqueueSync("guests", fn);
    // Process + retry exhaustion (3 retries = 4 total calls)
    // Need to flush multiple times with fake timer ticks
    for (let i = 0; i < 4; i++) {
      await flushSync();
      await vi.runAllTimersAsync();
    }
    expect(getFailedKeys()).toContain("guests");
    vi.useRealTimers();
  });
});

describe("getFailedKeys / clearFailure", () => {
  it("returns empty initially", () => {
    expect(getFailedKeys()).toEqual([]);
  });

  it("clearFailure removes from failed set", async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockRejectedValue(new Error("err"));
    enqueueSync("tables", fn);
    for (let i = 0; i < 4; i++) {
      await flushSync();
      await vi.runAllTimersAsync();
    }
    expect(getFailedKeys()).toContain("tables");
    clearFailure("tables");
    expect(getFailedKeys()).not.toContain("tables");
    vi.useRealTimers();
  });

  it("clearFailure is no-op for unknown key", () => {
    expect(() => clearFailure("nonexistent")).not.toThrow();
  });
});

describe("onSyncStatusChange", () => {
  it("calls listener when tasks are enqueued", () => {
    const listener = vi.fn();
    onSyncStatusChange(listener);
    enqueueSync("guests", vi.fn().mockResolvedValue());
    expect(listener).toHaveBeenCalled();
  });

  it("unsubscribe stops listener from receiving updates", () => {
    const listener = vi.fn();
    const unsub = onSyncStatusChange(listener);
    unsub();
    enqueueSync("guests", vi.fn().mockResolvedValue());
    expect(listener).not.toHaveBeenCalled();
  });

  it("re-enqueue resets failure status for key", async () => {
    vi.useFakeTimers();
    const failFn = vi.fn().mockRejectedValue(new Error("err"));
    enqueueSync("vendors", failFn);
    for (let i = 0; i < 4; i++) {
      await flushSync();
      await vi.runAllTimersAsync();
    }
    expect(getFailedKeys()).toContain("vendors");
    // Re-enqueue — should clear failure
    enqueueSync("vendors", vi.fn().mockResolvedValue());
    expect(getFailedKeys()).not.toContain("vendors");
    vi.useRealTimers();
  });
});
