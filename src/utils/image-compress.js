/**
 * src/utils/image-compress.js — S457: Client-side image compression for gallery uploads.
 *
 * Reduces image dimensions and re-encodes (default: JPEG q=0.82) before upload.
 * Pure DOM/canvas — no library dependencies.
 */

/**
 * Compute target dimensions that fit within `maxW` × `maxH` while preserving aspect ratio.
 * Never upscales.
 *
 * @param {number} srcW
 * @param {number} srcH
 * @param {number} maxW
 * @param {number} maxH
 * @returns {{ w: number, h: number }}
 */
export function calculateDimensions(srcW, srcH, maxW, maxH) {
  if (srcW <= 0 || srcH <= 0 || maxW <= 0 || maxH <= 0) return { w: 0, h: 0 };
  const ratio = Math.min(maxW / srcW, maxH / srcH, 1);
  return {
    w: Math.max(1, Math.round(srcW * ratio)),
    h: Math.max(1, Math.round(srcH * ratio)),
  };
}

/**
 * @param {Blob} blob
 * @returns {Promise<HTMLImageElement>}
 */
function _loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Compress an image blob to fit within `maxW` × `maxH` and return a new Blob.
 *
 * @param {Blob} blob   Input image blob.
 * @param {{ maxW?: number, maxH?: number, quality?: number, type?: string }} [opts]
 * @returns {Promise<Blob>}
 */
export async function compressImage(blob, opts = {}) {
  const { maxW = 1600, maxH = 1600, quality = 0.82, type = "image/jpeg" } = opts;
  if (!(blob instanceof Blob)) throw new TypeError("compressImage: blob required");

  const img = await _loadImage(blob);
  const { w, h } = calculateDimensions(img.naturalWidth, img.naturalHeight, maxW, maxH);

  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement("canvas"), { width: w, height: h });
  if ("width" in canvas && canvas.width !== w) canvas.width = w;
  if ("height" in canvas && canvas.height !== h) canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("compressImage: 2d context unavailable");
  ctx.drawImage(img, 0, 0, w, h);

  if ("convertToBlob" in canvas) {
    return /** @type {OffscreenCanvas} */ (canvas).convertToBlob({ type, quality });
  }
  return new Promise((resolve, reject) => {
    /** @type {HTMLCanvasElement} */ (canvas).toBlob(
      (out) => (out ? resolve(out) : reject(new Error("toBlob returned null"))),
      type,
      quality,
    );
  });
}

/**
 * Format bytes for display (e.g. "1.4 MB").
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
