/**
 * tests/unit/s712-guest-tags.test.mjs — S712 Guest Tags Integration
 *
 * Tests for guest tag CRUD wired into guests.js.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/core/sync.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(),
}));
vi.mock("../../src/services/realtime.js", () => ({
  subscribeToTable: vi.fn(),
  unsubscribeAll: vi.fn(),
  onPresenceChange: vi.fn(() => () => {}),
  groupByViewing: vi.fn(() => ({})),
  badgeFor: vi.fn(() => ""),
}));
vi.mock("../../src/core/ui.js", () => ({
  showToast: vi.fn(),
  announce: vi.fn(),
}));

import { initStore } from "../../src/core/store.js";
import {
  addGuestTag,
  removeGuestTag,
  getAllGuestTags,
  getGuestsByTag,
  bulkSetGuestStatus,
} from "../../src/sections/guests.js";

const SAMPLE_GUESTS = [
  { id: "g1", name: "Alice", status: "confirmed", seats: 1, tags: ["vip"] },
  { id: "g2", name: "Bob", status: "confirmed", seats: 1, tags: [] },
  { id: "g3", name: "Carol", status: "pending", seats: 2, tags: ["vip", "family"] },
];

beforeEach(() => {
  initStore({ guests: { value: JSON.parse(JSON.stringify(SAMPLE_GUESTS)) } });
});

describe("addGuestTag", () => {
  it("adds a tag to specified guests", () => {
    addGuestTag(["g2"], "vip");
    const tags = getAllGuestTags();
    const guests = getGuestsByTag("vip");
    expect(guests.map((g) => g.id)).toContain("g2");
    expect(tags).toContain("vip");
  });

  it("does not duplicate existing tags", () => {
    addGuestTag(["g1"], "vip");
    const g1Tags = getGuestsByTag("vip");
    expect(g1Tags.filter((g) => g.id === "g1")).toHaveLength(1);
  });

  it("returns ok=true on success", () => {
    const result = addGuestTag(["g2"], "newbie");
    expect(result.ok).toBe(true);
  });

  it("returns ok=false for empty tag", () => {
    const result = addGuestTag(["g1"], "");
    expect(result.ok).toBe(false);
  });

  it("normalises tag to lowercase", () => {
    addGuestTag(["g2"], "VIP");
    const tags = getAllGuestTags();
    expect(tags).toContain("vip");
  });
});

describe("removeGuestTag", () => {
  it("removes an existing tag from guests", () => {
    removeGuestTag(["g1"], "vip");
    const guests = getGuestsByTag("vip");
    expect(guests.map((g) => g.id)).not.toContain("g1");
  });

  it("returns ok=true on success", () => {
    const result = removeGuestTag(["g1"], "vip");
    expect(result.ok).toBe(true);
  });

  it("returns ok=false for empty tag", () => {
    const result = removeGuestTag(["g1"], "");
    expect(result.ok).toBe(false);
  });

  it("is a no-op if guest does not have the tag", () => {
    const before = getGuestsByTag("vip").length;
    removeGuestTag(["g2"], "vip"); // g2 has no tags
    const after = getGuestsByTag("vip").length;
    expect(after).toBe(before);
  });
});

describe("getAllGuestTags", () => {
  it("returns all unique tags sorted", () => {
    const tags = getAllGuestTags();
    expect(tags).toEqual(["family", "vip"]);
  });

  it("returns empty array when no guests have tags", () => {
    initStore({ guests: { value: [{ id: "g1", name: "A", status: "confirmed", seats: 1 }] } });
    expect(getAllGuestTags()).toEqual([]);
  });
});

describe("getGuestsByTag", () => {
  it("returns guests with the given tag", () => {
    const vips = getGuestsByTag("vip");
    expect(vips.map((g) => g.id).sort()).toEqual(["g1", "g3"]);
  });

  it("returns empty array for unknown tag", () => {
    expect(getGuestsByTag("unknown-tag")).toEqual([]);
  });

  it("returns guests with family tag", () => {
    const family = getGuestsByTag("family");
    expect(family).toHaveLength(1);
    expect(family[0].id).toBe("g3");
  });
});

describe("bulkSetGuestStatus", () => {
  it("updates status for all given ids", () => {
    bulkSetGuestStatus(["g2", "g3"], "confirmed");
    const guests = getGuestsByTag("family");
    expect(guests[0].status).toBe("confirmed");
  });

  it("returns count of updated guests", () => {
    const result = bulkSetGuestStatus(["g1", "g2"], "declined");
    expect(result.ok).toBe(true);
    expect(result.count).toBe(2);
  });

  it("does not affect guests not in the id list", () => {
    bulkSetGuestStatus(["g1"], "declined");
    const notDeclined = getGuestsByTag("vip").filter((g) => g.id !== "g1");
    for (const g of notDeclined) {
      expect(g.status).not.toBe("declined");
    }
  });
});
