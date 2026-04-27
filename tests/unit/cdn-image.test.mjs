/**
 * tests/unit/cdn-image.test.mjs — S127 Cloudflare image URL helpers.
 */
import { describe, it, expect } from "vitest";
import {
  buildCdnImageUrl,
  buildSrcset,
  defaultSizes,
} from "../../src/utils/cdn-image.js";

const SRC = "/photos/wedding/cover.jpg";
const HOST = "https://cdn.example.com";

describe("S127 — cdn-image", () => {
  it("returns source unchanged when no cdnHost", () => {
    expect(buildCdnImageUrl(SRC, { width: 800 })).toBe(SRC);
  });

  it("builds /cdn-cgi/image/ segment with allowed options only", () => {
    const url = buildCdnImageUrl(
      SRC,
      { width: 800, height: 600, fit: "cover", format: "webp", quality: 85, gravity: "center" },
      HOST,
    );
    expect(url).toBe(
      `${HOST}/cdn-cgi/image/w=800,h=600,fit=cover,f=webp,q=85,gravity=center/photos/wedding/cover.jpg`,
    );
  });

  it("rounds float dimensions and rejects bad fits/formats", () => {
    const url = buildCdnImageUrl(
      SRC,
      { width: 799.7, fit: "weird", format: "tiff", quality: 200 },
      HOST,
    );
    expect(url).toContain("w=800");
    expect(url).not.toContain("fit=");
    expect(url).not.toContain("f=tiff");
    expect(url).not.toContain("q=200");
  });

  it("falls back to f=auto when no opts provided", () => {
    expect(buildCdnImageUrl(SRC, {}, HOST)).toContain("/cdn-cgi/image/f=auto/");
  });

  it("strips trailing slashes from cdnHost", () => {
    expect(buildCdnImageUrl(SRC, { width: 100 }, `${HOST}//`)).toBe(
      `${HOST}/cdn-cgi/image/w=100/photos/wedding/cover.jpg`,
    );
  });

  it("buildSrcset yields width descriptors", () => {
    const ss = buildSrcset(SRC, [400, 800, 1200], { format: "webp" }, HOST);
    expect(ss.split(", ")).toHaveLength(3);
    expect(ss).toContain("400w");
    expect(ss).toContain("1200w");
  });

  it("buildSrcset filters invalid widths", () => {
    expect(buildSrcset(SRC, [0, -1, NaN, 600], {}, HOST)).toContain("600w");
    expect(buildSrcset(SRC, [], {}, HOST)).toBe("");
  });

  it("defaultSizes returns three breakpoints", () => {
    expect(defaultSizes()).toBe(
      "(max-width: 480px) 100vw, (max-width: 1024px) 50vw, 33vw",
    );
  });

  it("buildCdnImageUrl returns empty for empty source", () => {
    expect(buildCdnImageUrl("", { width: 100 }, HOST)).toBe("");
  });
});
