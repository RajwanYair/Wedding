/**
 * tests/unit/skeleton.test.mjs — Unit tests for skeleton loading utilities (Sprint 32)
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  showSkeleton,
  hideSkeleton,
  isSkeletonVisible,
  createSkeletonRows,
  clearSkeletonRows,
  runWithSkeleton,
} from "../../src/utils/skeleton.js";

/** @returns {HTMLElement} */
function makeContainer() {
  const div = document.createElement("div");
  div.innerHTML = `
    <div data-skeleton hidden>Loading...</div>
    <div data-skeleton hidden>Loading...</div>
    <div data-skeleton-hide>Real content</div>
  `;
  return div;
}

// ── showSkeleton ──────────────────────────────────────────────────────────

describe("showSkeleton", () => {
  let container;
  beforeEach(() => { container = makeContainer(); });

  it("removes hidden from [data-skeleton] elements", () => {
    showSkeleton(container);
    container.querySelectorAll("[data-skeleton]").forEach((el) => {
      expect(el.hasAttribute("hidden")).toBe(false);
    });
  });

  it("adds hidden to [data-skeleton-hide] elements", () => {
    showSkeleton(container);
    container.querySelectorAll("[data-skeleton-hide]").forEach((el) => {
      expect(el.hasAttribute("hidden")).toBe(true);
    });
  });

  it("sets aria-busy=true on container", () => {
    showSkeleton(container);
    expect(container.getAttribute("aria-busy")).toBe("true");
  });
});

// ── hideSkeleton ──────────────────────────────────────────────────────────

describe("hideSkeleton", () => {
  let container;
  beforeEach(() => { container = makeContainer(); showSkeleton(container); });

  it("hides [data-skeleton] elements", () => {
    hideSkeleton(container);
    container.querySelectorAll("[data-skeleton]").forEach((el) => {
      expect(el.hasAttribute("hidden")).toBe(true);
    });
  });

  it("reveals [data-skeleton-hide] elements", () => {
    hideSkeleton(container);
    container.querySelectorAll("[data-skeleton-hide]").forEach((el) => {
      expect(el.hasAttribute("hidden")).toBe(false);
    });
  });

  it("removes aria-busy from container", () => {
    hideSkeleton(container);
    expect(container.hasAttribute("aria-busy")).toBe(false);
  });
});

// ── isSkeletonVisible ─────────────────────────────────────────────────────

describe("isSkeletonVisible", () => {
  let container;
  beforeEach(() => { container = makeContainer(); });

  it("returns false initially", () => {
    expect(isSkeletonVisible(container)).toBe(false);
  });

  it("returns true after showSkeleton", () => {
    showSkeleton(container);
    expect(isSkeletonVisible(container)).toBe(true);
  });

  it("returns false after hideSkeleton", () => {
    showSkeleton(container);
    hideSkeleton(container);
    expect(isSkeletonVisible(container)).toBe(false);
  });
});

// ── createSkeletonRows ────────────────────────────────────────────────────

describe("createSkeletonRows", () => {
  let container;
  beforeEach(() => { container = document.createElement("div"); });

  it("injects the specified number of rows", () => {
    createSkeletonRows(container, 5);
    expect(container.querySelectorAll("[data-skeleton]")).toHaveLength(5);
  });

  it("uses default className 'skeleton-row'", () => {
    createSkeletonRows(container, 2);
    container.querySelectorAll("[data-skeleton]").forEach((el) => {
      expect(el.className).toBe("skeleton-row");
    });
  });

  it("respects custom className", () => {
    createSkeletonRows(container, 2, { className: "custom-skel" });
    container.querySelectorAll("[data-skeleton]").forEach((el) => {
      expect(el.className).toBe("custom-skel");
    });
  });

  it("removes existing [data-skeleton] rows before injecting", () => {
    createSkeletonRows(container, 3);
    createSkeletonRows(container, 2); // replace with 2
    expect(container.querySelectorAll("[data-skeleton]")).toHaveLength(2);
  });

  it("rows have aria-hidden=true", () => {
    createSkeletonRows(container, 1);
    expect(container.querySelector("[data-skeleton]").getAttribute("aria-hidden")).toBe("true");
  });
});

// ── clearSkeletonRows ─────────────────────────────────────────────────────

describe("clearSkeletonRows", () => {
  it("removes all [data-skeleton] elements", () => {
    const container = document.createElement("div");
    createSkeletonRows(container, 4);
    clearSkeletonRows(container);
    expect(container.querySelectorAll("[data-skeleton]")).toHaveLength(0);
  });
});

// ── runWithSkeleton ────────────────────────────────────────────────────────

describe("runWithSkeleton", () => {
  let container;
  beforeEach(() => { container = makeContainer(); });

  it("shows skeleton before calling fn", async () => {
    let visibleDuring = false;
    await runWithSkeleton(container, async () => {
      visibleDuring = isSkeletonVisible(container);
    });
    expect(visibleDuring).toBe(true);
  });

  it("hides skeleton after fn resolves", async () => {
    await runWithSkeleton(container, async () => "done");
    expect(isSkeletonVisible(container)).toBe(false);
  });

  it("hides skeleton even if fn rejects", async () => {
    await expect(
      runWithSkeleton(container, async () => { throw new Error("fail"); }),
    ).rejects.toThrow("fail");
    expect(isSkeletonVisible(container)).toBe(false);
  });

  it("returns the fn return value", async () => {
    const result = await runWithSkeleton(container, async () => 42);
    expect(result).toBe(42);
  });
});
