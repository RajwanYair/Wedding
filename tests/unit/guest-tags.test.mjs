/**
 * tests/unit/guest-tags.test.mjs — S460: guest-tags coverage
 */
import { describe, it, expect } from "vitest";
import {
  addTag,
  removeTag,
  listTags,
  filterByTag,
  bulkSetStatus,
} from "../../src/utils/guest-tags.js";

const GUESTS = [
  { id: "1", tags: ["family"], status: "pending" },
  { id: "2", tags: ["work"], status: "confirmed" },
  { id: "3", status: "pending" },
];

describe("guest-tags — addTag", () => {
  it("adds a tag to listed guests only", () => {
    const out = addTag(GUESTS, ["1", "3"], "vip");
    expect(out[0].tags).toContain("vip");
    expect(out[1].tags).toEqual(["work"]);
    expect(out[2].tags).toEqual(["vip"]);
  });

  it("normalises tag (trim + lowercase)", () => {
    const out = addTag(GUESTS, ["1"], "  VIP  ");
    expect(out[0].tags).toContain("vip");
  });

  it("does not duplicate an existing tag", () => {
    const out = addTag(GUESTS, ["1"], "family");
    expect(out[0].tags.filter((t) => t === "family")).toHaveLength(1);
  });

  it("ignores empty tag", () => {
    const out = addTag(GUESTS, ["1"], "");
    expect(out[0].tags).toEqual(["family"]);
  });
});

describe("guest-tags — removeTag", () => {
  it("removes the tag from listed guests", () => {
    const out = removeTag(GUESTS, ["1"], "family");
    expect(out[0].tags).toEqual([]);
  });

  it("leaves other guests untouched", () => {
    const out = removeTag(GUESTS, ["1"], "family");
    expect(out[1].tags).toEqual(["work"]);
  });
});

describe("guest-tags — listTags / filterByTag", () => {
  it("listTags returns sorted unique tags", () => {
    expect(listTags(GUESTS)).toEqual(["family", "work"]);
  });

  it("listTags returns [] for non-array input", () => {
    expect(listTags(null)).toEqual([]);
  });

  it("filterByTag returns matching guests", () => {
    const out = filterByTag(GUESTS, "family");
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("1");
  });

  it("filterByTag returns [] for empty tag", () => {
    expect(filterByTag(GUESTS, "")).toEqual([]);
  });
});

describe("guest-tags — bulkSetStatus", () => {
  it("sets status on listed guests", () => {
    const out = bulkSetStatus(GUESTS, ["1", "3"], "confirmed");
    expect(out[0].status).toBe("confirmed");
    expect(out[1].status).toBe("confirmed");
    expect(out[2].status).toBe("confirmed");
  });

  it("ignores empty status", () => {
    const out = bulkSetStatus(GUESTS, ["1"], "");
    expect(out[0].status).toBe("pending");
  });

  it("returns copy when ids list is invalid", () => {
    const out = bulkSetStatus(GUESTS, /** @type {any} */ (null), "x");
    expect(out).toEqual(GUESTS);
    expect(out).not.toBe(GUESTS);
  });
});
