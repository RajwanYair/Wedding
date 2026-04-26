/**
 * tests/unit/router.test.mjs — ADR-025 R1 pushState router unit tests.
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  navigate,
  currentRoute,
  onRouteChange,
  initRouterListener,
  _resetRouterForTests,
} from "../../src/core/router.js";

beforeEach(() => {
  _resetRouterForTests();
  history.replaceState(null, "", "/");
});

describe("currentRoute", () => {
  it("defaults to dashboard for empty hash", () => {
    expect(currentRoute()).toEqual({ section: "dashboard", params: {} });
  });

  it("parses a flat hash", () => {
    history.replaceState(null, "", "#guests");
    expect(currentRoute().section).toBe("guests");
  });

  it("parses query params from a hash", () => {
    history.replaceState(null, "", "#guests?id=abc&filter=pending");
    const r = currentRoute();
    expect(r.section).toBe("guests");
    expect(r.params).toEqual({ id: "abc", filter: "pending" });
  });

  it("falls back to dashboard for unknown sections", () => {
    history.replaceState(null, "", "#never-exists");
    expect(currentRoute().section).toBe("dashboard");
  });
});

describe("navigate", () => {
  it("pushes a new history entry by default", () => {
    const before = history.length;
    navigate("guests");
    expect(history.length).toBe(before + 1);
    expect(location.hash).toBe("#guests");
  });

  it("encodes params as a query string", () => {
    navigate("guests", { id: "abc", filter: "pending" });
    expect(location.hash).toBe("#guests?id=abc&filter=pending");
  });

  it("strips empty/undefined params", () => {
    navigate("guests", { id: "abc", filter: "", missing: undefined });
    expect(location.hash).toBe("#guests?id=abc");
  });

  it("uses replaceState when opts.replace is true", () => {
    const spy = vi.spyOn(history, "replaceState");
    navigate("guests", {}, { replace: true });
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("rejects empty name", () => {
    expect(() => navigate("")).toThrow(TypeError);
  });

  it("rejects unknown section", () => {
    expect(() => navigate("not-a-section")).toThrow(RangeError);
  });
});

describe("onRouteChange", () => {
  it("notifies subscribers on programmatic navigate", () => {
    const spy = vi.fn();
    onRouteChange(spy);
    navigate("guests", { id: "abc" });
    expect(spy).toHaveBeenCalledWith({ section: "guests", params: { id: "abc" } });
  });

  it("returns a cleanup that removes the subscriber", () => {
    const spy = vi.fn();
    const off = onRouteChange(spy);
    off();
    navigate("guests");
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects non-function handler", () => {
    expect(() => onRouteChange(null)).toThrow(TypeError);
  });

  it("notifies on popstate after initRouterListener", () => {
    initRouterListener();
    const spy = vi.fn();
    onRouteChange(spy);
    history.replaceState(null, "", "#tables");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0].section).toBe("tables");
  });
});
