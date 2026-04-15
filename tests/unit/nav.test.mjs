/**
 * tests/unit/nav.test.mjs — Unit tests for src/core/nav.js (S6.4)
 * Covers: navigateTo · activeSection · initRouter · initSwipe · initPullToRefresh · initKeyboardShortcuts
 *
 * @vitest-environment happy-dom
 * Run: npm test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  navigateTo,
  activeSection,
  initRouter,
  initSwipe,
  initPullToRefresh,
  initKeyboardShortcuts,
} from "../../src/core/nav.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Dispatch a synthetic TouchEvent on an element.
 */
function fireTouchEvent(element, type, x, y) {
  const init = {
    bubbles: true,
    cancelable: true,
    touches: type === "touchend" ? [] : [{ clientX: x, clientY: y }],
    changedTouches: [{ clientX: x, clientY: y }],
  };
  element.dispatchEvent(new TouchEvent(type, init));
}

// ── Reset active section before each test ─────────────────────────────────────
beforeEach(() => {
  navigateTo("dashboard");
});

// ── navigateTo ────────────────────────────────────────────────────────────────
describe("navigateTo", () => {
  it("sets activeSection to target name", () => {
    navigateTo("guests");
    expect(activeSection()).toBe("guests");
  });

  it("ignores empty / falsy name", () => {
    navigateTo("guests");
    navigateTo("");
    expect(activeSection()).toBe("guests");

    navigateTo(null);
    expect(activeSection()).toBe("guests");
  });

  it("updates location.hash to #<name>", () => {
    navigateTo("tables");
    expect(location.hash).toBe("#tables");
  });

  it("dispatches click on matching nav tab when present", () => {
    const tab = document.createElement("button");
    tab.dataset.action = "showSection";
    tab.dataset.actionArg = "analytics";
    document.body.appendChild(tab);

    const clicked = vi.fn();
    tab.addEventListener("click", clicked);

    navigateTo("analytics");
    expect(clicked).toHaveBeenCalledOnce();

    tab.remove();
  });

  it("does not throw when no matching tab in DOM", () => {
    expect(() => navigateTo("timeline")).not.toThrow();
  });
});

// ── activeSection ─────────────────────────────────────────────────────────────
describe("activeSection", () => {
  it("returns 'dashboard' after reset", () => {
    expect(activeSection()).toBe("dashboard");
  });

  it("reflects the most recent navigateTo call", () => {
    navigateTo("settings");
    expect(activeSection()).toBe("settings");
  });

  it("returns a string", () => {
    expect(typeof activeSection()).toBe("string");
  });
});

// ── initRouter ────────────────────────────────────────────────────────────────
describe("initRouter", () => {
  it("navigates to dashboard when hash is empty", () => {
    history.replaceState(null, "", "#");
    initRouter();
    expect(activeSection()).toBe("dashboard");
  });

  it("navigates to a valid section from hash", () => {
    history.replaceState(null, "", "#guests");
    initRouter();
    expect(activeSection()).toBe("guests");
  });

  it("falls back to dashboard for an unknown hash", () => {
    history.replaceState(null, "", "#notasection");
    initRouter();
    expect(activeSection()).toBe("dashboard");
  });

  it("responds to hashchange events", () => {
    initRouter();
    history.replaceState(null, "", "#tables");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(activeSection()).toBe("tables");
  });

  it("does not throw when called multiple times (idempotent listeners)", () => {
    expect(() => { initRouter(); initRouter(); }).not.toThrow();
  });
});

// ── initSwipe ─────────────────────────────────────────────────────────────────
describe("initSwipe", () => {
  let container;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    initSwipe(container);
    navigateTo("dashboard"); // reset to first section
  });

  afterEach(() => {
    container.remove();
  });

  it("navigates forward on left-swipe (dx < -40)", () => {
    fireTouchEvent(container, "touchstart", 200, 100);
    fireTouchEvent(container, "touchend", 100, 100); // dx = -100
    // Next section after dashboard should be guests
    // (tick for setTimeout in nav.js)
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(activeSection()).toBe("guests");
        resolve();
      }, 50);
    });
  });

  it("does not navigate on short swipe (|dx| < 40)", () => {
    fireTouchEvent(container, "touchstart", 200, 100);
    fireTouchEvent(container, "touchend", 185, 100); // dx = -15, too short
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(activeSection()).toBe("dashboard");
        resolve();
      }, 50);
    });
  });

  it("does not navigate on vertical swipe (|dy| > |dx|)", () => {
    fireTouchEvent(container, "touchstart", 200, 100);
    fireTouchEvent(container, "touchend", 100, 250); // |dy|=150 > |dx|=100
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(activeSection()).toBe("dashboard");
        resolve();
      }, 50);
    });
  });

  it("stays on last section when swiping left at end", () => {
    navigateTo("changelog"); // last section
    fireTouchEvent(container, "touchstart", 200, 100);
    fireTouchEvent(container, "touchend", 100, 100);
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(activeSection()).toBe("changelog");
        resolve();
      }, 50);
    });
  });
});

