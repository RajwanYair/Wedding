/**
 * tests/unit/token-gate.test.mjs — Unit tests for token-gate utility (Sprint 37)
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mocked guest-token service ─────────────────────────────────────────────

vi.mock("../../src/services/guest-token.js", () => {
  let _secret = "valid-token";
  let _revoked = new Set();

  return {
    verifyToken: vi.fn((t) => t === _secret),
    isRevoked: vi.fn((t) => _revoked.has(t)),
    // Test helpers exposed via module mock
    __setValidToken: (t) => { _secret = t; },
    __revoke: (t) => _revoked.add(t),
    __clearRevoked: () => _revoked.clear(),
  };
});

// Import after mock is set up
const {
  isTokenValid,
  withTokenGate,
  requireToken,
  withTokenGateAsync,
  gateElement,
  gateControl,
  watchToken,
} = await import("../../src/utils/token-gate.js");

const VALID = "valid-token";
const INVALID = "bad-token";

// ── isTokenValid ──────────────────────────────────────────────────────────

describe("isTokenValid", () => {
  it("returns true for a valid token", () => {
    expect(isTokenValid(VALID)).toBe(true);
  });

  it("returns false for an invalid token", () => {
    expect(isTokenValid(INVALID)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isTokenValid(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isTokenValid(undefined)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isTokenValid("")).toBe(false);
  });
});

// ── withTokenGate ─────────────────────────────────────────────────────────

describe("withTokenGate", () => {
  it("calls fn and returns result for valid token", () => {
    expect(withTokenGate(VALID, () => 42)).toBe(42);
  });

  it("returns undefined for invalid token", () => {
    expect(withTokenGate(INVALID, () => 42)).toBeUndefined();
  });

  it("does not call fn for invalid token", () => {
    const fn = vi.fn();
    withTokenGate(INVALID, fn);
    expect(fn).not.toHaveBeenCalled();
  });

  it("returns undefined for null token", () => {
    expect(withTokenGate(null, () => "x")).toBeUndefined();
  });
});

// ── requireToken ──────────────────────────────────────────────────────────

describe("requireToken", () => {
  it("returns true and does not call onFail for valid token", () => {
    const onFail = vi.fn();
    expect(requireToken(VALID, onFail)).toBe(true);
    expect(onFail).not.toHaveBeenCalled();
  });

  it("returns false and calls onFail for invalid token", () => {
    const onFail = vi.fn();
    expect(requireToken(INVALID, onFail)).toBe(false);
    expect(onFail).toHaveBeenCalledWith(INVALID);
  });

  it("works without onFail argument", () => {
    expect(() => requireToken(INVALID)).not.toThrow();
    expect(requireToken(INVALID)).toBe(false);
  });
});

// ── withTokenGateAsync ────────────────────────────────────────────────────

describe("withTokenGateAsync", () => {
  it("resolves with fn result for valid token", async () => {
    await expect(withTokenGateAsync(VALID, () => 99)).resolves.toBe(99);
  });

  it("rejects for invalid token", async () => {
    await expect(withTokenGateAsync(INVALID, () => 99)).rejects.toThrow("token-gate");
  });

  it("rejects for null token", async () => {
    await expect(withTokenGateAsync(null, () => 99)).rejects.toThrow();
  });
});

// ── gateElement ───────────────────────────────────────────────────────────

describe("gateElement", () => {
  it("removes hidden attribute for valid token", () => {
    const el = document.createElement("div");
    el.setAttribute("hidden", "");
    gateElement(el, VALID);
    expect(el.hasAttribute("hidden")).toBe(false);
  });

  it("adds hidden attribute for invalid token", () => {
    const el = document.createElement("div");
    gateElement(el, INVALID);
    expect(el.hasAttribute("hidden")).toBe(true);
  });
});

// ── gateControl ───────────────────────────────────────────────────────────

describe("gateControl", () => {
  it("enables button for valid token", () => {
    const btn = document.createElement("button");
    btn.setAttribute("disabled", "");
    gateControl(btn, VALID);
    expect(btn.hasAttribute("disabled")).toBe(false);
  });

  it("disables button for invalid token", () => {
    const btn = document.createElement("button");
    gateControl(btn, INVALID);
    expect(btn.hasAttribute("disabled")).toBe(true);
  });
});

// ── watchToken ────────────────────────────────────────────────────────────

describe("watchToken", () => {
  it("calls onValid immediately for valid token", () => {
    const onValid = vi.fn();
    watchToken(VALID, { onValid });
    expect(onValid).toHaveBeenCalledOnce();
  });

  it("calls onInvalid immediately for invalid token", () => {
    const onInvalid = vi.fn();
    watchToken(INVALID, { onInvalid });
    expect(onInvalid).toHaveBeenCalledOnce();
  });

  it("returns a cleanup function", () => {
    const cleanup = watchToken(VALID, {});
    expect(typeof cleanup).toBe("function");
    expect(() => cleanup()).not.toThrow();
  });
});
