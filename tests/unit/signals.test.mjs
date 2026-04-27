/**
 * tests/unit/signals.test.mjs — S101 signal-shaped facade tests.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/core/state.js", () => ({
  getActiveEventId: () => "default",
}));

vi.mock("../../src/core/storage.js", () => ({
  readBrowserStorage: () => null,
  writeBrowserStorage: () => {},
  readBrowserStorageJson: () => null,
  writeBrowserStorageJson: () => {},
  removeBrowserStorage: () => {},
}));

let signal, computed, storeSet;

beforeEach(async () => {
  vi.resetModules();
  const sigMod = await import("../../src/core/signals.js");
  const storeMod = await import("../../src/core/store.js");
  signal = sigMod.signal;
  computed = sigMod.computed;
  storeSet = storeMod.storeSet;
});

describe("S101 — signals facade", () => {
  it("signal exposes value getter/setter and key", () => {
    const s = signal("test_key_a");
    expect(s.key).toBe("test_key_a");
    s.value = 42;
    expect(s.value).toBe(42);
    expect(s.peek()).toBe(42);
  });

  it("signal subscribers fire on store mutation", async () => {
    const s = signal("test_key_b");
    const calls = [];
    s.subscribe((v) => calls.push(v));
    storeSet("test_key_b", "hello");
    await Promise.resolve();
    await Promise.resolve();
    expect(calls).toContain("hello");
  });

  it("computed projects from a single source", () => {
    const s = signal("test_key_c");
    s.value = 3;
    const c = computed(() => s.value * 2, [s]);
    expect(c.value).toBe(6);
    s.value = 5;
    expect(c.value).toBe(10);
  });

  it("computed value setter throws", () => {
    const s = signal("test_key_d");
    const c = computed(() => s.value, [s]);
    expect(() => {
      c.value = 1;
    }).toThrow(/read-only/);
  });

  it("computed notifies subscribers when source changes", async () => {
    const s = signal("test_key_e");
    s.value = 1;
    const c = computed(() => s.value + 100, [s]);
    const calls = [];
    c.subscribe((v) => calls.push(v));
    storeSet("test_key_e", 7);
    await Promise.resolve();
    await Promise.resolve();
    expect(calls).toContain(107);
  });
});
