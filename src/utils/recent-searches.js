/**
 * src/utils/recent-searches.js — S461: Recent search history for the command palette.
 *
 * Maintains a most-recently-used deque (default cap 10) of search strings,
 * persisted to localStorage. Entries are de-duplicated case-insensitively but
 * the original casing of the most recent entry is preserved.
 */

const STORAGE_KEY = "wedding_v1_recent_searches";
const DEFAULT_CAP = 10;

/**
 * @returns {string[]}
 */
function _read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * @param {string[]} list
 */
function _write(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* storage disabled */
  }
}

/**
 * Add a search query to the recent list. Most-recent first; capped at `cap`.
 *
 * @param {string} query
 * @param {number} [cap=10]
 * @returns {string[]} The new list.
 */
export function addRecentSearch(query, cap = DEFAULT_CAP) {
  const trimmed = String(query ?? "").trim();
  if (!trimmed) return _read();
  const list = _read();
  const lower = trimmed.toLowerCase();
  const filtered = list.filter((q) => q.toLowerCase() !== lower);
  filtered.unshift(trimmed);
  const next = filtered.slice(0, Math.max(1, cap));
  _write(next);
  return next;
}

/**
 * @returns {string[]}
 */
export function listRecentSearches() {
  return _read();
}

/**
 * @param {string} query
 * @returns {string[]}
 */
export function removeRecentSearch(query) {
  const lower = String(query ?? "").trim().toLowerCase();
  if (!lower) return _read();
  const next = _read().filter((q) => q.toLowerCase() !== lower);
  _write(next);
  return next;
}

/**
 * Clear all recent searches.
 */
export function clearRecentSearches() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage disabled */
  }
}
