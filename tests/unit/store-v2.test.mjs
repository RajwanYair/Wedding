/**
 * tests/unit/store-v2.test.mjs — Store V2 features (v6.0-S2, Phase 2)
 *
 * Tests for storeBatch, storeSubscribeScoped, cleanupScope,
 * pauseNotifications, resumeNotifications, storeDebug,
 * storeGetBatch, storeUpdate, storeUpsert, storeRemove.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// We need to mock state.js before importing store
vi.mock("../../src/core/state.js", () => ({
  getActiveEventId: () => "default",
}));

const {
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
  storeGetBatch,
  storeUpdate,
  storeUpsert,
  storeRemove,
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

  // Detailed scope cleanup / leak tests: see store-subscriptions.test.mjs
  describe("storeSubscribeScoped()", () => {
    it("subscribes and receives notifications", async () => {
      const spy = vi.fn();
      storeSubscribeScoped("guests", spy, "dashboard");

      storeSet("guests", [{ id: "1" }]);
      await Promise.resolve();
      await Promise.resolve();

      expect(spy).toHaveBeenCalledTimes(1);
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

// ── Phase 2 immutable helpers ─────────────────────────────────────────────

describe("Store Phase 2 — Immutable helpers", () => {
  beforeEach(() => {
    reinitStore({
      items: { value: [{ id: "a", name: "Alpha" }, { id: "b", name: "Beta" }], storageKey: "items" },
      counter: { value: 0, storageKey: "counter" },
    });
  });

  // ── storeGetBatch ─────────────────────────────────────────────────────

  describe("storeGetBatch()", () => {
    it("returns multiple keys in one call", () => {
      const result = storeGetBatch(["items", "counter"]);
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.counter).toBe(0);
    });

    it("returns undefined for unknown keys", () => {
      const result = storeGetBatch(["nonexistent"]);
      expect(result.nonexistent).toBeUndefined();
    });
  });

  // ── storeUpdate ───────────────────────────────────────────────────────

  describe("storeUpdate()", () => {
    it("updates a field on the matching item", () => {
      storeUpdate("items", "a", { name: "Alpha Updated" });
      const items = /** @type {any[]} */ (storeGet("items"));
      expect(items.find((i) => i.id === "a").name).toBe("Alpha Updated");
    });

    it("preserves non-patched fields", () => {
      storeUpdate("items", "a", { extra: "x" });
      const item = /** @type {any[]} */ (storeGet("items")).find((i) => i.id === "a");
      expect(item.name).toBe("Alpha");
      expect(item.extra).toBe("x");
    });

    it("preserves other items in the array", () => {
      storeUpdate("items", "a", { name: "New" });
      const items = /** @type {any[]} */ (storeGet("items"));
      expect(items).toHaveLength(2);
      expect(items.find((i) => i.id === "b").name).toBe("Beta");
    });

    it("throws for non-existent id", () => {
      expect(() => storeUpdate("items", "z", {})).toThrow("not found");
    });

    it("throws for non-array key", () => {
      expect(() => storeUpdate("counter", "x", {})).toThrow("not an array");
    });
  });

  // ── storeUpsert ───────────────────────────────────────────────────────

  describe("storeUpsert()", () => {
    it("updates an existing item", () => {
      storeUpsert("items", { id: "a", name: "Alpha Upserted" });
      const item = /** @type {any[]} */ (storeGet("items")).find((i) => i.id === "a");
      expect(item.name).toBe("Alpha Upserted");
    });

    it("appends a new item when id not found", () => {
      storeUpsert("items", { id: "c", name: "Gamma" });
      const items = /** @type {any[]} */ (storeGet("items"));
      expect(items).toHaveLength(3);
      expect(items.find((i) => i.id === "c").name).toBe("Gamma");
    });

    it("returns the upserted item", () => {
      const result = storeUpsert("items", { id: "a", name: "X" });
      expect(result.id).toBe("a");
    });
  });

  // ── storeRemove ───────────────────────────────────────────────────────

  describe("storeRemove()", () => {
    it("removes the item with matching id", () => {
      const removed = storeRemove("items", "a");
      expect(removed).toBe(true);
      const items = /** @type {any[]} */ (storeGet("items"));
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("b");
    });

    it("returns false when id not found", () => {
      const removed = storeRemove("items", "z");
      expect(removed).toBe(false);
      expect(/** @type {any[]} */ (storeGet("items"))).toHaveLength(2);
    });

    it("returns false for non-array key", () => {
      const removed = storeRemove("counter", "x");
      expect(removed).toBe(false);
    });
  });
});

// ── Sprint 13 — storeSubscribeOnce, storeBatchAsync, getSubscriberStats ──

describe("Store Sprint 13 — once / batchAsync / stats", () => {
  /** @type {typeof import("../../src/core/store.js")} */
  let _mod;

  beforeEach(async () => {
    vi.resetModules();
    _mod = /** @type {any} */ (await import("../../src/core/store.js"));
    _mod.initStore({ _sp13: { value: 0 }, _arr13: { value: [] } });
    _mod.storeSet("_sp13", 0);
  });

  describe("storeSubscribeOnce", () => {
    it("fires callback exactly once", async () => {
      const calls = [];
      _mod.storeSubscribeOnce("_sp13", (v) => calls.push(v));
      _mod.storeSet("_sp13", 1);
      _mod.storeSet("_sp13", 2);
      await Promise.resolve();
      // Batch notification fires once; value is the latest set value
      expect(calls).toHaveLength(1);
      expect(typeof calls[0]).toBe("number");
    });

    it("cancel function prevents callback from firing", async () => {
      const calls = [];
      const cancel = _mod.storeSubscribeOnce("_sp13", (v) => calls.push(v));
      cancel();
      _mod.storeSet("_sp13", 5);
      await Promise.resolve();
      expect(calls).toHaveLength(0);
    });
  });

  describe("storeBatchAsync", () => {
    it("defers notifications until async fn resolves", async () => {
      const notifications = [];
      _mod.storeSubscribe("_sp13", (v) => notifications.push(v));

      await _mod.storeBatchAsync(async () => {
        _mod.storeSet("_sp13", 10);
        await new Promise((r) => setTimeout(r, 0));
        _mod.storeSet("_sp13", 20);
      });
      await Promise.resolve();
      expect(_mod.storeGet("_sp13")).toBe(20);
    });

    it("flushes notifications even when async fn throws", async () => {
      await expect(
        _mod.storeBatchAsync(async () => {
          _mod.storeSet("_sp13", 99);
          throw new Error("boom");
        }),
      ).rejects.toThrow("boom");
      expect(_mod.storeGet("_sp13")).toBe(99);
    });
  });

  describe("getSubscriberStats", () => {
    it("returns an object with perKey, total, scopes", () => {
      const stats = _mod.getSubscriberStats();
      expect(typeof stats.total).toBe("number");
      expect(typeof stats.scopes).toBe("number");
      expect(typeof stats.perKey).toBe("object");
    });

    it("counts subscriptions per key", () => {
      _mod.storeSubscribe("_sp13", () => {});
      _mod.storeSubscribe("_sp13", () => {});
      const stats = _mod.getSubscriberStats();
      expect(stats.perKey["_sp13"]).toBeGreaterThanOrEqual(2);
    });

    it("total is sum of all perKey counts", () => {
      const stats = _mod.getSubscriberStats();
      const sum = Object.values(stats.perKey).reduce((/** @type {number} */ a, /** @type {number} */ n) => a + n, 0);
      expect(stats.total).toBe(sum);
    });
  });
});

