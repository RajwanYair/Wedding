/**
 * tests/unit/render-helpers.test.mjs
 * @vitest-environment happy-dom
 *
 * Unit tests for src/utils/render-helpers.js
 * Tests: renderEmpty, renderLoading, renderError, renderCount
 */

import { describe, it, expect, vi } from "vitest";

// Mock i18n so t() returns the key (predictable in tests)
vi.mock("../../src/core/i18n.js", () => ({ t: (k) => k }));

const { renderEmpty, renderLoading, renderError, renderCount } =
  await import("../../src/utils/render-helpers.js");

// ── renderEmpty ───────────────────────────────────────────────────────────

describe("renderEmpty", () => {
  it("renders a container with the i18n message", () => {
    const html = renderEmpty("no_guests_yet");
    expect(html).toContain("no_guests_yet");
    expect(html).toContain('class="empty-state"');
  });

  it("escapes < > & in messages", () => {
    const html = renderEmpty("<script>alert(1)</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("includes CTA button when actionKey and action provided", () => {
    const html = renderEmpty("no_items", { actionKey: "add_first", action: "add-guest" });
    expect(html).toContain('data-action="add-guest"');
    expect(html).toContain("add_first");
  });

  it("escapes data-action attribute", () => {
    const html = renderEmpty("msg", { actionKey: "key", action: '"><script>' });
    expect(html).not.toContain('"><script>');
    expect(html).toContain("&quot;&gt;&lt;script&gt;");
  });

  it("uses default icon when none provided", () => {
    const html = renderEmpty("msg");
    expect(html).toContain("📭");
  });

  it("uses custom icon when provided", () => {
    const html = renderEmpty("msg", { icon: "🎉" });
    expect(html).toContain("🎉");
  });

  it("has role=status for accessibility", () => {
    const html = renderEmpty("msg");
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });
});

// ── renderLoading ─────────────────────────────────────────────────────────

describe("renderLoading", () => {
  it("renders the requested number of skeleton rows", () => {
    const html = renderLoading(5);
    const matches = (html.match(/skeleton-row/g) ?? []).length;
    expect(matches).toBeGreaterThanOrEqual(5);
  });

  it("defaults to 3 rows", () => {
    const html = renderLoading();
    const matches = (html.match(/skeleton-row/g) ?? []).length;
    expect(matches).toBeGreaterThanOrEqual(3);
  });

  it("includes role=status", () => {
    const html = renderLoading(2);
    expect(html).toContain('role="status"');
  });

  it("applies the variant modifier class", () => {
    const html = renderLoading(1, { variant: "card" });
    expect(html).toContain("skeleton-row--card");
  });
});

// ── renderError ───────────────────────────────────────────────────────────

describe("renderError", () => {
  it("renders the error message", () => {
    const html = renderError("Something went wrong");
    expect(html).toContain("Something went wrong");
    expect(html).toContain('role="alert"');
  });

  it("escapes HTML in error message", () => {
    const html = renderError("<b>bad</b>");
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;b&gt;");
  });

  it("includes retry button when retryAction provided", () => {
    const html = renderError("Error", { retryAction: "reload-section" });
    expect(html).toContain('data-action="reload-section"');
  });

  it("omits retry button when retryAction not provided", () => {
    const html = renderError("Error");
    expect(html).not.toContain("data-action");
  });

  it("uses aria-live=assertive for errors", () => {
    const html = renderError("Critical");
    expect(html).toContain('aria-live="assertive"');
  });
});

// ── renderCount ───────────────────────────────────────────────────────────

describe("renderCount", () => {
  it("renders the count as a badge", () => {
    const html = renderCount(42);
    expect(html).toContain("42");
    expect(html).toContain('class="badge"');
  });

  it("renders 999+ for counts over 999", () => {
    const html = renderCount(1500);
    expect(html).toContain("999+");
  });

  it("clamps negative to 0", () => {
    const html = renderCount(-5);
    expect(html).toContain(">0<");
  });

  it("includes sr-only label when provided", () => {
    const html = renderCount(3, { label: "Guests" });
    expect(html).toContain("Guests");
  });
});
