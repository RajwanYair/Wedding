/**
 * tests/unit/session-security.test.mjs — Sprint 87
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSessionGuard } from "../../src/services/session-security.js";

describe("createSessionGuard", () => {
  it("throws for timeoutMs < 1", () => {
    expect(() => createSessionGuard({ timeoutMs: 0, onTimeout: vi.fn() })).toThrow(RangeError);
  });

  it("calls onTimeout after inactivity", async () => {
    const onTimeout = vi.fn();
    const guard = createSessionGuard({ timeoutMs: 20, onTimeout });
    await vi.waitFor(() => expect(onTimeout).toHaveBeenCalled(), { timeout: 200 });
    guard.destroy();
  });

  it("resets timer on recordActivity", async () => {
    const onTimeout = vi.fn();
    const guard = createSessionGuard({ timeoutMs: 40, onTimeout });
    // Record activity at t≈10 and t≈20 — each push the timeout back to t+40
    setTimeout(() => guard.recordActivity(), 10);
    setTimeout(() => guard.recordActivity(), 20);
    // At t=50 the timeout should NOT have fired yet (last activity at ~20, timeout at ~60)
    await new Promise((r) => setTimeout(r, 50));
    expect(onTimeout).not.toHaveBeenCalled();
    // Wait until after the final timeout fires (last activity ~20 + 40 = ~60)
    await vi.waitFor(() => expect(onTimeout).toHaveBeenCalledTimes(1), { timeout: 200 });
    guard.destroy();
  });

  it("calls onWarning before onTimeout", async () => {
    const events = [];
    const guard = createSessionGuard({
      timeoutMs: 60,
      warningMs: 30,
      onTimeout: () => events.push("timeout"),
      onWarning: () => events.push("warning"),
    });
    await vi.waitFor(() => expect(events).toContain("timeout"), { timeout: 300 });
    expect(events.indexOf("warning")).toBeLessThan(events.indexOf("timeout"));
    guard.destroy();
  });

  it("remainingMs returns positive value initially", () => {
    const guard = createSessionGuard({ timeoutMs: 10_000, onTimeout: vi.fn() });
    expect(guard.remainingMs()).toBeGreaterThan(0);
    guard.destroy();
  });

  it("destroy stops onTimeout from firing", async () => {
    const onTimeout = vi.fn();
    const guard = createSessionGuard({ timeoutMs: 50, onTimeout });
    guard.destroy();
    await new Promise((r) => setTimeout(r, 100));
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("recordActivity after destroy is a no-op", () => {
    const guard = createSessionGuard({ timeoutMs: 10_000, onTimeout: vi.fn() });
    guard.destroy();
    expect(() => guard.recordActivity()).not.toThrow();
  });
});
