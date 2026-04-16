/**
 * tests/unit/dom.test.mjs — Unit tests for dom core module
 * Covers: el proxy · clearDomCache · warmDom
 *
 * @vitest-environment happy-dom
 * Run: npm test
 */

import { describe, it, expect, beforeEach } from "vitest";
import { el, clearDomCache, warmDom } from "../../src/core/dom.js";

describe("el proxy", () => {
  beforeEach(() => {
    document.body.textContent = "";
    clearDomCache();
  });

  it("returns null for non-existent element", () => {
    expect(el.nonExistentElement).toBeNull();
  });

  it("returns DOM element by camelCase ID", () => {
    const div = document.createElement("div");
    div.id = "testDiv";
    document.body.appendChild(div);
    expect(el.testDiv).toBe(div);
  });

  it("caches element on second access", () => {
    const div = document.createElement("div");
    div.id = "cachedEl";
    document.body.appendChild(div);
    const first = el.cachedEl;
    document.body.removeChild(div);
    // Still returns cached ref even though DOM changed
    expect(el.cachedEl).toBe(first);
  });

  it("supports setting values", () => {
    el.myCustom = document.createElement("span");
    expect(el.myCustom).toBeInstanceOf(HTMLSpanElement);
    clearDomCache();
  });
});

// ── clearDomCache ────────────────────────────────────────────────────────

describe("clearDomCache", () => {
  beforeEach(() => {
    document.body.textContent = "";
    clearDomCache();
  });

  it("clears previously cached refs", () => {
    const div = document.createElement("div");
    div.id = "clearMe";
    document.body.appendChild(div);
    el.clearMe; // cache it
    document.body.removeChild(div);
    clearDomCache();
    expect(el.clearMe).toBeNull(); // re-looks up, now null
  });
});

// ── warmDom ──────────────────────────────────────────────────────────────

describe("warmDom", () => {
  beforeEach(() => {
    document.body.textContent = "";
    clearDomCache();
  });

  it("pre-caches specified IDs", () => {
    const a = document.createElement("div");
    a.id = "warmA";
    document.body.appendChild(a);
    const b = document.createElement("div");
    b.id = "warmB";
    document.body.appendChild(b);

    warmDom("warmA", "warmB");
    // Remove from DOM — cached values should persist
    document.body.removeChild(a);
    document.body.removeChild(b);
    expect(el.warmA).toBe(a);
    expect(el.warmB).toBe(b);
    clearDomCache();
  });

  it("does not throw for non-existent IDs", () => {
    expect(() => warmDom("noExist1", "noExist2")).not.toThrow();
  });
});
