/**
 * tests/unit/message-templates.test.mjs — Unit tests for message template system (Sprint 41)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  registerTemplate,
  getTemplate,
  listTemplates,
  escapeValue,
  renderTemplate,
  renderNamed,
  TEMPLATES,
} from "../../src/utils/message-templates.js";

// ── escapeValue ───────────────────────────────────────────────────────────

describe("escapeValue", () => {
  it("returns empty string for null", () => {
    expect(escapeValue(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(escapeValue(undefined)).toBe("");
  });

  it("coerces number to string", () => {
    expect(escapeValue(42)).toBe("42");
  });

  it("escapes backticks", () => {
    expect(escapeValue("hello`world")).toBe("hello\\`world");
  });

  it("escapes backslashes", () => {
    expect(escapeValue("a\\b")).toBe("a\\\\b");
  });

  it("plain text passes through unchanged", () => {
    expect(escapeValue("Alice")).toBe("Alice");
  });
});

// ── renderTemplate ────────────────────────────────────────────────────────

describe("renderTemplate", () => {
  it("replaces a single variable", () => {
    expect(renderTemplate("Hello {{name}}", { name: "Alice" })).toBe("Hello Alice");
  });

  it("replaces multiple variables", () => {
    const result = renderTemplate("{{a}} + {{b}}", { a: "foo", b: "bar" });
    expect(result).toBe("foo + bar");
  });

  it("collapses unknown variables to empty string", () => {
    expect(renderTemplate("Hey {{ghost}}", {})).toBe("Hey ");
  });

  it("renders truthy conditional block", () => {
    const result = renderTemplate("Hi{{#if showMore}} - extra{{/if}}", { showMore: true });
    expect(result).toBe("Hi - extra");
  });

  it("collapses falsy conditional block", () => {
    const result = renderTemplate("Hi{{#if showMore}} - extra{{/if}}", { showMore: false });
    expect(result).toBe("Hi");
  });

  it("conditionals work with string variables inside", () => {
    const result = renderTemplate("{{#if table}}Table: {{table}}{{/if}}", { table: "T1" });
    expect(result).toContain("Table: T1");
  });

  it("collapses conditional when variable is empty string", () => {
    const result = renderTemplate("A{{#if x}}B{{/if}}C", { x: "" });
    expect(result).toBe("AC");
  });

  it("skip escaping when escape: false", () => {
    const result = renderTemplate("{{v}}", { v: "a`b" }, { escape: false });
    expect(result).toBe("a`b");
  });
});

// ── registerTemplate / getTemplate / listTemplates ────────────────────────

describe("template registry", () => {
  it("registers and retrieves a template", () => {
    registerTemplate("test_tmpl", "Hello {{name}}");
    expect(getTemplate("test_tmpl")).toBe("Hello {{name}}");
  });

  it("listTemplates includes registered name", () => {
    registerTemplate("listcheck", "x");
    expect(listTemplates()).toContain("listcheck");
  });

  it("listTemplates includes built-in templates", () => {
    const names = listTemplates();
    expect(names).toContain("rsvpConfirm");
    expect(names).toContain("rsvpDecline");
  });

  it("getTemplate returns undefined for unknown name", () => {
    expect(getTemplate("__nonexistent__")).toBeUndefined();
  });
});

// ── renderNamed ───────────────────────────────────────────────────────────

describe("renderNamed", () => {
  it("renders a registered template by name", () => {
    registerTemplate("greet", "Hi {{n}}!");
    expect(renderNamed("greet", { n: "Bob" })).toBe("Hi Bob!");
  });

  it("returns null for unknown template name", () => {
    expect(renderNamed("__no_such_template__", {})).toBeNull();
  });
});

// ── TEMPLATES (built-ins) ─────────────────────────────────────────────────

describe("TEMPLATES built-ins", () => {
  it("rsvpConfirm includes firstName and weddingDate", () => {
    const msg = renderTemplate(TEMPLATES.rsvpConfirm, {
      firstName: "Alice",
      weddingDate: "15.08.2025",
    });
    expect(msg).toContain("Alice");
    expect(msg).toContain("15.08.2025");
  });

  it("rsvpConfirm includes tableName when provided", () => {
    const msg = renderTemplate(TEMPLATES.rsvpConfirm, {
      firstName: "Bob",
      weddingDate: "15.08.2025",
      tableName: "שולחן 3",
    });
    expect(msg).toContain("שולחן 3");
  });

  it("rsvpConfirm omits tableName block when not provided", () => {
    const msg = renderTemplate(TEMPLATES.rsvpConfirm, {
      firstName: "Carol",
      weddingDate: "15.08.2025",
    });
    expect(msg).not.toContain("מקום ישיבה");
  });

  it("generalInfo includes all venue details", () => {
    const msg = renderTemplate(TEMPLATES.generalInfo, {
      weddingDate: "15.08.2025",
      venueName: "Grand Hall",
      weddingTime: "18:00",
    });
    expect(msg).toContain("Grand Hall");
    expect(msg).toContain("18:00");
  });
});
