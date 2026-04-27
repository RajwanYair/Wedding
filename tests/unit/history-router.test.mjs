/**
 * tests/unit/history-router.test.mjs — Unit tests for src/core/history-router.js (S91)
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  buildHistoryUrl,
  pushRoute,
  replaceRoute,
  onRouteChange,
  initHistoryRouter,
} from "../../src/core/history-router.js";

describe("history-router (S91)", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("buildHistoryUrl produces ?params#section format", () => {
    expect(buildHistoryUrl({ section: "guests" })).toBe("#guests");
    expect(buildHistoryUrl({ section: "guests", params: { id: "g_42" } })).toBe("?id=g_42#guests");
    expect(buildHistoryUrl({ section: "tables", params: { a: 1, b: undefined } })).toBe("?a=1#tables");
  });

  it("buildHistoryUrl falls back to dashboard for unknown sections", () => {
    expect(buildHistoryUrl({ section: "nope" })).toBe("#dashboard");
  });

  it("pushRoute adds an entry and emits popstate", () => {
    const handler = vi.fn();
    window.addEventListener("popstate", handler);
    pushRoute({ section: "tables" });
    expect(window.location.hash).toBe("#tables");
    expect(handler).toHaveBeenCalled();
    window.removeEventListener("popstate", handler);
  });

  it("replaceRoute updates the URL without dispatching popstate", () => {
    const handler = vi.fn();
    window.addEventListener("popstate", handler);
    replaceRoute({ section: "vendors", params: { from: "ui" } });
    expect(window.location.search).toBe("?from=ui");
    expect(window.location.hash).toBe("#vendors");
    expect(handler).not.toHaveBeenCalled();
    window.removeEventListener("popstate", handler);
  });

  it("onRouteChange returns an unsubscribe", () => {
    const cb = vi.fn();
    const off = onRouteChange(cb);
    expect(typeof off).toBe("function");
    off();
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(cb).not.toHaveBeenCalled();
  });

  it("initHistoryRouter invokes the callback once on mount", () => {
    window.history.replaceState({}, "", "#guests");
    const cb = vi.fn();
    const off = initHistoryRouter(cb);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0].section).toBe("guests");
    off();
  });
});
