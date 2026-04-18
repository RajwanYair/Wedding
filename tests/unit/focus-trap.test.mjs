/**
 * tests/unit/focus-trap.test.mjs — Sprint 144 + Sprint 10 (session)
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getFocusableElements, createFocusTrap } from "../../src/utils/focus-trap.js";

// ── Minimal DOM-like stubs ─────────────────────────────────────────────────

function makeEl(tabindex = "0") {
  return Object.assign(Object.create(null), {
    hidden: false,
    tabIndex: parseInt(tabindex),
    focus: vi.fn(),
  });
}

describe("getFocusableElements", () => {
  it("returns elements from querySelectorAll", () => {
    const el1 = makeEl();
    const el2 = makeEl();
    const container = {
      querySelectorAll: vi.fn().mockReturnValue([el1, el2]),
    };
    const result = getFocusableElements(/** @type {any} */ (container));
    expect(result).toHaveLength(2);
  });

  it("excludes hidden elements", () => {
    const el1 = Object.assign(makeEl(), { hidden: true });
    const el2 = makeEl();
    const container = { querySelectorAll: vi.fn().mockReturnValue([el1, el2]) };
    const result = getFocusableElements(/** @type {any} */ (container));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(el2);
  });

  it("returns empty array when all elements are hidden", () => {
    const el1 = Object.assign(makeEl(), { hidden: true });
    const container = { querySelectorAll: vi.fn().mockReturnValue([el1]) };
    const result = getFocusableElements(/** @type {any} */ (container));
    expect(result).toHaveLength(0);
  });

  it("returns all elements when none are hidden", () => {
    const elements = [makeEl(), makeEl(), makeEl()];
    const container = { querySelectorAll: vi.fn().mockReturnValue(elements) };
    const result = getFocusableElements(/** @type {any} */ (container));
    expect(result).toHaveLength(3);
  });
});

describe("createFocusTrap", () => {
  /** @type {any} */
  let first;
  /** @type {any} */
  let last;
  /** @type {any} */
  let container;
  /** @type {any} */
  let trap;

  beforeEach(() => {
    first = makeEl();
    last  = makeEl();
    container = {};
    trap = createFocusTrap(container, {
      getFocusable: () => [first, last],
    });
  });

  it("activate focuses first element", () => {
    trap.activate();
    expect(first.focus).toHaveBeenCalledOnce();
  });

  it("deactivate calls focusTrigger.focus", () => {
    const trigger = makeEl();
    const t = createFocusTrap(container, {
      getFocusable: () => [first, last],
      focusTrigger: trigger,
    });
    t.activate();
    t.deactivate();
    expect(trigger.focus).toHaveBeenCalledOnce();
  });

  it("activate then deactivate does not throw", () => {
    expect(() => {
      trap.activate();
      trap.deactivate();
    }).not.toThrow();
  });

  it("Tab on last element wraps to first", () => {
    trap.activate();
    // Simulate Tab keydown with focus on last element
    Object.defineProperty(document, "activeElement", {
      get: () => last,
      configurable: true,
    });
    const e = Object.assign(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }), {
      preventDefault: vi.fn(),
    });
    document.dispatchEvent(e);
    expect(first.focus).toHaveBeenCalled();
  });

  it("Shift+Tab on first element wraps to last", () => {
    trap.activate();
    Object.defineProperty(document, "activeElement", {
      get: () => first,
      configurable: true,
    });
    const e = Object.assign(
      new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }),
      { preventDefault: vi.fn() },
    );
    document.dispatchEvent(e);
    expect(last.focus).toHaveBeenCalled();
  });

  it("deactivate can be called without prior activate without throwing", () => {
    expect(() => trap.deactivate()).not.toThrow();
  });
});
