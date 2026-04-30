/**
 * src/utils/photo-organize.js — S462: Photo organisation helpers.
 *
 * Pure functions over a Photo[] list with `takenAt` ISO timestamps. Used by
 * the gallery section to render chronological galleries grouped by day, and
 * to sort photos uploaded in batch.
 */

/**
 * @typedef {object} PhotoLite
 * @property {string} id
 * @property {string} [url]
 * @property {string} [takenAt]      ISO date/time of capture.
 * @property {string} [uploadedAt]   ISO date/time of upload.
 */

/**
 * @param {string|undefined} iso
 * @returns {number}
 */
function _ts(iso) {
  if (!iso) return 0;
  const n = Date.parse(iso);
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {PhotoLite} p
 * @returns {number}  Most-relevant epoch ms for ordering.
 */
function _photoEpoch(p) {
  return _ts(p.takenAt) || _ts(p.uploadedAt);
}

/**
 * Sort photos chronologically (oldest first by default).
 *
 * @param {PhotoLite[]} photos
 * @param {"asc" | "desc"} [order="asc"]
 * @returns {PhotoLite[]}  New array.
 */
export function sortByDate(photos, order = "asc") {
  if (!Array.isArray(photos)) return [];
  const dir = order === "desc" ? -1 : 1;
  return [...photos].sort((a, b) => (_photoEpoch(a) - _photoEpoch(b)) * dir);
}

/**
 * Group photos by `YYYY-MM-DD` (UTC). Returned in oldest-first order.
 *
 * @param {PhotoLite[]} photos
 * @returns {Array<{ day: string, photos: PhotoLite[] }>}
 */
export function groupByDay(photos) {
  if (!Array.isArray(photos)) return [];
  /** @type {Map<string, PhotoLite[]>} */
  const groups = new Map();
  for (const p of photos) {
    const ts = _photoEpoch(p);
    if (!ts) continue;
    const day = new Date(ts).toISOString().slice(0, 10);
    let bucket = groups.get(day);
    if (!bucket) {
      bucket = [];
      groups.set(day, bucket);
    }
    bucket.push(p);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, ps]) => ({ day, photos: sortByDate(ps, "asc") }));
}

/**
 * Filter photos taken within `[start, end]` inclusive. Either bound may be
 * `null`/`undefined` to leave that side open.
 *
 * @param {PhotoLite[]} photos
 * @param {string|null|undefined} start  ISO date/time
 * @param {string|null|undefined} end    ISO date/time
 * @returns {PhotoLite[]}
 */
export function filterByDateRange(photos, start, end) {
  if (!Array.isArray(photos)) return [];
  const lo = start ? _ts(start) : -Infinity;
  const hi = end ? _ts(end) : Infinity;
  if (start && lo === 0) return [];
  if (end && hi === 0) return [];
  return photos.filter((p) => {
    const ts = _photoEpoch(p);
    return ts !== 0 && ts >= lo && ts <= hi;
  });
}
