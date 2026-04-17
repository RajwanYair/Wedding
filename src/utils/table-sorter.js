/**
 * src/utils/table-sorter.js — Multi-column table sorting utilities (Sprint 203)
 *
 * Pure comparison functions and sort-state management for data tables.
 * Zero dependencies.
 */

/**
 * @typedef {"asc"|"desc"} SortDir
 * @typedef {{ key: string, dir: SortDir }} SortState
 */

/**
 * Toggle a sort direction.
 * @param {SortDir} dir
 * @returns {SortDir}
 */
export function toggleDir(dir) {
  return dir === "asc" ? "desc" : "asc";
}

/**
 * Given a current sort state and a clicked column key, produce the new state.
 * Clicking the same column toggles direction; clicking a new column defaults to asc.
 *
 * @param {SortState|null} current
 * @param {string}         key     Column key being clicked
 * @param {SortDir}        [defaultDir]
 * @returns {SortState}
 */
export function nextSortState(current, key, defaultDir = "asc") {
  if (!current || current.key !== key) return { key, dir: defaultDir };
  return { key, dir: toggleDir(current.dir) };
}

/**
 * Compare two primitive values for ascending sort.
 * Handles strings (locale-aware), numbers, booleans, and dates.
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {number}  -1 | 0 | 1
 */
export function compareAsc(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Compare two primitive values for descending sort.
 * @param {unknown} a
 * @param {unknown} b
 * @returns {number}
 */
export function compareDesc(a, b) {
  return compareAsc(b, a);
}

/**
 * Sort an array of objects by a single field.
 *
 * @template T
 * @param {T[]} items
 * @param {string} key         Object field to sort by (supports nested "a.b" paths)
 * @param {SortDir} [dir]
 * @returns {T[]}  A new sorted array (does not mutate).
 */
export function sortBy(items, key, dir = "asc") {
  if (!items.length) return [];
  const cmp = dir === "asc" ? compareAsc : compareDesc;
  return [...items].sort((a, b) => cmp(getPath(a, key), getPath(b, key)));
}

/**
 * Sort by multiple fields, applied in order.
 *
 * @template T
 * @param {T[]} items
 * @param {SortState[]} sorts   Array of { key, dir } in priority order.
 * @returns {T[]}
 */
export function sortByMulti(items, sorts) {
  if (!items.length || !sorts.length) return [...items];
  return [...items].sort((a, b) => {
    for (const { key, dir } of sorts) {
      const cmp = dir === "asc" ? compareAsc : compareDesc;
      const result = cmp(getPath(a, key), getPath(b, key));
      if (result !== 0) return result;
    }
    return 0;
  });
}

/**
 * Resolve a (possibly nested) dot-path on an object.
 * @param {Record<string, unknown>} obj
 * @param {string} path  e.g. "address.city"
 * @returns {unknown}
 */
export function getPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((acc, k) => (acc != null ? acc[k] : undefined), obj);
}

/**
 * Produce a new sort state cycling through: asc → desc → none (null).
 *
 * @param {SortState|null} current
 * @param {string}         key
 * @returns {SortState|null}
 */
export function cycleSortState(current, key) {
  if (!current || current.key !== key) return { key, dir: "asc" };
  if (current.dir === "asc") return { key, dir: "desc" };
  return null;
}
