/**
 * tests/unit/error-monitor.test.mjs — ADR-028 M1 transport unit tests.
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  reportError,
  setUser,
  configureTransport,
  _resetForTests,
} from "../../src/services/error-service.js";

beforeEach(() => {
  _resetForTests();
});

describe("reportError", () => {
  it("emits a v1 envelope with ts, msg, ua, url", () => {
    const spy = vi.fn();
    configureTransport(spy);
    reportError(new Error("boom"));
    expect(spy).toHaveBeenCalledOnce();
    const env = spy.mock.calls[0][0];
    expect(env.v).toBe(1);
    expect(env.msg).toBe("boom");
    expect(typeof env.ts).toBe("number");
    expect(typeof env.ua).toBe("string");
    expect(typeof env.url).toBe("string");
  });

  it("strips ?token= querystrings from URL and stack", () => {
    const spy = vi.fn();
    configureTransport(spy);
    const err = new Error("x");
    err.stack = "at foo (https://app/Wedding/?token=secret#rsvp)";
    reportError(err);
    const env = spy.mock.calls[0][0];
    expect(env.stack).not.toContain("token=secret");
    expect(env.url).not.toContain("token=");
  });

  it("filters secret-shaped keys from ctx", () => {
    const spy = vi.fn();
    configureTransport(spy);
    reportError("oops", { greenApiToken: "abc", section: "guests", count: 3 });
    const env = spy.mock.calls[0][0];
    expect(env.ctx).toEqual({ section: "guests", count: 3 });
  });

  it("accepts string errors", () => {
    const spy = vi.fn();
    configureTransport(spy);
    reportError("plain string");
    expect(spy.mock.calls[0][0].msg).toBe("plain string");
  });

  it("never throws even when transport throws", () => {
    configureTransport(() => {
      throw new Error("transport down");
    });
    expect(() => reportError(new Error("x"))).not.toThrow();
  });

  it("truncates stacks larger than 4KB", () => {
    const spy = vi.fn();
    configureTransport(spy);
    const big = "a".repeat(5000);
    const err = new Error("big");
    err.stack = big;
    reportError(err);
    expect(spy.mock.calls[0][0].stack.length).toBeLessThanOrEqual(4 * 1024 + 20);
    expect(spy.mock.calls[0][0].stack).toContain("[truncated]");
  });
});

describe("setUser", () => {
  it("attaches user id to subsequent envelopes", () => {
    const spy = vi.fn();
    configureTransport(spy);
    setUser({ id: "user-123" });
    reportError("e");
    expect(spy.mock.calls[0][0].user).toBe("user-123");
  });

  it("clears user when set to null", () => {
    const spy = vi.fn();
    configureTransport(spy);
    setUser({ id: "u" });
    setUser(null);
    reportError("e");
    expect(spy.mock.calls[0][0].user).toBeNull();
  });

  it("rejects malformed user", () => {
    expect(() => setUser({})).toThrow(TypeError);
  });
});

describe("configureTransport", () => {
  it("rejects non-function transport", () => {
    expect(() => configureTransport(null)).toThrow(TypeError);
  });
});
