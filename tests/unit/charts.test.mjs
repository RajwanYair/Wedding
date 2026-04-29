/**
 * tests/unit/charts.test.mjs — S306: SVG chart utility coverage.
 * @vitest-environment happy-dom
 *
 * Tests pure helpers (escSvg, escHtml) and DOM-rendering helpers
 * (renderDonut, renderBar, setStatText) in src/utils/charts.js.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/core/i18n.js", () => ({ t: (/** @type {string} */ k) => k }));

import {
  renderDonut,
  renderBar,
  setStatText,
  escSvg,
  escHtml,
} from "../../src/utils/charts.js";

// ── Pure escaping helpers ─────────────────────────────────────────────────

describe("S306 — charts — escSvg", () => {
  it("escapes & to &amp;", () => {
    expect(escSvg("a & b")).toBe("a &amp; b");
  });

  it("escapes < to &lt;", () => {
    expect(escSvg("a < b")).toBe("a &lt; b");
  });

  it("escapes > to &gt;", () => {
    expect(escSvg("a > b")).toBe("a &gt; b");
  });

  it("escapes multiple specials in one string", () => {
    expect(escSvg("a & b < c > d")).toBe("a &amp; b &lt; c &gt; d");
  });

  it("passes through clean strings unchanged", () => {
    expect(escSvg("hello world")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(escSvg("")).toBe("");
  });
});

describe("S306 — charts — escHtml", () => {
  it("escapes &", () => {
    expect(escHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes <", () => {
    expect(escHtml("a < b")).toBe("a &lt; b");
  });

  it("escapes >", () => {
    expect(escHtml("a > b")).toBe("a &gt; b");
  });

  it('escapes "', () => {
    expect(escHtml('"quoted"')).toBe("&quot;quoted&quot;");
  });

  it("escapes all specials together", () => {
    expect(escHtml('a & b < c > d "e"')).toBe(
      "a &amp; b &lt; c &gt; d &quot;e&quot;",
    );
  });

  it("passes through clean strings", () => {
    expect(escHtml("hello world")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(escHtml("")).toBe("");
  });
});

// ── DOM helpers ───────────────────────────────────────────────────────────

describe("S306 — charts — renderDonut", () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="donutTest"></div>`;
  });

  it("renders an SVG circle chart into the container", () => {
    renderDonut("donutTest", [
      { label: "confirmed", value: 3, color: "green" },
      { label: "pending", value: 2, color: "orange" },
    ]);
    const c = document.getElementById("donutTest");
    expect(c.innerHTML).toContain("<svg");
    expect(c.innerHTML).toContain("<circle");
  });

  it("renders total text in the SVG", () => {
    renderDonut("donutTest", [{ label: "all", value: 7, color: "blue" }]);
    expect(document.getElementById("donutTest").innerHTML).toContain(">7<");
  });

  it("clears the container when all slice values are zero", () => {
    document.getElementById("donutTest").innerHTML = "old content";
    renderDonut("donutTest", [{ label: "x", value: 0, color: "red" }]);
    expect(document.getElementById("donutTest").textContent).toBe("");
  });

  it("does not throw when container is missing", () => {
    expect(() =>
      renderDonut("nonexistent_id", [{ label: "x", value: 1, color: "red" }]),
    ).not.toThrow();
  });

  it("skips zero-value slices without throwing", () => {
    renderDonut("donutTest", [
      { label: "a", value: 3, color: "blue" },
      { label: "b", value: 0, color: "green" },
    ]);
    const html = document.getElementById("donutTest").innerHTML;
    expect(html).toContain("<svg");
  });
});

describe("S306 — charts — renderBar", () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="barTest"></div>`;
  });

  it("renders an SVG bar chart into the container", () => {
    renderBar("barTest", [
      { label: "Category A", value: 5, color: "blue" },
      { label: "Category B", value: 3, color: "purple" },
    ]);
    const c = document.getElementById("barTest");
    expect(c.innerHTML).toContain("<svg");
    expect(c.innerHTML).toContain("<rect");
  });

  it("renders one rect per bar", () => {
    renderBar("barTest", [
      { label: "X", value: 10, color: "red" },
      { label: "Y", value: 5, color: "green" },
      { label: "Z", value: 2, color: "blue" },
    ]);
    const rects = document.getElementById("barTest").querySelectorAll("rect");
    expect(rects.length).toBe(3);
  });

  it("does not throw when container is missing", () => {
    expect(() =>
      renderBar("nonexistent_id", [{ label: "x", value: 1, color: "red" }]),
    ).not.toThrow();
  });

  it("handles a single bar without throwing", () => {
    renderBar("barTest", [{ label: "Solo", value: 42, color: "teal" }]);
    expect(document.getElementById("barTest").innerHTML).toContain("<svg");
  });
});

describe("S306 — charts — setStatText", () => {
  beforeEach(() => {
    document.body.innerHTML = `<span id="statTest"></span>`;
  });

  it("sets textContent to the string representation of the number", () => {
    setStatText("statTest", 42);
    expect(document.getElementById("statTest").textContent).toBe("42");
  });

  it("handles zero", () => {
    setStatText("statTest", 0);
    expect(document.getElementById("statTest").textContent).toBe("0");
  });

  it("does not throw when element is missing", () => {
    expect(() => setStatText("nonexistent_id", 5)).not.toThrow();
  });
});
