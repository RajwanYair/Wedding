import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  timeoutSignal,
  anySignal,
  withTimeout,
} from "../../src/utils/abort-timeout.js";

describe("timeoutSignal", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("aborts after delay with TimeoutError", () => {
    const sig = timeoutSignal(100);
    expect(sig.aborted).toBe(false);
    vi.advanceTimersByTime(100);
    expect(sig.aborted).toBe(true);
    expect(/** @type {Error} */ (sig.reason).name).toBe("TimeoutError");
  });

  it("rejects bad input", () => {
    expect(() => timeoutSignal(-1)).toThrow();
    expect(() => timeoutSignal(/** @type {any} */ ("nope"))).toThrow();
  });
});

describe("anySignal", () => {
  it("aborts when any input aborts", () => {
    const a = new AbortController();
    const b = new AbortController();
    const sig = anySignal([a.signal, b.signal]);
    expect(sig.aborted).toBe(false);
    b.abort(new Error("boom"));
    expect(sig.aborted).toBe(true);
    expect(/** @type {Error} */ (sig.reason).message).toBe("boom");
  });

  it("returns already-aborted when any input is pre-aborted", () => {
    const a = new AbortController();
    a.abort(new Error("pre"));
    const sig = anySignal([a.signal]);
    expect(sig.aborted).toBe(true);
  });

  it("ignores null/undefined entries", () => {
    const sig = anySignal([null, undefined]);
    expect(sig.aborted).toBe(false);
  });

  it("empty iterable → never aborts", () => {
    const sig = anySignal([]);
    expect(sig.aborted).toBe(false);
  });
});

describe("withTimeout", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("resolves when inner resolves first", async () => {
    const p = Promise.resolve(42);
    await expect(withTimeout(p, 100)).resolves.toBe(42);
  });

  it("rejects with TimeoutError when slow", async () => {
    const p = new Promise(() => {});
    const out = withTimeout(p, 50);
    vi.advanceTimersByTime(50);
    await expect(out).rejects.toMatchObject({ name: "TimeoutError" });
  });

  it("rejects bad ms", () => {
    expect(() =>
      withTimeout(Promise.resolve(1), /** @type {any} */ ("x")),
    ).toThrow();
  });
});
