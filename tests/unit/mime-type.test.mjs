import { describe, it, expect } from "vitest";
import {
  mimeFromExt,
  extFromMime,
  mimeBucket,
} from "../../src/utils/mime-type.js";

describe("mime-type", () => {
  it("looks up by extension", () => {
    expect(mimeFromExt("png")).toBe("image/png");
    expect(mimeFromExt("csv")).toBe("text/csv");
    expect(mimeFromExt("ics")).toBe("text/calendar");
  });

  it("looks up by filename", () => {
    expect(mimeFromExt("photo.JPG")).toBe("image/jpeg");
    expect(mimeFromExt("/path/to/file.pdf")).toBe("application/pdf");
  });

  it("unknown extension → null", () => {
    expect(mimeFromExt("xyz")).toBe(null);
  });

  it("invalid input → null", () => {
    expect(mimeFromExt("")).toBe(null);
    expect(mimeFromExt(/** @type {any} */ (null))).toBe(null);
  });

  it("extFromMime reverse lookup", () => {
    expect(extFromMime("image/png")).toBe("png");
    expect(extFromMime("application/pdf")).toBe("pdf");
  });

  it("extFromMime case insensitive", () => {
    expect(extFromMime("IMAGE/PNG")).toBe("png");
  });

  it("extFromMime unknown → null", () => {
    expect(extFromMime("application/octet-stream")).toBe(null);
  });

  it("mimeBucket image/audio/video/text/app", () => {
    expect(mimeBucket("image/png")).toBe("image");
    expect(mimeBucket("audio/mpeg")).toBe("audio");
    expect(mimeBucket("video/mp4")).toBe("video");
    expect(mimeBucket("text/csv")).toBe("text");
    expect(mimeBucket("application/json")).toBe("app");
  });

  it("mimeBucket unknown → null", () => {
    expect(mimeBucket("font/woff")).toBe(null);
  });

  it("mimeBucket invalid → null", () => {
    expect(mimeBucket(/** @type {any} */ (null))).toBe(null);
  });
});
