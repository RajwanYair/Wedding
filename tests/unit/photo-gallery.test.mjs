import { describe, it, expect } from "vitest";
import {
  createPhotoEntry,
  buildAlbum,
  groupByTag,
  filterByTag,
  sortAlbumByDate,
  buildGalleryManifest,
  estimateStorageSize,
  getAlbumStats,
} from "../../src/utils/photo-gallery.js";

// ── createPhotoEntry ──────────────────────────────────────────────────────

describe("createPhotoEntry()", () => {
  it("returns null for missing url", () => expect(createPhotoEntry()).toBeNull());
  it("returns null for non-string url", () => expect(createPhotoEntry({ url: 123 })).toBeNull());

  it("creates a photo entry with required fields", () => {
    const p = createPhotoEntry({ url: "https://cdn.example.com/img.jpg" });
    expect(p.url).toBe("https://cdn.example.com/img.jpg");
    expect(p.id).toMatch(/^photo_/);
    expect(p.sizeBytes).toBe(0);
    expect(p.tags).toEqual([]);
  });

  it("parses takenAt to ISO string", () => {
    const p = createPhotoEntry({ url: "x.jpg", takenAt: "2025-06-01" });
    expect(p.takenAt).toMatch(/^2025-06-01/);
  });

  it("sets takenAt to null when omitted", () => {
    const p = createPhotoEntry({ url: "x.jpg" });
    expect(p.takenAt).toBeNull();
  });

  it("copies tags array", () => {
    const tags = ["ceremony", "couple"];
    const p = createPhotoEntry({ url: "x.jpg", tags });
    tags.push("extra");
    expect(p.tags).toEqual(["ceremony", "couple"]);
  });

  it("zeroes negative sizeBytes", () => {
    const p = createPhotoEntry({ url: "x.jpg", sizeBytes: -100 });
    expect(p.sizeBytes).toBe(0);
  });
});

// ── buildAlbum ────────────────────────────────────────────────────────────

describe("buildAlbum()", () => {
  it("creates album with id and createdAt", () => {
    const a = buildAlbum("Ceremony");
    expect(a.id).toMatch(/^album_/);
    expect(a.name).toBe("Ceremony");
    expect(a.createdAt).toBeTruthy();
  });

  it("starts with empty photos when none given", () => {
    const a = buildAlbum("Test");
    expect(a.photos).toEqual([]);
  });

  it("stores provided photos", () => {
    const p = createPhotoEntry({ url: "a.jpg" });
    const a = buildAlbum("Test", [p]);
    expect(a.photos).toHaveLength(1);
  });
});

// ── groupByTag ────────────────────────────────────────────────────────────

describe("groupByTag()", () => {
  it("returns empty object for non-array", () => expect(groupByTag(null)).toEqual({}));

  it("groups photos by single tag", () => {
    const p = createPhotoEntry({ url: "a.jpg", tags: ["ceremony"] });
    const result = groupByTag([p]);
    expect(result.ceremony).toHaveLength(1);
  });

  it("places photo under multiple tags", () => {
    const p = createPhotoEntry({ url: "a.jpg", tags: ["ceremony", "couple"] });
    const result = groupByTag([p]);
    expect(result.ceremony).toHaveLength(1);
    expect(result.couple).toHaveLength(1);
  });

  it("handles photos with no tags", () => {
    const p = createPhotoEntry({ url: "a.jpg" });
    const result = groupByTag([p]);
    expect(Object.keys(result)).toHaveLength(0);
  });
});

// ── filterByTag ───────────────────────────────────────────────────────────

describe("filterByTag()", () => {
  it("returns empty array for non-array input", () => expect(filterByTag(null, "tag")).toEqual([]));
  it("returns empty array when tag is empty", () => expect(filterByTag([], "")).toEqual([]));

  it("filters correctly", () => {
    const p1 = createPhotoEntry({ url: "a.jpg", tags: ["ceremony"] });
    const p2 = createPhotoEntry({ url: "b.jpg", tags: ["reception"] });
    const result = filterByTag([p1, p2], "ceremony");
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("a.jpg");
  });
});

