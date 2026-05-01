/**
 * Stable multi-key sorter with optional locale-aware string compare.
 *
 * @typedef {object} SortKey
 * @property {string | ((row: any) => any)} key - prop name or selector
 * @property {"asc" | "desc"} [dir]
 * @property {"locale" | "natural" | "raw"} [compare]
 * @property {string} [locale]
 * @owner shared
 */

/**
 * Sort an array stably by one or more keys.  Returns a new array.
 *
 * @template T
 * @param {ReadonlyArray<T>} rows
 * @param {ReadonlyArray<SortKey>} keys
 * @returns {T[]}
 */
export function sortBy(rows, keys) {
  if (!Array.isArray(rows)) return [];
  if (!Array.isArray(keys) || keys.length === 0) return rows.slice();
  const indexed = rows.map((row, idx) => ({ row, idx }));
  indexed.sort((a, b) => {
    for (const k of keys) {
      const cmp = compareKey(a.row, b.row, k);
      if (cmp !== 0) return k.dir === "desc" ? -cmp : cmp;
    }
    return a.idx - b.idx;
  });
  return indexed.map((x) => x.row);
}

/**
 * @param {any} a
 * @param {any} b
 * @param {SortKey} k
 * @returns {number}
 */
function compareKey(a, b, k) {
  const va = pluck(a, k.key);
  const vb = pluck(b, k.key);
  if (va === undefined && vb === undefined) return 0;
  if (va === undefined) return 1;
  if (vb === undefined) return -1;
  if (va === null && vb === null) return 0;
  if (va === null) return 1;
  if (vb === null) return -1;
  const mode = k.compare ?? "raw";
  if (mode === "locale" && typeof va === "string" && typeof vb === "string") {
    return va.localeCompare(vb, k.locale ?? undefined, { sensitivity: "base" });
  }
  if (mode === "natural" && typeof va === "string" && typeof vb === "string") {
    return va.localeCompare(vb, k.locale ?? undefined, {
      numeric: true,
      sensitivity: "base",
    });
  }
  if (typeof va === "number" && typeof vb === "number") return va - vb;
  if (va < vb) return -1;
  if (va > vb) return 1;
  return 0;
}

/**
 * @param {any} row
 * @param {string | ((row: any) => any)} key
 */
function pluck(row, key) {
  if (typeof key === "function") return key(row);
  if (row == null || typeof row !== "object") return undefined;
  return row[key];
}
