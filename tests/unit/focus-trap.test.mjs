/**
 * tests/unit/focus-trap.test.mjs — Sprint 144
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
});

describe("createFocusTrap", () => {
  /** @type {any} */
  let first;
  /** @type {any} */
  let last;
  /** @type {any} */
  let container;
  /** @type {import("../../src/utils/focus-trap.js").createFocusTrap} */
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
});