// ── initPullToRefresh ─────────────────────────────────────────────────────────
describe("initPullToRefresh", () => {
  let container;
  let onRefresh;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    onRefresh = vi.fn().mockResolvedValue();
    initPullToRefresh(onRefresh, container);
    // Ensure scrollY is 0 (happy-dom default)
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
    document.body.style.removeProperty("--ptr-pull");
    document.body.classList.remove("ptr--pulling", "ptr--refreshing");
  });

  afterEach(() => {
    container.remove();
  });

  it("does not fire callback on shallow pull (< 64px)", async () => {
    fireTouchEvent(container, "touchstart", 100, 0);
    fireTouchEvent(container, "touchmove", 100, 30);
    fireTouchEvent(container, "touchend", 100, 30);
    await new Promise((r) => setTimeout(r, 50));
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("fires onRefresh callback when pull exceeds threshold", async () => {
    fireTouchEvent(container, "touchstart", 100, 0);
    fireTouchEvent(container, "touchmove", 100, 80);
    // Simulate --ptr-pull >= 64 by manually setting
    document.body.style.setProperty("--ptr-pull", "64");
    fireTouchEvent(container, "touchend", 100, 80);
    await new Promise((r) => setTimeout(r, 50));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("removes ptr--refreshing class after onRefresh resolves", async () => {
    fireTouchEvent(container, "touchstart", 100, 0);
    fireTouchEvent(container, "touchmove", 100, 80);
    document.body.style.setProperty("--ptr-pull", "64");
    fireTouchEvent(container, "touchend", 100, 80);
    await new Promise((r) => setTimeout(r, 100));
    expect(document.body.classList.contains("ptr--refreshing")).toBe(false);
  });
});

// ── initKeyboardShortcuts ────────────────────────────────────────────────────

describe("initKeyboardShortcuts", () => {
  /** @type {() => void} */
  let cleanup;

  beforeEach(() => {
    cleanup = initKeyboardShortcuts();
  });

  afterEach(() => {
    cleanup?.();
  });

  it("returns a cleanup function", () => {
    expect(typeof cleanup).toBe("function");
  });

  it("navigates to first section on Alt+1", () => {
    const e = new KeyboardEvent("keydown", { key: "1", altKey: true, bubbles: true, cancelable: true });
    document.dispatchEvent(e);
    expect(activeSection()).toBe("landing");
  });

  it("navigates to second section on Alt+2", () => {
    const e = new KeyboardEvent("keydown", { key: "2", altKey: true, bubbles: true, cancelable: true });
    document.dispatchEvent(e);
    expect(activeSection()).toBe("dashboard");
  });

  it("does not navigate when altKey is false", () => {
    navigateTo("dashboard");
    const e = new KeyboardEvent("keydown", { key: "2", altKey: false, bubbles: true, cancelable: true });
    document.dispatchEvent(e);
    expect(activeSection()).toBe("dashboard");
  });

  it("does not navigate when focused inside an INPUT", () => {
    navigateTo("dashboard");
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    const e = new KeyboardEvent("keydown", {
      key: "2",
      altKey: true,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(e, "target", { value: input });
    document.dispatchEvent(e);
    // Section unchanged (still dashboard)
    expect(activeSection()).toBe("dashboard");
    input.remove();
  });

  it("ignores non-numeric keys with alt", () => {
    navigateTo("dashboard");
    const e = new KeyboardEvent("keydown", { key: "a", altKey: true, bubbles: true, cancelable: true });
    document.dispatchEvent(e);
    expect(activeSection()).toBe("dashboard");
  });

  it("cleanup removes the listener so Alt+1 no longer navigates", () => {
    cleanup();
    navigateTo("guests");
    const e = new KeyboardEvent("keydown", { key: "1", altKey: true, bubbles: true, cancelable: true });
    document.dispatchEvent(e);
    // Still on guests (listener was removed)
    expect(activeSection()).toBe("guests");
  });
});
