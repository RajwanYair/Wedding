/**
 * tests/unit/section-base.test.mjs — BaseSection lifecycle tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore, storeSet } from "../../src/core/store.js";
import { BaseSection, fromSection } from "../../src/core/section-base.js";

beforeEach(() => {
  initStore({
    guests: { value: [] },
    tables: { value: [] },
    vendors: { value: [] },
    expenses: { value: [] },
    weddingInfo: { value: {} },
    appErrors: { value: [] },
    campaigns: { value: [] },
  });
});

describe("BaseSection construction", () => {
  it("requires a name", () => {
    expect(() => new BaseSection()).toThrow(/name is required/);
    expect(() => new BaseSection("")).toThrow(/name is required/);
  });

  it("freezes capabilities", () => {
    const s = new BaseSection("x", { offline: true });
    expect(s.capabilities.offline).toBe(true);
    expect(Object.isFrozen(s.capabilities)).toBe(true);
  });

  it("starts unmounted", () => {
    expect(new BaseSection("x").isMounted).toBe(false);
  });
});

describe("fromSection adapter", () => {
  it("rejects non-BaseSection input", () => {
    expect(() => fromSection({})).toThrow(/expected a BaseSection/);
  });

  it("yields mount/unmount/capabilities", () => {
    const s = new BaseSection("x", { public: true });
    const mod = fromSection(s);
    expect(typeof mod.mount).toBe("function");
    expect(typeof mod.unmount).toBe("function");
    expect(mod.capabilities.public).toBe(true);
  });
});

describe("lifecycle", () => {
  it("calls onMount with params", async () => {
    const onMount = vi.fn();
    class S extends BaseSection { async onMount(p) { onMount(p); } }
    const mod = fromSection(new S("s"));
    await mod.mount({ id: 42 });
    expect(onMount).toHaveBeenCalledWith({ id: 42 });
  });

  it("is idempotent on double-mount", async () => {
    const onMount = vi.fn();
    class S extends BaseSection { async onMount() { onMount(); } }
    const mod = fromSection(new S("s"));
    await mod.mount();
    await mod.mount();
    expect(onMount).toHaveBeenCalledTimes(1);
  });

  it("auto-unsubscribes store subscriptions on unmount", async () => {
    const fn = vi.fn();
    class S extends BaseSection {
      async onMount() { this.subscribe("guests", fn); }
    }
    const inst = new S("s");
    const mod = fromSection(inst);
    await mod.mount();
    storeSet("guests", [{ id: 1 }]);
    await new Promise((r) => setTimeout(r, 0));
    const callsBeforeUnmount = fn.mock.calls.length;
    expect(callsBeforeUnmount).toBeGreaterThanOrEqual(1);
    mod.unmount();
    storeSet("guests", [{ id: 2 }]);
    await new Promise((r) => setTimeout(r, 0));
    expect(fn).toHaveBeenCalledTimes(callsBeforeUnmount);
  });

  it("runs registered cleanup functions on unmount", async () => {
    const cleanup = vi.fn();
    class S extends BaseSection {
      async onMount() { this.addCleanup(cleanup); }
    }
    const mod = fromSection(new S("s"));
    await mod.mount();
    mod.unmount();
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("calls onUnmount hook", async () => {
    const onUnmount = vi.fn();
    class S extends BaseSection { onUnmount() { onUnmount(); } }
    const mod = fromSection(new S("s"));
    await mod.mount();
    mod.unmount();
    expect(onUnmount).toHaveBeenCalledOnce();
  });

  it("swallows cleanup errors (next cleanup still runs)", async () => {
    const after = vi.fn();
    class S extends BaseSection {
      async onMount() {
        this.addCleanup(() => { throw new Error("boom"); });
        this.addCleanup(after);
      }
    }
    const mod = fromSection(new S("s"));
    await mod.mount();
    mod.unmount();
    expect(after).toHaveBeenCalledOnce();
  });
});
