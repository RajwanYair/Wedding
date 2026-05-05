import { describe, it, expect, beforeEach } from "vitest";
import {
  registerHook,
  unregisterHook,
  unregisterAllForPlugin,
  fireHook,
  hasListeners,
  listenerCount,
  activeHooks,
  clearAllHooks,
  HOOK_NAMES,
} from "../../src/utils/plugin-hooks.js";

describe("plugin-hooks", () => {
  beforeEach(() => clearAllHooks());

  describe("HOOK_NAMES", () => {
    it("contains expected hook names", () => {
      expect(HOOK_NAMES).toContain("guest:added");
      expect(HOOK_NAMES).toContain("rsvp:submitted");
      expect(HOOK_NAMES).toContain("theme:changed");
      expect(HOOK_NAMES.length).toBeGreaterThan(10);
    });

    it("is frozen", () => {
      expect(Object.isFrozen(HOOK_NAMES)).toBe(true);
    });
  });

  describe("registerHook", () => {
    it("registers a hook listener", () => {
      const cb = () => {};
      expect(registerHook("guest:added", "p1", cb)).toBe(true);
      expect(listenerCount("guest:added")).toBe(1);
    });

    it("prevents duplicate registration", () => {
      const cb = () => {};
      registerHook("guest:added", "p1", cb);
      expect(registerHook("guest:added", "p1", cb)).toBe(false);
    });

    it("rejects invalid inputs", () => {
      expect(registerHook("", "p1", () => {})).toBe(false);
      expect(registerHook("x", "", () => {})).toBe(false);
      expect(registerHook("x", "p1", null)).toBe(false);
    });
  });

  describe("unregisterHook", () => {
    it("removes a specific listener", () => {
      const cb = () => {};
      registerHook("guest:added", "p1", cb);
      expect(unregisterHook("guest:added", "p1", cb)).toBe(true);
      expect(listenerCount("guest:added")).toBe(0);
    });

    it("returns false when not found", () => {
      expect(unregisterHook("guest:added", "p1", () => {})).toBe(false);
    });
  });

  describe("unregisterAllForPlugin", () => {
    it("removes all hooks for a plugin", () => {
      const cb1 = () => {};
      const cb2 = () => {};
      registerHook("guest:added", "p1", cb1);
      registerHook("rsvp:submitted", "p1", cb2);
      registerHook("guest:added", "p2", () => {});

      expect(unregisterAllForPlugin("p1")).toBe(2);
      expect(listenerCount("guest:added")).toBe(1);
      expect(listenerCount("rsvp:submitted")).toBe(0);
    });
  });

  describe("fireHook", () => {
    it("calls listeners in priority order", () => {
      const order = [];
      registerHook("guest:added", "p2", () => order.push("p2"), 20);
      registerHook("guest:added", "p1", () => order.push("p1"), 5);
      fireHook("guest:added");
      expect(order).toEqual(["p1", "p2"]);
    });

    it("passes payload to listeners", () => {
      let received;
      registerHook("guest:added", "p1", (data) => { received = data; });
      fireHook("guest:added", { name: "Alice" });
      expect(received).toEqual({ name: "Alice" });
    });

    it("catches errors and includes them in results", () => {
      registerHook("guest:added", "p1", () => { throw new Error("boom"); });
      const results = fireHook("guest:added");
      expect(results[0].error).toBe("boom");
    });

    it("returns empty for no listeners", () => {
      expect(fireHook("nonexistent")).toEqual([]);
    });
  });

  describe("hasListeners", () => {
    it("returns true when listeners exist", () => {
      registerHook("guest:added", "p1", () => {});
      expect(hasListeners("guest:added")).toBe(true);
    });

    it("returns false when no listeners", () => {
      expect(hasListeners("guest:added")).toBe(false);
    });
  });

  describe("activeHooks", () => {
    it("lists hooks with listeners", () => {
      registerHook("guest:added", "p1", () => {});
      registerHook("rsvp:submitted", "p2", () => {});
      expect(activeHooks()).toContain("guest:added");
      expect(activeHooks()).toContain("rsvp:submitted");
    });

    it("returns empty when cleared", () => {
      expect(activeHooks()).toEqual([]);
    });
  });
});
