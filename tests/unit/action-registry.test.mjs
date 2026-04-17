/**
 * tests/unit/action-registry.test.mjs — Unit tests for action-registry.js (Sprint 52)
 */

import { describe, it, expect } from "vitest";
import {
  ACTIONS,
  ACTION_NAMES,
  ACTION_VALUES,
  validateAction,
  listActions,
  buildActionReport,
} from "../../src/core/action-registry.js";

describe("ACTIONS", () => {
  it("is a frozen/const object with string values", () => {
    expect(typeof ACTIONS).toBe("object");
    for (const [k, v] of Object.entries(ACTIONS)) {
      expect(typeof v, `ACTIONS.${k}`).toBe("string");
      expect(v.length, `ACTIONS.${k} is non-empty`).toBeGreaterThan(0);
    }
  });

  it("has at least 50 registered actions", () => {
    expect(Object.keys(ACTIONS).length).toBeGreaterThanOrEqual(50);
  });

  it("includes core navigation and auth actions", () => {
    expect(ACTIONS.SHOW_SECTION).toBe("showSection");
    expect(ACTIONS.SIGN_OUT).toBe("signOut");
    expect(ACTIONS.SUBMIT_EMAIL_LOGIN).toBe("submitEmailLogin");
  });

  it("all action values are unique", () => {
    const values = Object.values(ACTIONS);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("ACTION_NAMES", () => {
  it("is a Map from string value → constant name", () => {
    expect(ACTION_NAMES).toBeInstanceOf(Map);
    expect(ACTION_NAMES.get("showSection")).toBe("SHOW_SECTION");
    expect(ACTION_NAMES.get("signOut")).toBe("SIGN_OUT");
  });

  it("size equals number of ACTIONS keys", () => {
    expect(ACTION_NAMES.size).toBe(Object.keys(ACTIONS).length);
  });
});

describe("ACTION_VALUES", () => {
  it("is a Set", () => {
    expect(ACTION_VALUES).toBeInstanceOf(Set);
  });

  it("contains ACTIONS.SAVE_GUEST", () => {
    expect(ACTION_VALUES.has(ACTIONS.SAVE_GUEST)).toBe(true);
  });

  it("size equals number of ACTIONS keys", () => {
    expect(ACTION_VALUES.size).toBe(Object.keys(ACTIONS).length);
  });
});

describe("validateAction", () => {
  it("returns true for a registered action", () => {
    expect(validateAction("showSection")).toBe(true);
    expect(validateAction(ACTIONS.SAVE_GUEST)).toBe(true);
  });

  it("returns false for an unknown string", () => {
    expect(validateAction("__unknown__")).toBe(false);
  });

  it("returns false for non-strings", () => {
    expect(validateAction(42)).toBe(false);
    expect(validateAction(null)).toBe(false);
    expect(validateAction(undefined)).toBe(false);
    expect(validateAction({})).toBe(false);
  });
});

describe("listActions", () => {
  it("returns a sorted array of all action values", () => {
    const list = listActions();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(ACTION_VALUES.size);
    expect([...list].sort()).toStrictEqual(list);
  });

  it("includes saveGuest", () => {
    expect(listActions()).toContain("saveGuest");
  });
});

describe("buildActionReport", () => {
  it("returns object with actions, count, registered", () => {
    const report = buildActionReport();
    expect(Array.isArray(report.actions)).toBe(true);
    expect(typeof report.count).toBe("number");
    expect(typeof report.registered).toBe("object");
  });

  it("count equals actions length", () => {
    const report = buildActionReport();
    expect(report.count).toBe(report.actions.length);
  });

  it("registered maps string value → constant name", () => {
    const report = buildActionReport();
    expect(report.registered["showSection"]).toBe("SHOW_SECTION");
  });

  it("actions array matches listActions()", () => {
    expect(buildActionReport().actions).toStrictEqual(listActions());
  });
});
