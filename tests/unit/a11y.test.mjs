/**
 * tests/unit/a11y.test.mjs — Unit tests for accessibility audit utilities (Sprint 34)
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect } from "vitest";
import {
  auditImages,
  auditForms,
  auditHeadings,
  auditInteractive,
  auditAll,
} from "../../src/utils/a11y.js";

/** @param {string} html @returns {Element} */
function el(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div;
}

// ── auditImages ───────────────────────────────────────────────────────────

describe("auditImages", () => {
  it("flags <img> with no alt attribute", () => {
    const issues = auditImages(el('<img src="a.png">'));
    expect(issues.some((i) => i.rule === "img-alt")).toBe(true);
  });

  it("does not flag <img> with empty alt (decorative)", () => {
    expect(auditImages(el('<img src="a.png" alt="">'))).toHaveLength(0);
  });

  it("does not flag <img> with descriptive alt", () => {
    expect(auditImages(el('<img src="a.png" alt="Wedding photo">'))).toHaveLength(0);
  });

  it("returns empty array when no images", () => {
    expect(auditImages(el("<p>text</p>"))).toHaveLength(0);
  });
});

// ── auditForms ────────────────────────────────────────────────────────────

describe("auditForms", () => {
  it("flags input without label or aria-label", () => {
    const issues = auditForms(el('<form><input type="text" id="name"></form>'));
    expect(issues.some((i) => i.rule === "label-missing")).toBe(true);
  });

  it("passes when <label for=id> matches input", () => {
    const issues = auditForms(
      el('<form><label for="n">Name</label><input id="n" type="text"></form>'),
    );
    expect(issues).toHaveLength(0);
  });

  it("passes when input has aria-label", () => {
    expect(
      auditForms(el('<input type="text" aria-label="Search">')),
    ).toHaveLength(0);
  });

  it("passes when input has aria-labelledby", () => {
    expect(
      auditForms(el('<span id="lbl">Name</span><input type="text" aria-labelledby="lbl">')),
    ).toHaveLength(0);
  });

  it("passes when input is wrapped in <label>", () => {
    expect(
      auditForms(el("<label>Name <input type='text'></label>")),
    ).toHaveLength(0);
  });

  it("ignores hidden and submit inputs", () => {
    expect(
      auditForms(el('<input type="hidden"><input type="submit" value="Go">')),
    ).toHaveLength(0);
  });
});

// ── auditHeadings ─────────────────────────────────────────────────────────

describe("auditHeadings", () => {
  it("flags h1 → h3 (skipping h2)", () => {
    const issues = auditHeadings(el("<h1>Title</h1><h3>Section</h3>"));
    expect(issues.some((i) => i.rule === "heading-skip")).toBe(true);
    expect(issues[0].message).toContain("h1 → h3");
  });

  it("passes for h1 → h2 → h3 (no skips)", () => {
    expect(
      auditHeadings(el("<h1>A</h1><h2>B</h2><h3>C</h3>")),
    ).toHaveLength(0);
  });

  it("passes for single h1", () => {
    expect(auditHeadings(el("<h1>Only heading</h1>"))).toHaveLength(0);
  });

  it("passes for h1 → h2 → h2 (repeat same level)", () => {
    expect(
      auditHeadings(el("<h1>A</h1><h2>B</h2><h2>C</h2>")),
    ).toHaveLength(0);
  });
});

// ── auditInteractive ──────────────────────────────────────────────────────

describe("auditInteractive", () => {
  it("flags button with no text or aria-label", () => {
    const issues = auditInteractive(el("<button></button>"));
    expect(issues.some((i) => i.rule === "interactive-name")).toBe(true);
  });

  it("passes button with text content", () => {
    expect(auditInteractive(el("<button>Submit</button>"))).toHaveLength(0);
  });

  it("passes button with aria-label", () => {
    expect(auditInteractive(el('<button aria-label="Close"></button>'))).toHaveLength(0);
  });

  it("passes <a> with text", () => {
    expect(auditInteractive(el('<a href="#">Home</a>'))).toHaveLength(0);
  });

  it("flags <a> with no accessible name", () => {
    const issues = auditInteractive(el('<a href="#"></a>'));
    expect(issues.some((i) => i.rule === "interactive-name")).toBe(true);
  });

  it("passes icon button with title", () => {
    expect(
      auditInteractive(el('<button title="Delete"><span class="icon">×</span></button>')),
    ).toHaveLength(0);
  });
});

// ── auditAll ──────────────────────────────────────────────────────────────

describe("auditAll", () => {
  it("aggregates all audit results", () => {
    const root = el(`
      <img src="bad.png">
      <button></button>
      <h1>A</h1><h3>C</h3>
      <input type="text" id="unlabelled">
    `);
    const issues = auditAll(root);
    const rules = new Set(issues.map((i) => i.rule));
    expect(rules.has("img-alt")).toBe(true);
    expect(rules.has("interactive-name")).toBe(true);
    expect(rules.has("heading-skip")).toBe(true);
    expect(rules.has("label-missing")).toBe(true);
  });

  it("returns empty array for accessible markup", () => {
    const root = el(`
      <img src="a.png" alt="Wedding photo">
      <button>Submit</button>
      <h1>Title</h1><h2>Section</h2>
      <label for="n">Name</label><input id="n" type="text">
    `);
    expect(auditAll(root)).toHaveLength(0);
  });
});
