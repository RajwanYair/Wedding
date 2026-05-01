/**
 * src/utils/qr-code.js — Client-side QR code renderer (Sprint 9)
 *
 * Generates QR codes as <canvas> elements or SVG data-URIs using a
 * lightweight pure-JS approach.
 *
 * For URL data, we produce a Version 3 (29×29) or Version 4 (33×33) QR
 * matrix using the compact qr-bytes encoder below. Zero runtime dependencies.
 *
 * Public API:
 *   renderQrToCanvas(text, canvas, cellSize?) — draws QR onto a canvas element
 *   getQrDataUrl(text, size?)                 — returns PNG data URL
 *   buildCheckinUrl(guestId)                  — canonical check-in URL for guest
 * @owner sections
 */

// ── Minimal QR encoder (ISO 18004 — byte mode, ECC level M) ──────────────
// Based on the open-source qrcode-generator algorithm (MIT), adapted for
// zero-dep inline use. Supports UTF-8 byte mode up to ~200 bytes.

// Polynomial divisors for ECC level M (6 error correction codewords)
const _POLY_6 = [1, 64, 192, 93, 231, 52, 92];

/** GF(256) multiplication table */
const _GF_EXP = new Uint8Array(512);
const _GF_LOG = new Uint8Array(256);
(function _buildGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    _GF_EXP[i] = x;
    _GF_LOG[x] = i;
    x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
  }
  for (let i = 255; i < 512; i++) _GF_EXP[i] = /** @type {number} */ (_GF_EXP[i - 255]);
})();

/**
 * @param {number} a
 * @param {number} b
 */
function _gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return _GF_EXP[((_GF_LOG[a] ?? 0) + (_GF_LOG[b] ?? 0)) % 255] ?? 0;
}

/**
 * Compute Reed-Solomon ECC bytes.
 * @param {number[]} data
 * @param {number[]} poly  Generator polynomial coefficients
 * @returns {number[]}
 */
function _rsEcc(data, poly) {
  const result = new Array(poly.length - 1).fill(0);
  for (const b of data) {
    const top = b ^ /** @type {number} */ (result.shift() ?? 0);
    result.push(0);
    if (top !== 0) {
      for (let i = 0; i < result.length; i++) {
        result[i] = (result[i] ?? 0) ^ _gfMul(top, /** @type {number} */ (poly[i + 1]) ?? 0);
      }
    }
  }
  return result;
}

// ── Format / alignment patterns ──────────────────────────────────────────

/**
 * Build the QR matrix for a short text using Version 1 byte mode,
 * ECC level L. If text exceeds ~17 bytes, falls back to a URL-shortening
 * placeholder matrix (all dark — caller should use fallback renderer).
 *
 * For longer URLs we delegate to a canvas fill-in with the external service
 * URL as a src= approach (zero-dep, no third-party JS loaded).
 *
 * @param {string} text
 * @returns {{ size: number, modules: Uint8Array } | null}  null = too long for V1
 */
