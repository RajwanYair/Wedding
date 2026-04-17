/**
 * tests/unit/feature-flags.test.mjs — Sprint 134
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  registerFlag, isEnabled, setFlag, resetFlag, resetAllFlags, getAllFlags, applyUrlFlags,
} from "../../src/utils/feature-flags.js";

beforeEach(() => {
  resetAllFlags();
});

describe("registerFlag / isEnabled", () => {
  it("returns default value after registration", () => {
    registerFlag("testFeature", true);
    expect(isEnabled("testFeature")).toBe(true);
  });

  it("returns false for unregistered flag", () => {
    expect(isEnabled("notRegistered")).toBe(false);
  });

  it("default false registers correctly", () => {
    registerFlag("disabledFeature", false);
    expect(isEnabled("disabledFeature")).toBe(false);
  });
});

describe("setFlag / resetFlag", () => {
  it("overrides default to true", () => {
    registerFlag("someFlag", false);
    setFlag("someFlag", true);
    expect(isEnabled("someFlag")).toBe(true);
  });

  it("overrides default to false", () => {
    registerFlag("someFlag", true);
    setFlag("someFlag", false);
    expect(isEnabled("someFlag")).toBe(false);
  });

  it("resetFlag restores default", () => {
    registerFlag("someFlag", true);
    setFlag("someFlag", false);
    resetFlag("someFlag");
    expect(isEnabled("someFlag")).toBe(true);
  });
});

describe("resetAllFlags", () => {
  it("clears all overrides", () => {
    registerFlag("f1", true);
    registerFlag("f2", true);
    setFlag("f1", false);
    setFlag("f2", false);
    resetAllFlags();
    expect(isEnabled("f1")).toBe(true);
    expect(isEnabled("f2")).toBe(true);
  });
});

describe("getAllFlags", () => {
  it("includes registered defaults", () => {
    registerFlag("myFlag", true);
    expect(getAllFlags().myFlag).toBe(true);
  });

  it("overrides show in snapshot", () => {
    registerFlag("myFlag", false);
    setFlag("myFlag", true);
    expect(getAllFlags().myFlag).toBe(true);
  });
});

describe("applyUrlFlags", () => {
  it("sets flags from URLSearchParams with ff_ prefix", () => {
    const params = new URLSearchParams("ff_betaUI=true&ff_darkMode=1");
    applyUrlFlags(params);
    expect(isEnabled("betaUI")).toBe(true);
    expect(isEnabled("darkMode")).toBe(true);
  });

  it("ignores non-ff_ params", () => {
    const params = new URLSearchParams("section=rsvp&ff_beta=true");
    applyUrlFlags(params);
    expect(isEnabled("section")).toBe(false);
    expect(isEnabled("beta")).toBe(true);
  });

  it("accepts plain object", () => {
    applyUrlFlags({ ff_testMode: "true" });
    expect(isEnabled("testMode")).toBe(true);
  });
});