// ── sortAlbumByDate ───────────────────────────────────────────────────────

describe("sortAlbumByDate()", () => {
  it("returns empty array for non-array", () => expect(sortAlbumByDate(null)).toEqual([]));

  it("sorts ascending by takenAt", () => {
    const p1 = createPhotoEntry({ url: "a.jpg", takenAt: "2025-06-02" });
    const p2 = createPhotoEntry({ url: "b.jpg", takenAt: "2025-06-01" });
    const sorted = sortAlbumByDate([p1, p2]);
    expect(sorted[0].url).toBe("b.jpg");
    expect(sorted[1].url).toBe("a.jpg");
  });

  it("places nulls last", () => {
    const p1 = createPhotoEntry({ url: "a.jpg" });
    const p2 = createPhotoEntry({ url: "b.jpg", takenAt: "2025-01-01" });
    const sorted = sortAlbumByDate([p1, p2]);
    expect(sorted[0].url).toBe("b.jpg");
  });

  it("does not mutate original array", () => {
    const p1 = createPhotoEntry({ url: "a.jpg", takenAt: "2025-06-02" });
    const p2 = createPhotoEntry({ url: "b.jpg", takenAt: "2025-06-01" });
    const original = [p1, p2];
    sortAlbumByDate(original);
    expect(original[0].url).toBe("a.jpg");
  });
});

// ── buildGalleryManifest ──────────────────────────────────────────────────

describe("buildGalleryManifest()", () => {
  it("returns empty manifest for non-array", () => {
    const m = buildGalleryManifest(null);
    expect(m.total).toBe(0);
    expect(m.photos).toEqual([]);
  });

  it("counts photos and aggregates size", () => {
    const p1 = createPhotoEntry({ url: "a.jpg", sizeBytes: 1000 });
    const p2 = createPhotoEntry({ url: "b.jpg", sizeBytes: 2000 });
    const m = buildGalleryManifest([p1, p2]);
    expect(m.total).toBe(2);
    expect(m.totalSize).toBe(3000);
  });

  it("collects sorted unique tags", () => {
    const p1 = createPhotoEntry({ url: "a.jpg", tags: ["reception"] });
    const p2 = createPhotoEntry({ url: "b.jpg", tags: ["ceremony", "reception"] });
    const m = buildGalleryManifest([p1, p2]);
    expect(m.tags).toEqual(["ceremony", "reception"]);
  });
});

// ── estimateStorageSize ───────────────────────────────────────────────────

describe("estimateStorageSize()", () => {
  it("returns 0 for non-array", () => expect(estimateStorageSize(null)).toBe(0));
  it("sums sizeBytes", () => {
    const p1 = createPhotoEntry({ url: "a.jpg", sizeBytes: 500 });
    const p2 = createPhotoEntry({ url: "b.jpg", sizeBytes: 1500 });
    expect(estimateStorageSize([p1, p2])).toBe(2000);
  });
  it("skips non-numeric sizeBytes", () => {
    expect(estimateStorageSize([{ sizeBytes: "big" }])).toBe(0);
  });
});

// ── getAlbumStats ─────────────────────────────────────────────────────────

describe("getAlbumStats()", () => {
  it("returns zeroes for null album", () => {
    const s = getAlbumStats(null);
    expect(s.total).toBe(0);
    expect(s.tagCount).toBe(0);
  });

  it("counts totals correctly", () => {
    const p1 = createPhotoEntry({ url: "a.jpg", sizeBytes: 1000, tags: ["ceremony"], caption: "A" });
    const p2 = createPhotoEntry({ url: "b.jpg", sizeBytes: 2000, tags: ["ceremony", "couple"] });
    const album = buildAlbum("Wedding", [p1, p2]);
    const s = getAlbumStats(album);
    expect(s.total).toBe(2);
    expect(s.totalSize).toBe(3000);
    expect(s.tagCount).toBe(2);
    expect(s.withCaption).toBe(1);
  });
});
