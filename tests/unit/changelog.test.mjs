/**
 * tests/unit/changelog.test.mjs — Changelog section unit tests (Sprint 2 of session)
 * @vitest-environment happy-dom
 *
 * Tests renderChangelog and the module's mount/unmount exports using a DOM stub
 * and a mocked global fetch.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Minimal DOM stub ─────────────────────────────────────────────────────

/** Create a minimal <div id="changelogContent"> and attach it to document. */
function setupDom() {
  const el = document.createElement("div");
  el.id = "changelogContent";
  document.body.appendChild(el);
  return el;
}

function teardownDom() {
  const el = document.getElementById("changelogContent");
  if (el) el.remove();
}

// ── Module under test ────────────────────────────────────────────────────

// We import AFTER setting up the environment each test.
// vitest re-uses the module cache, so we reset the cached HTML via
// the re-import pattern with vi.resetModules().

describe("changelog section — renderChangelog", () => {
  beforeEach(() => {
    setupDom();
    vi.resetModules();
  });

  afterEach(() => {
    teardownDom();
    vi.restoreAllMocks();
  });

  it("renders markdown body as HTML on success", async () => {
    const md = "# Changelog\n## v1.0.0\n- init";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(md),
      }),
    );
    const { renderChangelog } = await import("../../src/sections/changelog.js");
    await renderChangelog();
    const el = document.getElementById("changelogContent");
    // Should contain an <h1> or <h2> from the markdown conversion
    expect(el.innerHTML).toMatch(/<h[12]/i);
  }, 10_000);

  it("shows error message when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );
    const { renderChangelog } = await import("../../src/sections/changelog.js");
    await renderChangelog();
    const el = document.getElementById("changelogContent");
    expect(el.textContent).toMatch(/failed to load/i);
  });

  it("shows error message when fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network error")),
    );
    const { renderChangelog } = await import("../../src/sections/changelog.js");
    await renderChangelog();
    const el = document.getElementById("changelogContent");
    expect(el.textContent).toMatch(/failed to load/i);
  });

  it("does nothing when #changelogContent element is absent", async () => {
    teardownDom(); // remove the element
    vi.stubGlobal("fetch", vi.fn());
    const { renderChangelog } = await import("../../src/sections/changelog.js");
    await expect(renderChangelog()).resolves.toBeUndefined();
    // fetch should NOT have been called since there is no element to render into
    // (early return before fetch)
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("changelog section — mount / unmount", () => {
  beforeEach(() => {
    setupDom();
    vi.resetModules();
  });

  afterEach(() => {
    teardownDom();
    vi.restoreAllMocks();
  });

  it("mount triggers renderChangelog", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("# v1"),
      }),
    );
    const { mount } = await import("../../src/sections/changelog.js");
    // mount is fire-and-forget (does not await); just ensure it does not throw
    expect(() => mount(document.createElement("div"))).not.toThrow();
  });

  it("unmount returns without error", async () => {
    const { unmount } = await import("../../src/sections/changelog.js");
    expect(() => unmount()).not.toThrow();
  });
});
