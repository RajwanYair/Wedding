/**
 * tests/unit/gallery-section.test.mjs — S368a: gallery.js helpers
 * Covers: getGalleryStats · deleteGalleryPhoto
 *
 * Run: npm test
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { initStore, storeSet, storeGet } from "../../src/core/store.js";

// ── Mocks ─────────────────────────────────────────────────────────────────

vi.mock("../../src/core/i18n.js", () => ({ t: (k) => k, loadLocale: vi.fn(), applyI18n: vi.fn(), normalizeUiLanguage: vi.fn() }));
vi.mock("../../src/core/dom.js", () => ({ el: new Proxy({}, { get: () => null }) }));
vi.mock("../../src/core/sync.js", () => ({ enqueueWrite: vi.fn(), syncStoreKeyToSheets: vi.fn() }));
vi.mock("../../src/core/section-base.js", () => ({
  BaseSection: class { subscribe() {} },
  fromSection: () => ({ mount: vi.fn(), unmount: vi.fn(), capabilities: [] }),
}));
vi.mock("../../src/services/auth.js", () => ({
  currentUser: vi.fn(() => null),
}));
vi.mock("../../src/core/config.js", () => ({
  CDN_IMAGE_HOST: "",
  STORAGE_PREFIX: "wedding_v1_",
  APP_VERSION: "0.0.0",
  TOAST_DURATION_MS: 3000,
  DEBOUNCE_MS: 1500,
  ADMIN_EMAILS: [],
  BACKEND_TYPE: "sheets",
}));
vi.mock("../../src/utils/cdn-image.js", () => ({
  buildCdnImageUrl: vi.fn((url) => url),
  buildSrcset: vi.fn(() => ""),
  defaultSizes: vi.fn(() => "100vw"),
}));
vi.mock("../../src/utils/misc.js", () => ({
  uid: vi.fn(() => `id_${Math.random().toString(36).slice(2, 8)}`),
}));

import {
  getGalleryStats,
  deleteGalleryPhoto,
} from "../../src/sections/gallery.js";

// ── Store seed ────────────────────────────────────────────────────────────

function seedStore(photos = []) {
  initStore({ gallery: { value: photos } });
}

beforeEach(() => seedStore());

// ── getGalleryStats ───────────────────────────────────────────────────────

describe("getGalleryStats", () => {
  it("returns zeros when gallery is empty", () => {
    const stats = getGalleryStats();
    expect(stats.total).toBe(0);
    expect(stats.withCaption).toBe(0);
    expect(stats.avgCaptionLength).toBe(0);
  });

  it("counts total photos", () => {
    seedStore([
      { id: "p1", url: "https://cdn/a.jpg" },
      { id: "p2", url: "https://cdn/b.jpg" },
    ]);
    expect(getGalleryStats().total).toBe(2);
  });

  it("counts photos with captions", () => {
    seedStore([
      { id: "p1", url: "https://cdn/a.jpg", caption: "Ceremony" },
      { id: "p2", url: "https://cdn/b.jpg" },
      { id: "p3", url: "https://cdn/c.jpg", caption: "Reception" },
    ]);
    const stats = getGalleryStats();
    expect(stats.total).toBe(3);
    expect(stats.withCaption).toBe(2);
  });

  it("calculates average caption length", () => {
    seedStore([
      { id: "p1", url: "https://cdn/a.jpg", caption: "AB" },   // len=2
      { id: "p2", url: "https://cdn/b.jpg", caption: "ABCD" }, // len=4
    ]);
    const stats = getGalleryStats();
    expect(stats.avgCaptionLength).toBe(3); // (2+4)/2=3
  });

  it("avgCaptionLength is 0 when no captions exist", () => {
    seedStore([{ id: "p1", url: "https://cdn/a.jpg" }]);
    expect(getGalleryStats().avgCaptionLength).toBe(0);
  });
});

// ── deleteGalleryPhoto ────────────────────────────────────────────────────

describe("deleteGalleryPhoto", () => {
  it("removes photo with matching id from store", () => {
    seedStore([
      { id: "p1", url: "https://cdn/a.jpg" },
      { id: "p2", url: "https://cdn/b.jpg" },
    ]);
    deleteGalleryPhoto("p1");
    const gallery = storeGet("gallery");
    expect(gallery).toHaveLength(1);
    expect(gallery[0].id).toBe("p2");
  });

  it("does not remove other photos", () => {
    seedStore([
      { id: "p1", url: "https://cdn/a.jpg" },
      { id: "p2", url: "https://cdn/b.jpg" },
      { id: "p3", url: "https://cdn/c.jpg" },
    ]);
    deleteGalleryPhoto("p2");
    const gallery = storeGet("gallery");
    expect(gallery).toHaveLength(2);
    expect(gallery.map((p) => p.id)).not.toContain("p2");
  });

  it("no-op when id not found", () => {
    seedStore([{ id: "p1", url: "https://cdn/a.jpg" }]);
    deleteGalleryPhoto("nonexistent");
    expect(storeGet("gallery")).toHaveLength(1);
  });

  it("calls enqueueWrite after delete", async () => {
    const { enqueueWrite } = await import("../../src/core/sync.js");
    seedStore([{ id: "p1", url: "https://cdn/a.jpg" }]);
    deleteGalleryPhoto("p1");
    expect(enqueueWrite).toHaveBeenCalledWith("gallery", expect.any(Function));
  });
});
