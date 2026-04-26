/**
 * tests/unit/action-aliases.test.mjs — ADR-022 Phase 1 modal namespace aliases
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { on, off, alias, initEvents, _resetAliasesForTests } from "../../src/core/events.js";
import {
  ACTIONS,
  MODAL_ACTION_ALIASES,
  NAMESPACED_ACTION_ALIASES,
  registerNamespacedActionAliases,
} from "../../src/core/action-registry.js";

beforeEach(() => {
  _resetAliasesForTests();
});

describe("MODAL_ACTION_ALIASES", () => {
  it("maps every modal: alias to a real ACTIONS value", () => {
    const knownValues = new Set(Object.values(ACTIONS));
    for (const [aliasName, target] of Object.entries(MODAL_ACTION_ALIASES)) {
      expect(aliasName.startsWith("modal:")).toBe(true);
      expect(knownValues.has(target)).toBe(true);
    }
  });

  it("includes the canonical close-modal alias", () => {
    expect(MODAL_ACTION_ALIASES["modal:close"]).toBe(ACTIONS.CLOSE_MODAL);
  });
});

describe("NAMESPACED_ACTION_ALIASES", () => {
  it("contains all modal aliases", () => {
    for (const k of Object.keys(MODAL_ACTION_ALIASES)) {
      expect(NAMESPACED_ACTION_ALIASES[k]).toBe(MODAL_ACTION_ALIASES[k]);
    }
  });
});

describe("registerNamespacedActionAliases", () => {
  it("invokes aliasFn once per alias and returns the count", () => {
    const aliasFn = vi.fn();
    const n = registerNamespacedActionAliases(aliasFn);
    expect(n).toBe(Object.keys(NAMESPACED_ACTION_ALIASES).length);
    expect(aliasFn).toHaveBeenCalledTimes(n);
  });

  it("throws when aliasFn is not a function", () => {
    expect(() => registerNamespacedActionAliases(null)).toThrow(TypeError);
  });
});

describe("events.alias dispatch", () => {
  it("routes a namespaced data-action to the original handler", () => {
    initEvents();
    const handler = vi.fn();
    on(ACTIONS.CLOSE_MODAL, handler);
    alias("modal:close", ACTIONS.CLOSE_MODAL);

    const btn = document.createElement("button");
    btn.dataset.action = "modal:close";
    document.body.appendChild(btn);
    btn.click();

    expect(handler).toHaveBeenCalledTimes(1);

    btn.remove();
    off(ACTIONS.CLOSE_MODAL);
  });

  it("falls back to no-op when the alias target has no handler", () => {
    initEvents();
    alias("modal:open-add-guest", ACTIONS.OPEN_ADD_GUEST_MODAL);
    const btn = document.createElement("button");
    btn.dataset.action = "modal:open-add-guest";
    document.body.appendChild(btn);
    expect(() => btn.click()).not.toThrow();
    btn.remove();
  });

  it("alias() rejects empty arguments", () => {
    expect(() => alias("", "x")).toThrow(TypeError);
    expect(() => alias("x", "")).toThrow(TypeError);
  });
});
