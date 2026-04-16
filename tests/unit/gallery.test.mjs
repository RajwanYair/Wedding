/**
 * tests/unit/gallery.test.mjs — Unit tests for gallery section
 * Covers: addGalleryPhoto · deleteGalleryPhoto · renderGallery
 *
 * @vitest-environment happy-dom
 * Run: npm test
 */

import { describe, it, expect, beforeEach } from "vitest";
import { initStore, storeGet, storeSet } from "../../src/core/store.js";
import { getGalleryStats } from "../../src/sections/gallery.js";

function seedStore() {
  initStore({
    gallery: { value: [] },
    guests: { value: [] },
    tables: { value: [] },
    weddingInfo: { value: {} },
  });
}

function makePhoto(overrides = {}) {
  return {
    id: `p_${Math.random().toString(36).slice(2)}`,
    url: "https://example.com/photo.jpg",
    caption: "Test photo",
    uploadedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Gallery data operations ──────────────────────────────────────────────

describe("Gallery store operations", () => {
  beforeEach(() => seedStore());

  it("starts with empty gallery", () => {
    expect(storeGet("gallery")).toEqual([]);
  });

  it("can add a photo to gallery", () => {
    const photos = [makePhoto()];
    storeSet("gallery", photos);
    expect(storeGet("gallery")).toHaveLength(1);
  });

  it("stores photo URL correctly", () => {
    const photo = makePhoto({ url: "https://example.com/wedding.jpg" });
    storeSet("gallery", [photo]);
    const stored = /** @type {any[]} */ (storeGet("gallery"));
    expect(stored[0].url).toBe("https://example.com/wedding.jpg");
  });

  it("stores caption correctly", () => {
    const photo = makePhoto({ caption: "Beautiful ceremony" });
    storeSet("gallery", [photo]);
    const stored = /** @type {any[]} */ (storeGet("gallery"));
    expect(stored[0].caption).toBe("Beautiful ceremony");
  });

  it("can delete a photo from gallery", () => {
    const p1 = makePhoto({ id: "p1" });
    const p2 = makePhoto({ id: "p2" });
    storeSet("gallery", [p1, p2]);
    const remaining = /** @type {any[]} */ (storeGet("gallery")).filter((p) => p.id !== "p1");
    storeSet("gallery", remaining);
    expect(storeGet("gallery")).toHaveLength(1);
    expect(/** @type {any[]} */ (storeGet("gallery"))[0].id).toBe("p2");
  });

  it("handles multiple photos", () => {
    const photos = Array.from({ length: 10 }, (_, i) => makePhoto({ id: `p${i}` }));
    storeSet("gallery", photos);
    expect(storeGet("gallery")).toHaveLength(10);
  });

  it("preserves uploadedAt timestamp", () => {
    const ts = "2026-04-15T10:30:00.000Z";
    const photo = makePhoto({ uploadedAt: ts });
    storeSet("gallery", [photo]);
    const stored = /** @type {any[]} */ (storeGet("gallery"));
    expect(stored[0].uploadedAt).toBe(ts);
  });

  it("each photo has a unique id", () => {
    const photos = [makePhoto(), makePhoto(), makePhoto()];
    const ids = new Set(photos.map((p) => p.id));
    expect(ids.size).toBe(3);
  });
});

// ── getGalleryStats ───────────────────────────────────────────────────────
describe("getGalleryStats", () => {
  beforeEach(() => seedStore());

  it("returns zeros for empty gallery", () => {
    const stats = getGalleryStats();
    expect(stats.total).toBe(0);
    expect(stats.withCaption).toBe(0);
  });

  it("counts photos and captions", () => {
    storeSet("gallery", [
      makePhoto({ caption: "Ceremony shot" }),
      makePhoto({ caption: "" }),
      makePhoto({ caption: "Group photo with family" }),
    ]);
    const stats = getGalleryStats();
    expect(stats.total).toBe(3);
    expect(stats.withCaption).toBe(2);
    expect(stats.avgCaptionLength).toBeGreaterThan(0);
  });
});
