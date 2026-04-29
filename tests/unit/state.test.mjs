/**
 * tests/unit/state.test.mjs — Unit tests for src/core/state.js
 * Covers: save · load · remove · clearAll · prefix isolation
 *
 * Stubs globalThis.localStorage with a Proxy-backed in-memory store so
 * Object.keys(localStorage) works correctly for clearAll() tests.
 *
 * Run: npm test
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from "vitest";
import {
  save, load, remove, clearAll,
  listEvents, getActiveEventId, setActiveEvent, addEvent, removeEvent,
  restoreActiveEvent, saveGlobal, loadGlobal, clearEventData,
} from "../../src/core/state.js";

const _PREFIX = "wedding_v1_";

// ── localStorage stub ─────────────────────────────────────────────────────
// Proxy wraps _data so Object.keys(localStorage) returns stored keys.
const _data = {};
const mockLS = new Proxy(_data, {
  get(target, prop) {
    if (prop === "getItem") return (k) => Object.prototype.hasOwnProperty.call(target, k) ? target[k] : null;
    if (prop === "setItem") return (k, v) => { target[String(k)] = String(v); };
    if (prop === "removeItem") return (k) => { delete target[String(k)]; };
    if (prop === "clear") return () => { Object.keys(target).forEach((k) => delete target[k]); };
    if (prop === "length") return Object.keys(target).length;
    if (prop === "key") return (i) => Object.keys(target)[i] ?? null;
    return target[prop];
  },
  ownKeys: (target) => Reflect.ownKeys(target),
  getOwnPropertyDescriptor: (target, key) => Object.getOwnPropertyDescriptor(target, key),
});

beforeAll(() => {
  vi.stubGlobal("localStorage", mockLS);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  Object.keys(_data).forEach((k) => delete _data[k]);
});

// ── save + load round-trip ────────────────────────────────────────────────
describe("save + load round-trip", () => {
  it("stores and retrieves a string value", () => {
    save("test_key", "hello");
    expect(load("test_key")).toBe("hello");
  });

  it("stores and retrieves an object", () => {
    const obj = { name: "Alice", count: 2 };
    save("obj_key", obj);
    expect(load("obj_key")).toEqual(obj);
  });

  it("stores and retrieves an array", () => {
    save("arr_key", [1, 2, 3]);
    expect(load("arr_key")).toEqual([1, 2, 3]);
  });

  it("stores and retrieves a number", () => {
    save("num_key", 42);
    expect(load("num_key")).toBe(42);
  });

  it("stores and retrieves boolean false", () => {
    save("bool_key", false);
    expect(load("bool_key")).toBe(false);
  });

  it("stores and retrieves null", () => {
    save("null_key", null);
    expect(load("null_key")).toBeNull();
  });

  it("overwrite returns the updated value", () => {
    save("key", "v1");
    save("key", "v2");
    expect(load("key")).toBe("v2");
  });
});

// ── load ──────────────────────────────────────────────────────────────────
describe("load", () => {
  it("returns fallback when key missing", () => {
    expect(load("nonexistent", "default")).toBe("default");
  });

  it("returns undefined when key missing and no fallback", () => {
    expect(load("nonexistent2")).toBeUndefined();
  });

  it("round-trips nested arrays", () => {
    const arr = [{ id: "1", name: "Table 1" }, { id: "2", name: "Table 2" }];
    save("tables", arr);
    expect(load("tables")).toEqual(arr);
  });
});

// ── remove ────────────────────────────────────────────────────────────────
describe("remove", () => {
  it("removes a saved key (load returns fallback)", () => {
    save("to_remove", "value");
    remove("to_remove");
    expect(load("to_remove", null)).toBeNull();
  });

  it("is a no-op for a missing key", () => {
    expect(() => remove("never_saved")).not.toThrow();
  });

  it("does not affect other keys", () => {
    save("keep", "good");
    save("del", "bye");
    remove("del");
    expect(load("keep")).toBe("good");
    expect(load("del")).toBeUndefined();
  });
});

// ── clearAll ─────────────────────────────────────────────────────────────
describe("clearAll", () => {
  it("removes all previously saved keys", () => {
    save("k1", "a");
    save("k2", "b");
    save("k3", "c");
    clearAll();
    expect(load("k1")).toBeUndefined();
    expect(load("k2")).toBeUndefined();
    expect(load("k3")).toBeUndefined();
  });

  it("is idempotent (calling twice is safe)", () => {
    save("x", 1);
    clearAll();
    expect(() => clearAll()).not.toThrow();
    expect(load("x")).toBeUndefined();
  });

  it("only removes app-prefixed keys", () => {
    _data["other_app_key"] = "keep";
    save("app_key", "remove");
    clearAll();
    expect(load("app_key")).toBeUndefined();
    expect(_data["other_app_key"]).toBe("keep");
    delete _data["other_app_key"];
  });
});

// ── Event management (S9.1) ───────────────────────────────────────────────

describe("listEvents", () => {
  it("returns default event when no events stored", () => {
    const events = listEvents();
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].id).toBe("default");
  });
});

describe("getActiveEventId", () => {
  it("returns a string event id", () => {
    const id = getActiveEventId();
    expect(typeof id).toBe("string");
  });
});

describe("setActiveEvent + getActiveEventId", () => {
  it("updates the active event id", () => {
    setActiveEvent("wedding2025");
    expect(getActiveEventId()).toBe("wedding2025");
    // Reset to default
    setActiveEvent("default");
  });

  it("persists to localStorage via saveGlobal", () => {
    setActiveEvent("test-evt");
    const stored = loadGlobal("activeEventId");
    expect(stored).toBe("test-evt");
    setActiveEvent("default");
  });
});

describe("addEvent + listEvents + removeEvent", () => {
  it("adds a new event to the registry", () => {
    addEvent("evt-new", "New Event");
    const events = listEvents();
    const found = events.find((e) => e.id === "evt-new");
    expect(found).toBeTruthy();
    expect(found?.label).toBe("New Event");
  });

  it("does not add duplicate events", () => {
    addEvent("evt-dup", "Dup");
    addEvent("evt-dup", "Dup Again");
    const events = listEvents();
    const dups = events.filter((e) => e.id === "evt-dup");
    expect(dups.length).toBe(1);
  });

  it("removeEvent removes a non-default event", () => {
    addEvent("evt-remove", "Remove Me");
    removeEvent("evt-remove");
    const events = listEvents();
    expect(events.find((e) => e.id === "evt-remove")).toBeUndefined();
  });

  it("removeEvent is a no-op for 'default'", () => {
    removeEvent("default");
    const events = listEvents();
    expect(events.find((e) => e.id === "default")).toBeTruthy();
  });
});

describe("restoreActiveEvent", () => {
  it("reads activeEventId from localStorage", () => {
    saveGlobal("activeEventId", "restored-evt");
    restoreActiveEvent();
    expect(getActiveEventId()).toBe("restored-evt");
    // Reset
    setActiveEvent("default");
  });

  it("defaults to 'default' when nothing stored", () => {
    // Remove the key
    mockLS.removeItem(_PREFIX + "activeEventId");
    restoreActiveEvent();
    expect(getActiveEventId()).toBe("default");
  });
});

// ── saveGlobal + loadGlobal ───────────────────────────────────────────────

describe("saveGlobal + loadGlobal", () => {
  it("round-trips a value without event scoping", () => {
    saveGlobal("globalKey", { x: 42 });
    const val = loadGlobal("globalKey");
    expect(val).toEqual({ x: 42 });
  });

  it("returns fallback when key not present", () => {
    const val = loadGlobal("missing_global_key", "fallback");
    expect(val).toBe("fallback");
  });

  it("global key is NOT affected by setActiveEvent", () => {
    saveGlobal("stable", "yes");
    setActiveEvent("other-evt");
    expect(loadGlobal("stable")).toBe("yes");
    setActiveEvent("default");
  });
});

// ── clearEventData ────────────────────────────────────────────────────────

describe("clearEventData", () => {
  it("removes event-scoped keys for a non-default event", () => {
    setActiveEvent("clear-test");
    save("myKey", "value");
    setActiveEvent("default");
    clearEventData("clear-test");
    // After clearing, the event-scoped key should be gone
    setActiveEvent("clear-test");
    expect(load("myKey")).toBeUndefined();
    setActiveEvent("default");
  });

  it("does not remove global registry keys for default event clear", () => {
    saveGlobal("events", [{ id: "default", label: "" }]);
    clearEventData("default");
    // Global events key should still be present
    expect(loadGlobal("events")).toBeTruthy();
  });
});