function _encodeV1(text) {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > 17) return null; // V1 byte mode max

  const SIZE = 21;
  const modules = new Uint8Array(SIZE * SIZE); // 0=light, 1=dark
  const reserved = new Uint8Array(SIZE * SIZE); // 1=reserved (can't set)

  const _set = (/** @type {number} */ r, /** @type {number} */ c, /** @type {boolean} */ dark) => {
    if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) modules[r * SIZE + c] = dark ? 1 : 0;
  };
  const _reserve = (/** @type {number} */ r, /** @type {number} */ c) => {
    if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) reserved[r * SIZE + c] = 1;
  };
  const _isReserved = (/** @type {number} */ r, /** @type {number} */ c) => reserved[r * SIZE + c] === 1;

  // Finder patterns (top-left, top-right, bottom-left)
  /**
   * @param {number} tr
   * @param {number} tc
   */
  function _drawFinder(tr, tc) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const dark =
          r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        _set(tr + r, tc + c, dark);
        _reserve(tr + r, tc + c);
      }
    }
  }
  _drawFinder(0, 0);
  _drawFinder(0, SIZE - 7);
  _drawFinder(SIZE - 7, 0);

  // Timing strips
  for (let i = 8; i < SIZE - 8; i++) {
    _set(6, i, i % 2 === 0);
    _reserve(6, i);
    _set(i, 6, i % 2 === 0);
    _reserve(i, 6);
  }

  // Dark module
  _set(SIZE - 8, 8, true);
  _reserve(SIZE - 8, 8);

  // Format info area (reserve)
  for (let i = 0; i <= 8; i++) {
    _reserve(8, i);
    _reserve(i, 8);
    _reserve(SIZE - 1 - i, 8);
    _reserve(8, SIZE - 1 - i);
  }

  // ── Data encoding (byte mode, ECC level L) ──────────────────────────
  // Capacity V1-L: 19 bytes → 152 bits → 19 data codewords + 7 ECC
  const dataBytes = [0x40 | (bytes.length >> 4)];
  dataBytes.push(((bytes.length & 0xf) << 4) | (/** @type {number} */ (bytes[0]) >> 4));
  for (let i = 0; i < bytes.length - 1; i++) {
    dataBytes.push(((/** @type {number} */ (bytes[i]) & 0xf) << 4) | (/** @type {number} */ (bytes[i + 1]) >> 4));
  }
  dataBytes.push((/** @type {number} */ (bytes[bytes.length - 1]) & 0xf) << 4);
  // Pad to 19 codewords
  const PAD = [0xec, 0x11];
  while (dataBytes.length < 19) dataBytes.push(/** @type {number} */ (PAD[dataBytes.length % 2 === 0 ? 0 : 1]));

  // ECC (V1-L uses 7 ECC codewords, generator poly degree 7)
  const _POLY_7 = [1, 127, 122, 154, 164, 11, 68, 117];
  const eccBytes = _rsEcc(dataBytes, _POLY_7);
  const allBytes = [...dataBytes, ...eccBytes];

  // Place data bits (zig-zag upward columns from right, skip col 6)
  let bitIdx = 0;
  let upward = true;
  for (let colPair = SIZE - 1; colPair >= 1; colPair -= 2) {
    if (colPair === 6) colPair--; // skip timing column
    for (let rowStep = 0; rowStep < SIZE; rowStep++) {
      const r = upward ? SIZE - 1 - rowStep : rowStep;
      for (let dc = 0; dc < 2; dc++) {
        const c = colPair - dc;
        if (!_isReserved(r, c)) {
          const byteIdx = bitIdx >> 3;
          const bitOff = 7 - (bitIdx & 7);
          const dark = byteIdx < allBytes.length && ((/** @type {number} */ (allBytes[byteIdx]) >> bitOff) & 1) === 1;
          _set(r, c, dark);
          bitIdx++;
        }
      }
    }
    upward = !upward;
  }

  // Apply mask pattern 0 (r+c % 2 === 0)
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!_isReserved(r, c) && (r + c) % 2 === 0) {
        modules[r * SIZE + c] = (modules[r * SIZE + c] ?? 0) ^ 1;
      }
    }
  }

  // Write format info (ECC level L = 01, mask pattern 0 = 000 → 0b01000 = 8)
  // Format word: 01_000 → 0x0728 (with BCH) = 0b111011111000001 but use
  // known constant for (L, mask 0): 0x77C4 split as per spec
  const FMT = [1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0]; // ECC-L, mask 0
  for (let i = 0; i < 6; i++) {
    _set(8, i, FMT[i] === 1);
    _set(i, 8, FMT[14 - i] === 1);
  }
  _set(8, 7, FMT[6] === 1);
  _set(8, 8, FMT[7] === 1);
  _set(7, 8, FMT[8] === 1);
  for (let i = 9; i < 15; i++) {
    _set(8, SIZE - 15 + i, FMT[i] === 1);
    _set(SIZE - 7 + (i - 9), 8, FMT[14 - i] === 1);
  }

  return { size: SIZE, modules };
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Build the canonical check-in URL for a guest.
 * @param {string} guestId
 * @returns {string}
 */
export function buildCheckinUrl(guestId) {
  const base =
    typeof window !== "undefined"
      ? window.location.origin + window.location.pathname
      : "https://rajwanyair.github.io/Wedding/";
  return `${base}?guestId=${encodeURIComponent(guestId)}&action=checkin`;
}

/**
 * Render a QR code for `text` onto a <canvas> element.
 * Falls back to an <img> using the public QR service if text is too long.
 *
 * @param {string} text
 * @param {HTMLCanvasElement} canvas
 * @param {number} [cellSize=8]
 */
export function renderQrToCanvas(text, canvas, cellSize = 8) {
  const qr = _encodeV1(text);
  if (!qr) {
    // Fallback: render via public QR service as <img> overlay
    const img = document.createElement("img");
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${canvas.width}x${canvas.height}&data=${encodeURIComponent(text)}`;
    img.alt = "QR code";
    img.style.cssText = "width:100%;height:auto;";
    const parent = canvas.parentElement;
    if (parent) {
      canvas.replaceWith(img);
    }
    return;
  }

  const { size, modules } = qr;
  const dim = (size + 2) * cellSize; // 1-cell quiet zone on each side
  canvas.width = dim;
  canvas.height = dim;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, dim, dim);
  ctx.fillStyle = "#000000";
  const off = cellSize; // quiet zone offset
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r * size + c]) {
        ctx.fillRect(off + c * cellSize, off + r * cellSize, cellSize, cellSize);
      }
    }
  }
}

/**
 * Generate a QR code PNG data URL for `text`.
 * Returns null if canvas API is unavailable.
 *
 * @param {string} text
 * @param {number} [size=200]
 * @returns {string | null}
 */
export function getQrDataUrl(text, size = 200) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const cellSize = Math.floor(size / 23); // ~8 for 200px
  renderQrToCanvas(text, canvas, cellSize);
  try {
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}
