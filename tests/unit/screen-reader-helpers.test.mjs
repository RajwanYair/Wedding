// @ts-check
/**
 * tests/unit/screen-reader-helpers.test.mjs — S584 unit coverage
 *
 * Validates the helper used by the Hebrew screen-reader matrix to derive
 * an accessible name from a DOM element. Mirrors AT name-computation
 * priority: aria-label > title > textContent.
 */
import { describe, it, expect } from "vitest";
import { Window } from "happy-dom";

/** @param {Element} el */
function accessibleName(el) {
  return (
    el.getAttribute("aria-label") ||
    el.getAttribute("title") ||
    el.textContent?.trim() ||
    ""
  );
}

describe("S584 screen-reader name resolution", () => {
  const win = new Window();
  const doc = win.document;

  it("prefers aria-label over textContent", () => {
    const btn = doc.createElement("button");
    btn.setAttribute("aria-label", "אישור הגעה");
    btn.textContent = "OK";
    expect(accessibleName(btn)).toBe("אישור הגעה");
  });

  it("falls back to title when aria-label missing", () => {
    const btn = doc.createElement("button");
    btn.setAttribute("title", "סגור");
    expect(accessibleName(btn)).toBe("סגור");
  });

  it("falls back to trimmed textContent", () => {
    const btn = doc.createElement("button");
    btn.textContent = "  שמירה  ";
    expect(accessibleName(btn)).toBe("שמירה");
  });

  it("returns empty string when nothing is available", () => {
    const btn = doc.createElement("button");
    expect(accessibleName(btn)).toBe("");
  });
});
