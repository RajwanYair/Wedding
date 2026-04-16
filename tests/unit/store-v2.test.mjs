/**
 * tests/unit/store-v2.test.mjs — Store V2 features (v6.0-S2)
 *
 * Tests for storeBatch, storeSubscribeScoped, cleanupScope,
 * pauseNotifications, resumeNotifications, and storeDebug.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// We need to mock state.js before importing store
vi.mock("../../src/core/state.js", () => ({
  getActiveEventId: () => "default",
}));

const {
  initStore,
  storeGet,
  storeSet,
  storeSubscribe,
  storeSubscribeScoped,
  cleanupScope,
  storeBatch,
  pauseNotifications,
  resumeNotifications,
  storeDebug,
  reinitStore,
} = await import("../../src/core/store.js");

describe("Store V2 — Batch + Scoped Subscriptions", () => {
  beforeEach(() => {
    reinitStore({
      guests: { value: [], storageKey: "guests" },
      tables: { value: [], storageKey: "tables" },
      count: { value: 0, storageKey: "count" },
    });
  });

  // ── storeBatch ────────────────────────────────────────────────────────

  describe("storeBatch()", () => {
    it("defers notifications until batch completes", async () => {
      const spy = vi.fn();
      storeSubscribe("guests", spy);

      storeBatch(() => {
        storeSet("guests", [{ id: "1" }]);
        storeSet("guests", [{ id: "1" }, { id: "2" }]);
        storeSet("guests", [{ id: "1" }, { id: "2" }, { id: "3" }]);
      });

      // Spy should not have been called synchronously during batch
      expect(spy).not.toHaveBeenCalled();

      // Wait for microtask notification flush
      await Promise.resolve();
      await Promise.resolve();

      // Should only be called once (not 3 times) for the batched key
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("notifies multiple keys once each after batch", async () => {
      const guestSpy = vi.fn();
      const tableSpy = vi.fn();
      storeSubscribe("guests", guestSpy);
      storeSubscribe("tables", tableSpy);

      storeBatch(() => {
        storeSet("guests", [{ id: "g1" }]);
        storeSet("tables", [{ id: "t1" }]);
        storeSet("guests", [{ id: "g1" }, { id: "g2" }]);
      });

      await Promise.resolve();
      await Promise.resolve();

      expect(guestSpy).toHaveBeenCalledTimes(1);
      expect(tableSpy).toHaveBeenCalledTimes(1);
    });

    it("handles errors inside batch without breaking notifications", async () => {
      const spy = vi.fn();
      storeSubscribe("count", spy);

      expect(() => {
        storeBatch(() => {
          storeSet("count", 42);
          throw new Error("test error");
        });
      }).toThrow("test error");

      // Notifications should still flush despite the error
      await Promise.resolve();
      await Promise.resolve();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("supports nested batches", async () => {
      const spy = vi.fn();
      storeSubscribe("count", spy);

      storeBatch(() => {
        storeSet("count", 1);
        storeBatch(() => {
          storeSet("count", 2);
        });
        // Inner batch shouldn't flush yet
        storeSet("count", 3);
      });

      await Promise.resolve();
      await Promise.resolve();

      // Only one notification after outermost batch completes
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  // ── storeSubscribeScoped ──────────────────────────────────────────────

  describe("storeSubscribeScoped()", () => {
    it("subscribes and receives notifications", async () => {
      const spy = vi.fn();
      storeSubscribeScoped("guests", spy, "dashboard");

      storeSet("guests", [{ id: "1" }]);
      await Promise.resolve();
      await Promise.resolve();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("unsubscribes all on cleanupScope", async () => {
      const spy1 = vi.fn();
      const spy2 = vi.fn();
      storeSubscribeScoped("guests", spy1, "guests-section");
      storeSubscribeScoped("tables", spy2, "guests-section");

      cleanupScope("guests-section");

      storeSet("guests", [{ id: "1" }]);
      storeSet("tables", [{ id: "t1" }]);
      await Promise.resolve();
      await Promise.resolve();

      expect(spy1).not.toHaveBeenCalled();
      expect(spy2).not.toHaveBeenCalled();
    });

    it("cleaning up non-existent scope is a no-op", () => {
      expect(() => cleanupScope("nonexistent")).not.toThrow();
    });

    it("manual unsub works independently of scope cleanup", async () => {
      const spy = vi.fn();
      const unsub = storeSubscribeScoped("count", spy, "settings");

      unsub();

      storeSet("count", 99);
      await Promise.resolve();
      await Promise.resolve();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ── pauseNotifications / resumeNotifications ──────────────────────────

  describe("pauseNotifications() / resumeNotifications()", () => {
    it("defers notifications while paused", async () => {
      const spy = vi.fn();
      storeSubscribe("count", spy);

      pauseNotifications();
      storeSet("count", 10);
      storeSet("count", 20);

      await Promise.resolve();
      expect(spy).not.toHaveBeenCalled();

      resumeNotifications();
      await Promise.resolve();
      await Promise.resolve();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("supports nested pause/resume", async () => {
      const spy = vi.fn();
      storeSubscribe("count", spy);

      pauseNotifications();
      pauseNotifications();
      storeSet("count", 1);
      resumeNotifications(); // depth 1 — still paused
      storeSet("count", 2);

      await Promise.resolve();
      expect(spy).not.toHaveBeenCalled();

      resumeNotifications(); // depth 0 — flush
      await Promise.resolve();
      await Promise.resolve();

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  // ── storeDebug ────────────────────────────────────────────────────────

  describe("storeDebug()", () => {
    it("returns store diagnostic info", () => {
      storeSubscribe("guests", () => {});
      storeSubscribe("guests", () => {});
      storeSubscribeScoped("tables", () => {}, "my-scope");

      const debug = storeDebug();

      expect(debug.keys).toContain("guests");
      expect(debug.keys).toContain("tables");
      expect(debug.subscriberCount.guests).toBeGreaterThanOrEqual(2);
      expect(debug.scopeCount).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(debug.dirtyKeys)).toBe(true);
    });
  });
});
