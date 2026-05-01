// @ts-check
/**
 * tests/unit/animation-timeline.test.mjs — S590
 */
import { describe, it, expect, vi } from "vitest";
import {
  createTimeline,
  playInViewTransition,
  reducedMotionPreferred,
} from "../../src/core/animation-timeline.js";

describe("S590 createTimeline", () => {
  it("orders steps by offset on retrieval", () => {
    const tl = createTimeline();
    tl.at(300, () => {});
    tl.at(50, () => {});
    tl.at(150, () => {});
    expect(tl.steps().map((s) => s.at)).toEqual([50, 150, 300]);
  });

  it("duration() returns the largest offset", () => {
    const tl = createTimeline();
    tl.at(0, () => {});
    tl.at(420, () => {});
    expect(tl.duration()).toBe(420);
  });

  it("rejects negative or non-finite offsets", () => {
    const tl = createTimeline();
    expect(() => tl.at(-1, () => {})).toThrow(RangeError);
    expect(() => tl.at(Number.NaN, () => {})).toThrow(RangeError);
  });

  it("rejects non-function callbacks", () => {
    const tl = createTimeline();
    // @ts-expect-error
    expect(() => tl.at(0, "not-a-fn")).toThrow(TypeError);
  });

  it("play() invokes steps in order under reduced motion (no waits)", async () => {
    const calls = [];
    const tl = createTimeline();
    tl.at(0, () => calls.push("a"));
    tl.at(100, () => calls.push("b"));
    tl.at(50, () => calls.push("c"));
    await tl.play({ reducedMotion: true });
    expect(calls).toEqual(["a", "c", "b"]);
  });

  it("play() awaits async step return values", async () => {
    const calls = [];
    const tl = createTimeline();
    tl.at(0, async () => {
      await Promise.resolve();
      calls.push("first");
    });
    tl.at(0, () => calls.push("second"));
    await tl.play({ reducedMotion: true });
    expect(calls).toEqual(["first", "second"]);
  });

  it("reducedMotionPreferred returns boolean and never throws", () => {
    expect(typeof reducedMotionPreferred()).toBe("boolean");
  });

  it("playInViewTransition wraps in startViewTransition when present", async () => {
    const finished = Promise.resolve();
    const startViewTransition = vi.fn(() => ({ finished }));
    /** @type {any} */ (globalThis).document = { startViewTransition };
    const tl = createTimeline();
    tl.at(0, () => {});
    await playInViewTransition(tl);
    expect(startViewTransition).toHaveBeenCalledTimes(1);
    /** @type {any} */ (globalThis).document = undefined;
  });

  it("playInViewTransition falls back when API is missing", async () => {
    /** @type {any} */ (globalThis).document = {};
    const calls = [];
    const tl = createTimeline();
    tl.at(0, () => calls.push("ran"));
    await playInViewTransition(tl);
    expect(calls).toEqual(["ran"]);
    /** @type {any} */ (globalThis).document = undefined;
  });
});
