/**
 * tests/unit/guest-tagging.test.mjs — Sprint 125
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore } from "../../src/core/store.js";

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

const {
  registerTag, removeTag, listTags,
  addTagToGuest, removeTagFromGuest, getGuestTags, getGuestsByTag,
} = await import("../../src/utils/guest-tagging.js");

function seed() {
  initStore({
    guestTags: { value: [] },
    guests:    { value: [
      { id: "g1", firstName: "Alice", status: "pending", tags: [] },
      { id: "g2", firstName: "Bob",   status: "confirmed", tags: [] },
    ] },
    weddingInfo: { value: {} },
  });
}

beforeEach(seed);

describe("registerTag", () => {
  it("adds a new tag and normalises to lowercase", () => {
    registerTag("VIP");
    expect(listTags()).toContain("vip");
  });

  it("returns false for duplicate tag", () => {
    registerTag("vip");
    expect(registerTag("VIP")).toBe(false);
  });

  it("throws on empty tag", () => {
    expect(() => registerTag("")).toThrow();
  });
});

describe("removeTag", () => {
  it("removes tag from registry", () => {
    registerTag("vip");
    removeTag("vip");
    expect(listTags()).not.toContain("vip");
  });

  it("strips tag from all guests", () => {
    registerTag("vip");
    addTagToGuest("g1", "vip");
    removeTag("vip");
    expect(getGuestTags("g1")).not.toContain("vip");
  });

  it("returns false for unknown tag", () => {
    expect(removeTag("unknown")).toBe(false);
  });
});

describe("addTagToGuest", () => {
  it("adds tag to guest", () => {
    addTagToGuest("g1", "vip");
    expect(getGuestTags("g1")).toContain("vip");
  });

  it("auto-registers tag globally", () => {
    addTagToGuest("g1", "family");
    expect(listTags()).toContain("family");
  });

  it("returns false for unknown guest", () => {
    expect(addTagToGuest("unknown", "vip")).toBe(false);
  });

  it("returns false for duplicate tag on same guest", () => {
    addTagToGuest("g1", "vip");
    expect(addTagToGuest("g1", "vip")).toBe(false);
  });
});

describe("removeTagFromGuest", () => {
  it("removes tag from guest", () => {
    addTagToGuest("g1", "vip");
    removeTagFromGuest("g1", "vip");
    expect(getGuestTags("g1")).not.toContain("vip");
  });

  it("returns false if tag not on guest", () => {
    expect(removeTagFromGuest("g1", "vip")).toBe(false);
  });
});

describe("getGuestsByTag", () => {
  it("returns guests with the tag", () => {
    addTagToGuest("g1", "vip");
    addTagToGuest("g2", "vip");
    expect(getGuestsByTag("vip")).toHaveLength(2);
  });

  it("returns empty for unknown tag", () => {
    expect(getGuestsByTag("nope")).toHaveLength(0);
  });
});
