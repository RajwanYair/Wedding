/**
 * src/core/animation-timeline.js — S590
 *
 * Lightweight orchestrator for sequencing animations during a view
 * transition.  Wraps `document.startViewTransition` (when available)
 * and exposes a tiny timeline API:
 *
 *   const tl = createTimeline();
 *   tl.at(0,    () => banner.classList.add("slide-in"));
 *   tl.at(150,  () => list.classList.add("fade-in"));
 *   tl.at(400,  () => footer.classList.add("rise"));
 *   await tl.play();
 *
 * The timeline always honours `prefers-reduced-motion: reduce` by
 * collapsing all delays to zero (steps still fire in order so DOM
 * mutations complete deterministically).
 *
 * @owner ui
 */

/**
 * @typedef {object} TimelineStep
 * @property {number} at     // ms offset from timeline start
 * @property {() => void | Promise<void>} fn
 */

/**
 * @returns {boolean}
 */
export function reducedMotionPreferred() {
  if (typeof globalThis.matchMedia !== "function") return false;
  try {
    return globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Build an animation timeline.
 * @returns {{
 *   at: (offsetMs: number, fn: () => void | Promise<void>) => void,
 *   steps: () => TimelineStep[],
 *   duration: () => number,
 *   play: (opts?: { reducedMotion?: boolean }) => Promise<void>,
 * }}
 */
export function createTimeline() {
  /** @type {TimelineStep[]} */
  const steps = [];
  return {
    at(offsetMs, fn) {
      if (!Number.isFinite(offsetMs) || offsetMs < 0) {
        throw new RangeError("createTimeline.at offset must be a non-negative finite number");
      }
      if (typeof fn !== "function") {
        throw new TypeError("createTimeline.at fn must be a function");
      }
      steps.push({ at: offsetMs, fn });
    },
    steps() {
      return steps.slice().sort((a, b) => a.at - b.at);
    },
    duration() {
      return steps.reduce((m, s) => Math.max(m, s.at), 0);
    },
    async play({ reducedMotion = reducedMotionPreferred() } = {}) {
      const ordered = steps.slice().sort((a, b) => a.at - b.at);
      let prevAt = 0;
      for (const step of ordered) {
        if (!reducedMotion) {
          const wait = Math.max(0, step.at - prevAt);
          if (wait > 0) {
            await new Promise((r) => setTimeout(r, wait));
          }
        }
        await step.fn();
        prevAt = step.at;
      }
    },
  };
}

/**
 * Run a timeline inside a view transition when the API is available.
 * Falls back to a plain `play()` otherwise.
 *
 * @param {ReturnType<typeof createTimeline>} timeline
 * @returns {Promise<void>}
 */
export function playInViewTransition(timeline) {
  /** @type {{ startViewTransition?: (cb: () => unknown) => { finished: Promise<void> } }} */
  const doc = /** @type {any} */ (globalThis.document ?? {});
  if (typeof doc.startViewTransition === "function") {
    const transition = doc.startViewTransition(() => timeline.play());
    return transition.finished.catch(() => undefined);
  }
  return timeline.play();
}
