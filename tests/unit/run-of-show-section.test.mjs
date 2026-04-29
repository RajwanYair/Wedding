/**
 * tests/unit/run-of-show-section.test.mjs — S307: section-module coverage for
 * @vitest-environment happy-dom
 * src/sections/run-of-show.js (the DOM editor, not the schedule service).
 *
 * Uses happy-dom test environment already configured in vite.config.js.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (hoisted by Vitest before static imports) ─────────────────────

const _store = new Map();
vi.mock("../../src/core/storage.js", () => ({
  readBrowserStorageJson: (/** @type {string} */ k) => _store.get(k) ?? null,
  writeBrowserStorageJson: (/** @type {string} */ k, /** @type {unknown} */ v) =>
    _store.set(k, JSON.parse(JSON.stringify(v))),
}));

vi.mock("../../src/core/i18n.js", () => ({
  t: (/** @type {string} */ k) => k,
}));

vi.mock("../../src/core/ui.js", () => ({
  showToast: vi.fn(),
  announce: vi.fn(),
}));

// ── Module under test (static import — mocks apply before this) ─────────

import {
  mount,
  unmount,
  addItem,
  resetDefault,
  capabilities,
} from "../../src/sections/run-of-show.js";

// ── Setup ─────────────────────────────────────────────────────────────────

beforeEach(async () => {
  _store.clear();
  document.body.innerHTML = `
    <div id="rosTimeline"></div>
    <div id="rosOverlapWarnings"></div>
  `;
  // Ensure clean mount state: unmount (resets _items=[]) then re-mount
  // (loads from empty storage → creates default 5-item timeline).
  unmount();
  await mount();
});

// ── Lifecycle ─────────────────────────────────────────────────────────────

describe("S307 — RunOfShowSection — lifecycle", () => {
  it("capabilities is defined", () => {
    expect(capabilities).toBeDefined();
  });

  it("mount renders the 5 default timeline items", () => {
    expect(document.querySelectorAll(".ros-item").length).toBe(5);
  });

  it("each row has a time badge, title input and duration input", () => {
    const row = document.querySelector(".ros-item");
    expect(row).not.toBeNull();
    expect(row.querySelector(".ros-time")).not.toBeNull();
    expect(row.querySelector(".ros-title-input")).not.toBeNull();
    expect(row.querySelector(".ros-duration-input")).not.toBeNull();
  });

  it("mount saves the default timeline to storage", () => {
    const stored = _store.get("wedding_v1_run_of_show");
    expect(Array.isArray(stored)).toBe(true);
    expect(stored.length).toBe(5);
  });

  it("unmount clears the item list so re-mount rebuilds defaults", async () => {
    addItem(); // 6 items now
    unmount();
    document.body.innerHTML = `
      <div id="rosTimeline"></div>
      <div id="rosOverlapWarnings"></div>
    `;
    _store.clear();
    await mount();
    expect(document.querySelectorAll(".ros-item").length).toBe(5);
  });
});

// ── addItem ────────────────────────────────────────────────────────────────

describe("S307 — RunOfShowSection — addItem", () => {
  it("increases row count by one", () => {
    addItem();
    expect(document.querySelectorAll(".ros-item").length).toBe(6);
  });

  it("new row has a valid time badge", () => {
    addItem();
    const rows = [...document.querySelectorAll(".ros-item")];
    const lastTime = rows.at(-1).querySelector(".ros-time").textContent;
    // Expect HH:MM format
    expect(lastTime).toMatch(/^\d{2}:\d{2}$/);
  });

  it("new row has a delete button", () => {
    addItem();
    const lastRow = [...document.querySelectorAll(".ros-item")].at(-1);
    expect(lastRow.querySelector(".btn-danger")).not.toBeNull();
  });

  it("persists new item to storage", () => {
    addItem();
    const stored = _store.get("wedding_v1_run_of_show");
    expect(stored.length).toBe(6);
  });

  it("calling addItem multiple times stacks items", () => {
    addItem();
    addItem();
    addItem();
    expect(document.querySelectorAll(".ros-item").length).toBe(8);
  });
});

// ── resetDefault ──────────────────────────────────────────────────────────

describe("S307 — RunOfShowSection — resetDefault", () => {
  it("resets count to 5 regardless of how many items were added", () => {
    addItem();
    addItem();
    addItem(); // 8 items
    resetDefault();
    expect(document.querySelectorAll(".ros-item").length).toBe(5);
  });

  it("persists exactly 5 items to storage", () => {
    addItem();
    resetDefault();
    const stored = _store.get("wedding_v1_run_of_show");
    expect(stored.length).toBe(5);
  });
});

// ── Overlap warnings ─────────────────────────────────────────────────────

describe("S307 — RunOfShowSection — overlap warnings", () => {
  it("overlap warning container is hidden when no overlaps exist", () => {
    const container = document.getElementById("rosOverlapWarnings");
    expect(container.classList.contains("u-hidden")).toBe(true);
  });
});
