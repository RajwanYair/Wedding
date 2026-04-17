/**
 * tests/unit/retry-queue.test.mjs — v7.5.0
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  enqueue,
  listPending,
  dueNow,
  markSucceeded,
  markFailed,
  clearKey,
  clearAll,
  processQueue,
} from "../../src/utils/retry-queue.js";

beforeEach(() => clearAll());

describe("enqueue", () => {
  it("enqueues entry and returns id", () => {
    const id = enqueue({ key: "sync", payload: { x: 1 } });
    expect(id).toMatch(/^rq_/);
    expect(listPending()).toHaveLength(1);
  });
});

describe("dueNow", () => {
  it("new entry is due immediately", () => {
    enqueue({ key: "k", payload: {} });
    expect(dueNow()).toHaveLength(1);
  });

  it("entry not due after markFailed until delay passes", () => {
    const id = enqueue({ key: "k", payload: {} });
    const now = Date.now();
    markFailed(id, now);
    expect(dueNow(now)).toHaveLength(0);
    expect(dueNow(now + 1001)).toHaveLength(1);
  });
});

describe("markSucceeded", () => {
  it("removes entry from queue", () => {
    const id = enqueue({ key: "k", payload: {} });
    markSucceeded(id);
    expect(listPending()).toHaveLength(0);
  });
});

describe("markFailed", () => {
  it("increments attempts", () => {
    const id = enqueue({ key: "k", payload: {} });
    markFailed(id);
    const pending = listPending();
    expect(pending[0].attempts).toBe(1);
  });

  it("removes entry from pending after maxAttempts", () => {
    const id = enqueue({ key: "k", payload: {}, maxAttempts: 1 });
    markFailed(id);
    expect(listPending()).toHaveLength(0);
  });
});

describe("clearKey", () => {
  it("removes all entries for key", () => {
    enqueue({ key: "alpha", payload: {} });
    enqueue({ key: "beta",  payload: {} });
    clearKey("alpha");
    expect(listPending().every((e) => e.key !== "alpha")).toBe(true);
    expect(listPending()).toHaveLength(1);
  });
});

describe("processQueue", () => {
  it("calls handler for due entries", async () => {
    enqueue({ key: "k", payload: { n: 1 } });
    const handler = vi.fn().mockResolvedValue(true);
    const { succeeded, failed } = await processQueue(handler);
    expect(succeeded).toBe(1);
    expect(failed).toBe(0);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(listPending()).toHaveLength(0);
  });

  it("marks entry failed when handler returns false", async () => {
    enqueue({ key: "k", payload: {} });
    const { succeeded, failed } = await processQueue(async () => false);
    expect(succeeded).toBe(0);
    expect(failed).toBe(1);
    expect(listPending()[0].attempts).toBe(1);
  });

  it("marks entry failed when handler throws", async () => {
    enqueue({ key: "k", payload: {} });
    const { failed } = await processQueue(async () => { throw new Error("boom"); });
    expect(failed).toBe(1);
  });
});
