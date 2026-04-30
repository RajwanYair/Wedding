import { describe, it, expect } from "vitest";
import { readDimensions } from "../../src/utils/image-dimensions.js";

function makePng(width, height) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const buf = new Uint8Array(24);
  for (let i = 0; i < sig.length; i += 1) buf[i] = sig[i];
  // chunk length + IHDR
  buf[8] = 0;
  buf[9] = 0;
  buf[10] = 0;
  buf[11] = 13;
  buf[12] = 0x49;
  buf[13] = 0x48;
  buf[14] = 0x44;
  buf[15] = 0x52;
  buf[16] = (width >>> 24) & 0xff;
  buf[17] = (width >>> 16) & 0xff;
  buf[18] = (width >>> 8) & 0xff;
  buf[19] = width & 0xff;
  buf[20] = (height >>> 24) & 0xff;
  buf[21] = (height >>> 16) & 0xff;
  buf[22] = (height >>> 8) & 0xff;
  buf[23] = height & 0xff;
  return buf;
}

function makeGif(width, height) {
  const buf = new Uint8Array(10);
  buf[0] = 0x47;
  buf[1] = 0x49;
  buf[2] = 0x46;
  buf[3] = 0x38;
  buf[4] = 0x39;
  buf[5] = 0x61;
  buf[6] = width & 0xff;
  buf[7] = (width >> 8) & 0xff;
  buf[8] = height & 0xff;
  buf[9] = (height >> 8) & 0xff;
  return buf;
}

function makeJpeg(width, height) {
  // SOI + APP0 segment + SOF0
  const app0Len = 16;
  const sof0Len = 17;
  const buf = new Uint8Array(2 + 2 + app0Len + 2 + sof0Len);
  let i = 0;
  buf[i++] = 0xff;
  buf[i++] = 0xd8;
  buf[i++] = 0xff;
  buf[i++] = 0xe0;
  buf[i++] = 0x00;
  buf[i++] = app0Len;
  for (let k = 0; k < app0Len - 2; k += 1) buf[i++] = 0;
  buf[i++] = 0xff;
  buf[i++] = 0xc0;
  buf[i++] = 0x00;
  buf[i++] = sof0Len;
  buf[i++] = 0x08; // precision
  buf[i++] = (height >> 8) & 0xff;
  buf[i++] = height & 0xff;
  buf[i++] = (width >> 8) & 0xff;
  buf[i++] = width & 0xff;
  while (i < buf.length) buf[i++] = 0;
  return buf;
}

function makeWebpVp8x(width, height) {
  const buf = new Uint8Array(30);
  buf[0] = 0x52;
  buf[1] = 0x49;
  buf[2] = 0x46;
  buf[3] = 0x46;
  buf[8] = 0x57;
  buf[9] = 0x45;
  buf[10] = 0x42;
  buf[11] = 0x50;
  buf[12] = 0x56;
  buf[13] = 0x50;
  buf[14] = 0x38;
  buf[15] = 0x58;
  const w = width - 1;
  const h = height - 1;
  buf[24] = w & 0xff;
  buf[25] = (w >> 8) & 0xff;
  buf[26] = (w >> 16) & 0xff;
  buf[27] = h & 0xff;
  buf[28] = (h >> 8) & 0xff;
  buf[29] = (h >> 16) & 0xff;
  return buf;
}

describe("image-dimensions", () => {
  it("reads PNG", () => {
    expect(readDimensions(makePng(800, 600))).toEqual({
      width: 800,
      height: 600,
      type: "png",
    });
  });

  it("reads GIF", () => {
    expect(readDimensions(makeGif(320, 240))).toEqual({
      width: 320,
      height: 240,
      type: "gif",
    });
  });

  it("reads JPEG", () => {
    expect(readDimensions(makeJpeg(1024, 768))).toEqual({
      width: 1024,
      height: 768,
      type: "jpeg",
    });
  });

  it("reads WebP VP8X", () => {
    expect(readDimensions(makeWebpVp8x(640, 480))).toEqual({
      width: 640,
      height: 480,
      type: "webp",
    });
  });

  it("returns null for unknown format", () => {
    const buf = new Uint8Array(32);
    expect(readDimensions(buf)).toBe(null);
  });

  it("returns null for null/undefined", () => {
    expect(readDimensions(null)).toBe(null);
    expect(readDimensions(undefined)).toBe(null);
  });

  it("returns null for truncated PNG", () => {
    expect(readDimensions(new Uint8Array(10))).toBe(null);
  });

  it("returns null for truncated GIF", () => {
    expect(readDimensions(new Uint8Array([0x47, 0x49]))).toBe(null);
  });

  it("returns null for truncated JPEG", () => {
    expect(readDimensions(new Uint8Array([0xff, 0xd8]))).toBe(null);
  });

  it("accepts ArrayBuffer", () => {
    const ab = makePng(10, 20).buffer;
    expect(readDimensions(ab)?.type).toBe("png");
  });

  it("accepts plain array", () => {
    expect(readDimensions(Array.from(makeGif(5, 7)))?.type).toBe("gif");
  });
});
