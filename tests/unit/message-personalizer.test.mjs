/**
 * tests/unit/message-personalizer.test.mjs — Sprint 55 / C1
 * Unit tests for src/services/message-personalizer.js
 */

import { describe, it, expect } from "vitest";
import {
  personalizeMessage,
  getVariableHints,
  WEDDING_TEMPLATES,
} from "../../src/services/message-tools.js";

// ── personalizeMessage ─────────────────────────────────────────────────────

const INFO = { date: "15.08.2025", venue: "Garden Hall", groom: "Joseph", bride: "Miriam" };
const GUEST = { id: "g1", firstName: "Alice", lastName: "Smith", phone: "0541234567" };

describe("personalizeMessage — single-brace tokens", () => {
  it("replaces {name} with full name", () => {
    expect(personalizeMessage("Hello {name}!", GUEST, INFO)).toBe("Hello Alice Smith!");
  });

  it("replaces {firstName}", () => {
    expect(personalizeMessage("Hi {firstName}!", GUEST, INFO)).toBe("Hi Alice!");
  });

  it("replaces {date} from info", () => {
    expect(personalizeMessage("{date}", GUEST, INFO)).toBe("15.08.2025");
  });

  it("replaces {venue}", () => {
    expect(personalizeMessage("{venue}", GUEST, INFO)).toBe("Garden Hall");
  });

  it("replaces {groom} and {bride}", () => {
    expect(personalizeMessage("{groom} & {bride}", GUEST, INFO)).toBe("Joseph & Miriam");
  });

  it("replaces {tableName} when provided", () => {
    expect(personalizeMessage("Table: {tableName}", GUEST, INFO, "Table 3")).toBe("Table: Table 3");
  });

  it("replaces {tableName} with empty string when not provided", () => {
    expect(personalizeMessage("Table: {tableName}", GUEST, INFO)).toBe("Table: ");
  });

  it("handles missing info fields gracefully", () => {
    expect(personalizeMessage("{date}", GUEST, {})).toBe("");
  });

  it("handles guest with no last name", () => {
    const g = { ...GUEST, lastName: undefined };
    expect(personalizeMessage("{name}", g, INFO)).toBe("Alice");
  });
});

describe("personalizeMessage — double-brace tokens", () => {
  it("replaces {{date}}", () => {
    expect(personalizeMessage("{{date}}", GUEST, INFO)).toBe("15.08.2025");
  });

  it("replaces {{firstName}}", () => {
    expect(personalizeMessage("Hi {{firstName}}!", GUEST, INFO)).toBe("Hi Alice!");
  });

  it("handles {{#if tableName}} conditional when truthy", () => {
    const tpl = "{{#if tableName}}Seat: {{tableName}}{{/if}}";
    expect(personalizeMessage(tpl, GUEST, INFO, "Table 5")).toBe("Seat: Table 5");
  });

  it("collapses {{#if tableName}} when falsy", () => {
    const tpl = "{{#if tableName}}Seat: {{tableName}}{{/if}}";
    expect(personalizeMessage(tpl, GUEST, INFO, "")).toBe("");
  });
});

// ── getVariableHints ───────────────────────────────────────────────────────

describe("getVariableHints", () => {
  it("returns an array", () => {
    expect(Array.isArray(getVariableHints())).toBe(true);
  });

  it("includes a hint for 'name'", () => {
    const hints = getVariableHints();
    expect(hints.some((h) => h.key === "name")).toBe(true);
  });

  it("includes a hint for 'date'", () => {
    expect(getVariableHints().some((h) => h.key === "date")).toBe(true);
  });

  it("each hint has key, label, exampleHe, exampleEn", () => {
    for (const h of getVariableHints()) {
      expect(h).toHaveProperty("key");
      expect(h).toHaveProperty("label");
      expect(h).toHaveProperty("exampleHe");
      expect(h).toHaveProperty("exampleEn");
    }
  });

  it("label matches {key} pattern", () => {
    for (const h of getVariableHints()) {
      expect(h.label).toBe(`{${h.key}}`);
    }
  });
});

// ── WEDDING_TEMPLATES ──────────────────────────────────────────────────────

describe("WEDDING_TEMPLATES", () => {
  it("has 'invite' template", () => {
    expect(typeof WEDDING_TEMPLATES.invite).toBe("string");
    expect(WEDDING_TEMPLATES.invite.length).toBeGreaterThan(10);
  });

  it("has 'confirm' template", () => {
    expect(typeof WEDDING_TEMPLATES.confirm).toBe("string");
  });

  it("has 'reminder' template with {rsvpLink}", () => {
    expect(WEDDING_TEMPLATES.reminder).toContain("{rsvpLink}");
  });

  it("has 'table' template with {tableName}", () => {
    expect(WEDDING_TEMPLATES.table).toContain("{tableName}");
  });

  it("all templates are non-empty strings", () => {
    for (const [, v] of Object.entries(WEDDING_TEMPLATES)) {
      expect(typeof v).toBe("string");
      expect(v.length).toBeGreaterThan(0);
    }
  });

  it("invite template personalizes correctly", () => {
    const msg = personalizeMessage(WEDDING_TEMPLATES.invite, GUEST, INFO);
    expect(msg).toContain("Alice");
    expect(msg).toContain("15.08.2025");
    expect(msg).toContain("Garden Hall");
  });
});
