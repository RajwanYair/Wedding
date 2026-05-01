/**
 * RFC-4180 CSV stringifier.  Quotes fields that contain commas, quotes,
 * or line breaks; escapes embedded quotes by doubling them.
 * @owner shared
 */

/**
 * @param {ReadonlyArray<ReadonlyArray<unknown>>} rows
 * @param {{ delimiter?: string, eol?: string }} [opts]
 * @returns {string}
 */
export function stringifyCsv(rows, opts = {}) {
  const delim = opts.delimiter ?? ",";
  const eol = opts.eol ?? "\r\n";
  if (!Array.isArray(rows)) return "";
  return rows.map((row) => stringifyRow(row, delim)).join(eol);
}

/**
 * Stringify an array of objects using a fixed column list.
 *
 * @template T
 * @param {ReadonlyArray<T>} rows
 * @param {ReadonlyArray<string>} columns
 * @param {{ delimiter?: string, eol?: string, header?: boolean }} [opts]
 * @returns {string}
 */
export function stringifyCsvObjects(rows, columns, opts = {}) {
  const delim = opts.delimiter ?? ",";
  const eol = opts.eol ?? "\r\n";
  const header = opts.header !== false;
  /** @type {string[]} */
  const out = [];
  if (header) out.push(stringifyRow(columns, delim));
  if (Array.isArray(rows)) {
    for (const row of rows) {
      out.push(
        stringifyRow(
          columns.map((c) => (row == null ? "" : /** @type {any} */ (row)[c])),
          delim,
        ),
      );
    }
  }
  return out.join(eol);
}

/**
 * @param {ReadonlyArray<unknown>} row
 * @param {string} delim
 */
function stringifyRow(row, delim) {
  return row.map((cell) => quote(cell, delim)).join(delim);
}

/**
 * @param {unknown} cell
 * @param {string} delim
 */
function quote(cell, delim) {
  if (cell == null) return "";
  const s = String(cell);
  if (
    s.includes(delim) ||
    s.includes('"') ||
    s.includes("\n") ||
    s.includes("\r")
  ) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
