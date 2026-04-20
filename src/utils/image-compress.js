/**
 * src/utils/image-compress.js — Client-side image compression utilities
 *
 * S56: Canvas-based image resizing and quality compression for gallery uploads,
 * guest photos, and venue images. All functions work with File / Blob / URL inputs
 * and return Blobs suitable for upload or display.
 *
 * Only available in browser environments (requires Canvas API).
 */

// ── Constants ──────────────────────────────────────────────────────────────

/** Default max dimension (px) for compressed images. */
export const DEFAULT_MAX_DIMENSION = 1280;

/** Default JPEG quality (0–1). */
export const DEFAULT_QUALITY = 0.82;

/** Default output MIME type. */
export const DEFAULT_MIME = "image/jpeg";

/** Accepted input MIME types. */
export const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns true if the Canvas API is available in the current environment.
 * @returns {boolean}
 */
export function isCanvasSupported() {
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return typeof c.getContext === "function";
  } catch {
    return false;
  }
}

/**
 * Returns true if the given file MIME type is an accepted image type.
 * @param {string} mimeType
 * @returns {boolean}
 */
export function isAcceptedImageType(mimeType) {
  return ACCEPTED_TYPES.includes(mimeType.toLowerCase());
}

/**
 * Computes scaled-down dimensions preserving aspect ratio.
 * If both sides are within maxDimension, returns original dimensions.
 * @param {number} width
 * @param {number} height
 * @param {number} maxDimension
 * @returns {{ width: number; height: number }}
 */
export function computeScaledDimensions(
  width,
  height,
  maxDimension = DEFAULT_MAX_DIMENSION,
) {
  if (width <= maxDimension && height <= maxDimension) return { width, height };
  const ratio = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

/**
 * Estimates the compressed file size in bytes given original size and quality.
 * This is an approximation — actual results vary by image content.
 * @param {number} originalBytes
 * @param {number} [quality]
 * @returns {number}
 */
export function estimateCompressedSize(
  originalBytes,
  quality = DEFAULT_QUALITY,
) {
  return Math.round(originalBytes * quality);
}

/**
 * Returns a human-readable file size string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Core compression ───────────────────────────────────────────────────────

/**
 * Loads an image source (File, Blob, data URL, or object URL) into an
 * HTMLImageElement and resolves once loaded.
 * @param {File | Blob | string} source
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = source instanceof Blob ? URL.createObjectURL(source) : source;
    img.onload = () => {
      if (source instanceof Blob) URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      if (source instanceof Blob) URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

/**
 * Compresses an image Blob/File using the Canvas API.
 * @param {File | Blob} file
 * @param {{ maxDimension?: number; quality?: number; mimeType?: string }} [opts]
 * @returns {Promise<Blob>}
 */
export async function compressImage(file, opts = {}) {
  if (!isCanvasSupported()) throw new Error("Canvas API not available");

  const {
    maxDimension = DEFAULT_MAX_DIMENSION,
    quality = DEFAULT_QUALITY,
    mimeType = DEFAULT_MIME,
  } = opts;

  const img = await loadImage(file);
  const { width, height } = computeScaledDimensions(
    img.naturalWidth,
    img.naturalHeight,
    maxDimension,
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D canvas context");

  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob returned null"));
      },
      mimeType,
      quality,
    );
  });
}

/**
 * Compresses multiple image files in parallel (up to concurrency limit).
 * @param {Array<File | Blob>} files
 * @param {{ maxDimension?: number; quality?: number; mimeType?: string; concurrency?: number }} [opts]
 * @returns {Promise<Array<{ original: File | Blob; compressed: Blob | null; error: string | null }>>}
 */
export async function compressImages(files, opts = {}) {
  const { concurrency = 4, ...compressOpts } = opts;
  const results = [];

  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (file) => {
        try {
          const compressed = await compressImage(file, compressOpts);
          return { original: file, compressed, error: null };
        } catch (err) {
          return {
            original: file,
            compressed: null,
            error: /** @type {Error} */ (err).message,
          };
        }
      }),
    );
    results.push(...batchResults);
  }

  return results;
}

// ── Metadata helpers ───────────────────────────────────────────────────────

/**
 * Returns basic metadata about a File or Blob.
 * @param {File | Blob} file
 * @returns {{ size: number; sizeFormatted: string; type: string; name: string; isAccepted: boolean }}
 */
export function getImageMetadata(file) {
  const name = file instanceof File ? file.name : "(blob)";
  const type = file.type || "application/octet-stream";
  return {
    size: file.size,
    sizeFormatted: formatFileSize(file.size),
    type,
    name,
    isAccepted: isAcceptedImageType(type),
  };
}

/**
 * Returns the compression ratio (compressed / original).
 * @param {number} originalSize
 * @param {number} compressedSize
 * @returns {number} ratio in [0, 1+] — values < 1 indicate size reduction
 */
export function compressionRatio(originalSize, compressedSize) {
  if (originalSize === 0) return 1;
  return compressedSize / originalSize;
}

/**
 * Returns the space saved in bytes and as a formatted string.
 * @param {number} originalSize
 * @param {number} compressedSize
 * @returns {{ savedBytes: number; savedFormatted: string; savingPercent: number }}
 */
export function compressionSavings(originalSize, compressedSize) {
  const savedBytes = Math.max(0, originalSize - compressedSize);
  const savingPercent =
    originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0;
  return {
    savedBytes,
    savedFormatted: formatFileSize(savedBytes),
    savingPercent,
  };
}
