/**
 * tests/unit/action-registry-namespacing.test.mjs
 */

import { describe, it, expect } from "vitest";
import {
  ACTIONS,
  namespaced,
  parseAction,
  getActionsByNamespace,
  findDuplicateActions,
} from "../../src/core/action-registry.js";

describe("namespaced()", () => {
  it("joins namespace + name with ':'", () => {
    expect(namespaced("guests", "save")).toBe("guests:save");
  });

  it("rejects empty inputs", () => {
    expect(() => namespaced("", "save")).toThrow();
    expect(() => namespaced("guests", "")).toThrow();
  });

  it("rejects inputs containing ':'", () => {
    expect(() => namespaced("guests:nope", "save")).toThrow();
    expect(() => namespaced("guests", "save:also")).toThrow();
  });
});

describe("parseAction()", () => {
  it("returns null namespace for flat names", () => {
    expect(parseAction("saveGuest")).toEqual({
      namespace: null,
      name: "saveGuest",
      raw: "saveGuest",
    });
  });

  it("splits namespaced names on first ':'", () => {
    expect(parseAction("guests:save")).toEqual({
      namespace: "guests",
      name: "save",
      raw: "guests:save",
    });
  });

  it("preserves additional ':' in the local name", () => {
    expect(parseAction("ns:complex:name")).toEqual({
      namespace: "ns",
      name: "complex:name",
      raw: "ns:complex:name",
    });
  });
});

describe("getActionsByNamespace()", () => {
  it("returns matching legacy flat names case-insensitively", () => {
    const matches = getActionsByNamespace("guest");
    expect(matches).toContain(ACTIONS.SAVE_GUEST);
    expect(matches).toContain(ACTIONS.ADD_GUEST_NOTE);
  });

  it("returns [] for unknown namespace", () => {
    expect(getActionsByNamespace("nonexistent_namespace_xyz")).toEqual([]);
  });

  it("returns [] for empty namespace", () => {
    expect(getActionsByNamespace("")).toEqual([]);
  });
});

describe("findDuplicateActions()", () => {
  it("returns [] when the canonical registry is clean", () => {
    expect(findDuplicateActions()).toEqual([]);
  });

  it("flags duplicate values in a custom registry", () => {
    const dups = findDuplicateActions({ A: "x", B: "x", C: "y" });
    expect(dups).toEqual(["x"]);
  });
});
