/**
 * src/utils/file-handler.js
 * File System Access API + drag-drop utilities — pure data helpers.
 * No direct `showOpenFilePicker` calls (requires DOM context);
 * focuses on validation, parsing, and metadata building.
 *
 * @module file-handler
 */

// ── Constants ──────────────────────────────────────────────────────────────

/** Returns true when the File System Access API is available in this environment. */
export function isFileSystemApiSupported() {
  return (
    typeof window !== "undefined" &&
    typeof window.showOpenFilePicker === "function"
  );
}

/** Accepted MIME types and their canonical file extensions. */
export const ACCEPTED_MIME_TYPES = Object.freeze({
  "text/csv": [".csv"],
  "application/json": [".json"],
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
});

/** Maximum allowed file size in bytes (10 MB default). */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// ── Validation ─────────────────────────────────────────────────────────────

/**
 * Returns true if the MIME type is in the accepted list.
 * @param {string} mimeType
 * @returns {boolean}
 */
export function validateFileType(mimeType) {
  return Object.prototype.hasOwnProperty.call(ACCEPTED_MIME_TYPES, mimeType);
}

/**
 * Returns true if the file size is within `maxBytes`.
 * @param {number} sizeBytes
 * @param {number} [maxBytes=MAX_FILE_SIZE_BYTES]
 * @returns {boolean}
 */
export function validateFileSize(sizeBytes, maxBytes = MAX_FILE_SIZE_BYTES) {
  return typeof sizeBytes === "number" && sizeBytes >= 0 && sizeBytes <= maxBytes;
}

/**
 * Human-readable file size string (B / KB / MB / GB).
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (typeof bytes !== "number" || bytes < 0) return "0 B";
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ── Drop + File list parsing ───────────────────────────────────────────────

/**
 * Normalises a DataTransfer or FileList into an array of plain file descriptors.
 * Works with both real `File` objects and plain test stubs with the same shape.
 * @param {DataTransfer|FileList|Array} source
 * @returns {Array<{ name: string, type: string, size: number, valid: boolean, reason?: string }>}
 */
export function parseDroppedFiles(source) {
  /** @type {Array} */
  let files = [];

  if (!source) return [];

  if (Array.isArray(source)) {
    files = source;
  } else if (source.files) {
    files = Array.from(source.files);
  } else if (source.items) {
    files = Array.from(source.items)
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter(Boolean);
  } else {
    return [];
  }

  return files.map((file) => {
    if (!validateFileType(file.type)) {
      return { name: file.name, type: file.type, size: file.size, valid: false, reason: "unsupported_type" };
    }
    if (!validateFileSize(file.size)) {
      return { name: file.name, type: file.type, size: file.size, valid: false, reason: "too_large" };
    }
    return { name: file.name, type: file.type, size: file.size, valid: true };
  });
}

// ── Async text / JSON readers ──────────────────────────────────────────────

/**
 * Reads a File (or Blob) as a UTF-8 string.
 * @param {File|Blob} file
 * @returns {Promise<string>}
 */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(/** @type {string} */ (reader.result));
    reader.onerror = () => reject(new Error(`Failed to read file: ${reader.error?.message ?? "unknown"}`));
    reader.readAsText(file, "UTF-8");
  });
}

/**
 * Reads a File as JSON (parses after reading text).
 * Rejects if the content is not valid JSON.
 * @param {File|Blob} file
 * @returns {Promise<object|Array>}
 */
export async function readFileAsJson(file) {
  const text = await readFileAsText(file);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("File does not contain valid JSON");
  }
}

// ── CSV splitting ──────────────────────────────────────────────────────────

/**
 * Splits CSV text into chunks of `chunkSize` data rows (header row preserved in each chunk).
 * @param {string} csvText
 * @param {number} [chunkSize=200]
 * @returns {string[]}
 */
export function splitCsvFile(csvText, chunkSize = 200) {
  if (!csvText || typeof csvText !== "string") return [];
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [csvText];

  const [header, ...dataLines] = lines;
  const nonEmpty = dataLines.filter((l) => l.trim() !== "");

  if (nonEmpty.length === 0) return [];

  const chunks = [];
  for (let i = 0; i < nonEmpty.length; i += chunkSize) {
    const slice = nonEmpty.slice(i, i + chunkSize);
    chunks.push(`${header}\n${slice.join("\n")}`);
  }
  return chunks;
}

// ── File metadata ──────────────────────────────────────────────────────────

/**
 * Builds a plain metadata descriptor for a File-like object.
 * @param {{ name: string, size: number, type: string, lastModified?: number }} file
 * @returns {{ name: string, extension: string, size: number, sizeFormatted: string, type: string, lastModified: number|null, valid: boolean }}
 */
export function buildFileMetadata(file) {
  if (!file || typeof file.name !== "string") {
    throw new Error("file must have a name property");
  }

  const lastDot = file.name.lastIndexOf(".");
  const extension = lastDot >= 0 ? file.name.slice(lastDot).toLowerCase() : "";

  return {
    name: file.name,
    extension,
    size: file.size ?? 0,
    sizeFormatted: formatBytes(file.size ?? 0),
    type: file.type ?? "",
    lastModified: file.lastModified ?? null,
    valid: validateFileType(file.type ?? "") && validateFileSize(file.size ?? 0),
  };
}

/**
 * Returns the canonical MIME type for a given file extension.
 * Returns null when not recognised.
 * @param {string} extension - e.g. ".csv" or "csv"
 * @returns {string|null}
 */
export function getMimeTypeForExtension(extension) {
  const ext = extension.startsWith(".") ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
  for (const [mime, exts] of Object.entries(ACCEPTED_MIME_TYPES)) {
    if (exts.includes(ext)) return mime;
  }
  return null;
}
