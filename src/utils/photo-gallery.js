/**
 * photo-gallery.js — Wedding photo metadata and album organisation
 *
 * Pure data utilities. No DOM access.
 */

// ── Photo entry ────────────────────────────────────────────────────────────

/**
 * Create a normalised photo entry.
 * @param {{url: string, filename?: string, takenAt?: string|Date, sizeByes?: number, tags?: string[], caption?: string}} opts
 * @returns {object}
 */
export function createPhotoEntry({ url, filename = "", takenAt = null, sizeBytes = 0, tags = [], caption = "" } = {}) {
  if (!url || typeof url !== "string") return null;
  return {
    id: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    url: url.trim(),
    filename: filename.trim(),
    takenAt: takenAt ? new Date(takenAt).toISOString() : null,
    sizeBytes: typeof sizeBytes === "number" && sizeBytes >= 0 ? sizeBytes : 0,
    tags: Array.isArray(tags) ? [...tags] : [],
    caption: caption.trim(),
  };
}

// ── Album ─────────────────────────────────────────────────────────────────

/**
 * Build an album container from an array of photo entries.
 * @param {string} name
 * @param {object[]} photos
 * @returns {object}
 */
export function buildAlbum(name, photos = []) {
  return {
    id: `album_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: typeof name === "string" ? name.trim() : "",
    photos: Array.isArray(photos) ? [...photos] : [],
    createdAt: new Date().toISOString(),
  };
}

// ── Grouping / filtering ──────────────────────────────────────────────────

/**
 * Group photos by tag.  Photos with multiple tags appear under each tag.
 * @param {object[]} photos
 * @returns {Record<string, object[]>}
 */
export function groupByTag(photos) {
  if (!Array.isArray(photos)) return {};
  const result = {};
  for (const photo of photos) {
    const tags = Array.isArray(photo.tags) ? photo.tags : [];
    for (const tag of tags) {
      if (!result[tag]) result[tag] = [];
      result[tag].push(photo);
    }
  }
  return result;
}

/**
 * Filter photos by a single tag.
 * @param {object[]} photos
 * @param {string} tag
 * @returns {object[]}
 */
export function filterByTag(photos, tag) {
  if (!Array.isArray(photos) || !tag) return [];
  return photos.filter(p => Array.isArray(p.tags) && p.tags.includes(tag));
}

// ── Sorting ───────────────────────────────────────────────────────────────

/**
 * Return a new array sorted by takenAt ascending.  Nulls sort last.
 * @param {object[]} album
 * @returns {object[]}
 */
export function sortAlbumByDate(album) {
  if (!Array.isArray(album)) return [];
  return [...album].sort((a, b) => {
    if (!a.takenAt && !b.takenAt) return 0;
    if (!a.takenAt) return 1;
    if (!b.takenAt) return -1;
    return new Date(a.takenAt) - new Date(b.takenAt);
  });
}

// ── Manifest ─────────────────────────────────────────────────────────────

/**
 * Build a gallery manifest (summary + photo list).
 * @param {object[]} photos
 * @returns {object}
 */
export function buildGalleryManifest(photos) {
  if (!Array.isArray(photos)) {
    return { total: 0, totalSize: 0, tags: [], photos: [] };
  }
  const allTags = new Set();
  let totalSize = 0;
  for (const p of photos) {
    totalSize += p.sizeBytes ?? 0;
    (p.tags ?? []).forEach(t => allTags.add(t));
  }
  return {
    total: photos.length,
    totalSize,
    tags: [...allTags].sort(),
    photos: [...photos],
  };
}

// ── Storage estimate ──────────────────────────────────────────────────────

/**
 * Estimate total storage used by photos in bytes.
 * @param {object[]} photos
 * @returns {number}
 */
export function estimateStorageSize(photos) {
  if (!Array.isArray(photos)) return 0;
  return photos.reduce((sum, p) => sum + (typeof p.sizeBytes === "number" ? p.sizeBytes : 0), 0);
}

// ── Stats ────────────────────────────────────────────────────────────────

/**
 * Return aggregate stats for an album.
 * @param {object} album  buildAlbum() result
 * @returns {object}
 */
export function getAlbumStats(album) {
  if (!album || !Array.isArray(album.photos)) {
    return { total: 0, totalSize: 0, tagCount: 0, withCaption: 0 };
  }
  const photos = album.photos;
  const allTags = new Set();
  let withCaption = 0;
  let totalSize = 0;
  for (const p of photos) {
    totalSize += p.sizeBytes ?? 0;
    if (p.caption && p.caption.trim()) withCaption++;
    (p.tags ?? []).forEach(t => allTags.add(t));
  }
  return { total: photos.length, totalSize, tagCount: allTags.size, withCaption };
}
