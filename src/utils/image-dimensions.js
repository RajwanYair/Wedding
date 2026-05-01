/**
 * Image dimension extractor — read the width/height from header bytes for
 * PNG, GIF, JPEG, and WebP/RIFF without decoding the pixel data. Pure;
 * accepts a `Uint8Array` (or any indexed byte source) and returns
 * `{ width, height, type }` or `null` for unsupported / truncated input.
 *
 * @typedef {object} ImageDimensions
 * @property {number} width
 * @property {number} height
 * @property {"png"|"gif"|"jpeg"|"webp"} type
 * @owner shared
 */

/**
 * @param {Uint8Array} bytes
 * @param {number} offset
 * @returns {number}
 */
function u16be(bytes, offset) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

/**
 * @param {Uint8Array} bytes
 * @param {number} offset
 * @returns {number}
 */
function u32be(bytes, offset) {
  return (
    (bytes[offset] * 0x1_00_00_00) +
    ((bytes[offset + 1] << 16) >>> 0) +
    ((bytes[offset + 2] << 8) >>> 0) +
    bytes[offset + 3]
  );
}

/**
 * @param {Uint8Array} bytes
 * @returns {ImageDimensions | null}
 */
function readPng(bytes) {
  // signature 89 50 4E 47 0D 0A 1A 0A; IHDR at byte 8 with chunk header
  if (bytes.length < 24) return null;
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < sig.length; i += 1) if (bytes[i] !== sig[i]) return null;
  return { width: u32be(bytes, 16), height: u32be(bytes, 20), type: "png" };
}

/**
 * @param {Uint8Array} bytes
 * @returns {ImageDimensions | null}
 */
function readGif(bytes) {
  if (bytes.length < 10) return null;
  if (
    bytes[0] !== 0x47 ||
    bytes[1] !== 0x49 ||
    bytes[2] !== 0x46 ||
    bytes[3] !== 0x38
  ) return null;
  const width = bytes[6] | (bytes[7] << 8);
  const height = bytes[8] | (bytes[9] << 8);
  return { width, height, type: "gif" };
}

/**
 * @param {Uint8Array} bytes
 * @returns {ImageDimensions | null}
 */
function readJpeg(bytes) {
  if (bytes.length < 4) return null;
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    i += 2;
    // SOF0..SOF15 except DHT(0xC4), JPG(0xC8), DAC(0xCC)
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      return {
        height: u16be(bytes, i + 3),
        width: u16be(bytes, i + 5),
        type: "jpeg",
      };
    }
    const segLen = u16be(bytes, i);
    if (segLen < 2) return null;
    i += segLen;
  }
  return null;
}

/**
 * @param {Uint8Array} bytes
 * @returns {ImageDimensions | null}
 */
function readWebp(bytes) {
  if (bytes.length < 30) return null;
  if (
    bytes[0] !== 0x52 ||
    bytes[1] !== 0x49 ||
    bytes[2] !== 0x46 ||
    bytes[3] !== 0x46 ||
    bytes[8] !== 0x57 ||
    bytes[9] !== 0x45 ||
    bytes[10] !== 0x42 ||
    bytes[11] !== 0x50
  ) return null;
  // VP8X chunk: width-1 and height-1 as 24-bit LE at offsets 24/27
  if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x58) {
    const w = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
    const h = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
    return { width: w, height: h, type: "webp" };
  }
  // VP8 lossy: width/height at offset 26/28 as 14-bit LE
  if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x20) {
    const w = (bytes[26] | (bytes[27] << 8)) & 0x3fff;
    const h = (bytes[28] | (bytes[29] << 8)) & 0x3fff;
    return { width: w, height: h, type: "webp" };
  }
  return null;
}

/**
 * Read image dimensions from a byte source. Returns null when the format
 * isn't recognised or the buffer is truncated.
 *
 * @param {Uint8Array | ArrayBuffer | ArrayLike<number>} input
 * @returns {ImageDimensions | null}
 */
export function readDimensions(input) {
  if (!input) return null;
  let bytes;
  if (input instanceof Uint8Array) bytes = input;
  else if (input instanceof ArrayBuffer) bytes = new Uint8Array(input);
  else bytes = new Uint8Array(Array.from(/** @type {ArrayLike<number>} */ (input)));
  return readPng(bytes) ?? readGif(bytes) ?? readJpeg(bytes) ?? readWebp(bytes);
}
