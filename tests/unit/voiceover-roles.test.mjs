// @ts-check
/**
 * tests/unit/voiceover-roles.test.mjs — S585 VO role/labelling helpers
 */
import { describe, it, expect } from "vitest";
import { Window } from "happy-dom";

/** @param {Element} el */
function isVoSilent(el) {
  // VO is silenced when aria-roledescription is set to an empty string.
  if (!el.hasAttribute("aria-roledescription")) return false;
  return (el.getAttribute("aria-roledescription") || "").trim() === "";
}

/** @param {Element} dialog */
function dialogHasName(dialog) {
  return Boolean(
    dialog.getAttribute("aria-labelledby") || dialog.getAttribute("aria-label"),
  );
}

describe("S585 VoiceOver semantics", () => {
  const win = new Window();
  const doc = win.document;

  it("flags empty aria-roledescription as VO-silent", () => {
    const el = doc.createElement("button");
    el.setAttribute("aria-roledescription", "");
    expect(isVoSilent(el)).toBe(true);
  });

  it("non-empty aria-roledescription is announced", () => {
    const el = doc.createElement("button");
    el.setAttribute("aria-roledescription", "כפתור הזמנה");
    expect(isVoSilent(el)).toBe(false);
  });

  it("element without aria-roledescription is not silenced", () => {
    const el = doc.createElement("button");
    expect(isVoSilent(el)).toBe(false);
  });

  it("dialog with aria-label is named", () => {
    const d = doc.createElement("dialog");
    d.setAttribute("aria-label", "הוספת אורח");
    expect(dialogHasName(d)).toBe(true);
  });

  it("dialog without label or labelledby is unnamed", () => {
    const d = doc.createElement("dialog");
    expect(dialogHasName(d)).toBe(false);
  });
});
