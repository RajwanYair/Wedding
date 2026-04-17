/**
 * tests/unit/network-status.test.mjs — Sprint 204
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Intercept the module state before import
vi.mock("../../src/utils/network-status.js", async (importOriginal) => {
  // Use the real module but reset internal state between tests
  return await importOriginal();
});

import {
  isOnline,
  onStatusChange,
  _setStatus,
  waitForOnline,
  whenOnline,
} from "../../src/utils/network-status.js";

beforeEach(() => {
  // Reset to online by default
  _setStatus(true);
});

describe("isOnline", () => {
  it("returns true initially", () => {
    _setStatus(true);
    expect(isOnline()).toBe(true);
  });
  it("returns false after going offline", () => {
    _setStatus(false);
    expect(isOnline()).toBe(false);
  });
});

describe("onStatusChange", () => {
  it("calls listener on status change", () => {
    const fn = vi.fn();
    const unsub = onStatusChange(fn);
    _setStatus(false);
    expect(fn).toHaveBeenCalledWith(false);
    unsub();
  });
  it("does not call after unsubscribe", () => {
    const fn = vi.fn();
    const unsub = onStatusChange(fn);
    unsub();
    _setStatus(false);
    expect(fn).not.toHaveBeenCalled();
    _setStatus(true);
  });
  it("does not fire when status unchanged", () => {
    _setStatus(true);
    const fn = vi.fn();
    const unsub = onStatusChange(fn);
    _setStatus(true); // no change
    expect(fn).not.toHaveBeenCalled();
    unsub();
  });
  it("multiple listeners all called", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const u1 = onStatusChange(fn1);
    const u2 = onStatusChange(fn2);
    _setStatus(false);
    expect(fn1).toHaveBeenCalled();
    expect(fn2).toHaveBeenCalled();
    u1(); u2();
    _setStatus(true);
  });
});

describe("waitForOnline", () => {
  it("resolves immediately when online", async () => {
    _setStatus(true);
    await expect(waitForOnline()).resolves.toBeUndefined();
  });
  it("resolves when status changes to online", async () => {
    _setStatus(false);
    const p = waitForOnline();
    _setStatus(true);
    await expect(p).resolves.toBeUndefined();
  });
  it("rejects on timeout", async () => {
    _setStatus(false);
    await expect(waitForOnline({ timeout: 10 })).rejects.toThrow("timed out");
    _setStatus(true);
  });
});

describe("whenOnline", () => {
  it("calls fn immediately when online", async () => {
    _setStatus(true);
    const fn = vi.fn();
    await whenOnline(fn);
    expect(fn).toHaveBeenCalledOnce();
  });
  it("calls fn after going back online", async () => {
    _setStatus(false);
    const fn = vi.fn();
    const p = whenOnline(fn);
    expect(fn).not.toHaveBeenCalled();
    _setStatus(true);
    await p;
    expect(fn).toHaveBeenCalledOnce();
  });
});
