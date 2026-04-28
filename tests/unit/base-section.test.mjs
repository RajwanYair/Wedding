/**
 * tests/unit/base-section.test.mjs — S165: BaseSection additional coverage
 * Companion to section-base.test.mjs — covers accessors and edge cases
 * not exercised there.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore, storeSet } from "../../src/core/store.js";
import { BaseSection, fromSection } from "../../src/core/section-base.js";

beforeEach(() => {
  initStore({
    guests: { value: [] },
    weddingInfo: { value: {} },
    appErrors: { value: [] },
  });
});

describe("BaseSection accessors", () => {
  it("name getter returns the constructor arg", () => {
    const s = new BaseSection("my-section");
    expect(s.name).toBe("my-section");
  });

  it("capabilities defaults to empty frozen object when not provided", () => {
    const s = new BaseSection("s");
    expect(s.capabilities).toEqual({});
    expect(Object.isFrozen(s.capabilities)).toBe(true);
  });

  it("capabilities reflects provided flags", () => {
    const s = new BaseSection("s", { offline: true, realtime: false });
    expect(s.capabilities.offline).toBe(true);
    expect(s.capabilities.realtime).toBe(false);
  });
});

describe("BaseSection.subscribe()", () => {
  it("returns an unsubscriber function", async () => {
    class S extends BaseSection {
      capturedUnsub = null;
      async onMount() {
        this.capturedUnsub = this.subscribe("guests", vi.fn());
      }
    }
    const inst = new S("s");
    await fromSection(inst).mount();
    expect(typeof inst.capturedUnsub).toBe("function");
    fromSection(inst).unmount();
  });

  it("multiple subscriptions all auto-released on unmount", async () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    class S extends BaseSection {
      async onMount() {
        this.subscribe("guests", fn1);
        this.subscribe("weddingInfo", fn2);
      }
    }
    const mod = fromSection(new S("s"));
    await mod.mount();
    storeSet("guests", [{ id: 1 }]);
    storeSet("weddingInfo", { name: "test" });
    await new Promise((r) => setTimeout(r, 0));
    const beforeGuests = fn1.mock.calls.length;
    const beforeWedding = fn2.mock.calls.length;
    mod.unmount();
    storeSet("guests", [{ id: 2 }]);
    storeSet("weddingInfo", { name: "after" });
    await new Promise((r) => setTimeout(r, 0));
    expect(fn1.mock.calls.length).toBe(beforeGuests);
    expect(fn2.mock.calls.length).toBe(beforeWedding);
  });
});

describe("BaseSection.addCleanup() edge cases", () => {
  it("ignores non-function values without throwing", async () => {
    class S extends BaseSection {
      async onMount() {
        // @ts-ignore — intentional bad input
        this.addCleanup(null);
        // @ts-ignore
        this.addCleanup("not-a-function");
      }
    }
    const mod = fromSection(new S("s"));
    await mod.mount();
    expect(() => mod.unmount()).not.toThrow();
  });
});

describe("BaseSection double-unmount safety", () => {
  it("is safe to unmount when never mounted", () => {
    const mod = fromSection(new BaseSection("s"));
    expect(() => mod.unmount()).not.toThrow();
  });

  it("cleanup runs only once even on double-unmount", async () => {
    const cleanup = vi.fn();
    class S extends BaseSection {
      async onMount() {
        this.addCleanup(cleanup);
      }
    }
    const mod = fromSection(new S("s"));
    await mod.mount();
    mod.unmount();
    mod.unmount(); // second call — cleanup must not re-run
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
