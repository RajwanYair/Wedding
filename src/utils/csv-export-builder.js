/**
 * Generic CSV export builder — RFC 4180-compliant escaping and BOM emission.
 *
 * Produces UTF-8 CSV strings safe for Excel and Google Sheets (Hebrew RTL OK).
 * Pure functions; no I/O. Pair with a Blob+URL.createObjectURL caller.
 *
 * @typedef {object} CsvColumn
 * @property {string} key            Property key on each row object.
 * @property {string} [header]       Display header (defaults to `key`).
 * @property {(value: unknown, row: object) => string} [format]
 *   Optional formatter (returns the *raw* string to be CSV-escaped).
 *
 * @typedef {object} CsvOptions
 * @property {string} [delimiter=","]   Field delimiter (one char).
 * @property {string} [newline="\r\n"]  Row terminator.
 * @property {boolean} [bom=true]       Prepend UTF-8 BOM (Excel friendliness).
 * @property {boolean} [headers=true]   Emit header row.
 */

/**
 * CSV-escape a single field per RFC 4180.
 *
 * @param {unknown} value
 * @param {string} delimiter
 * @returns {string}
 */
export function escapeField(value, delimiter = ",") {
  if (value === null || value === undefined) return "";
  let s = typeof value === "string" ? value : String(value);
  // Always quote if contains delimiter, quote, CR, LF, or leading/trailing space.
  const needsQuote =
    s.includes(delimiter) ||
    s.includes("\"") ||
    s.includes("\n") ||
    s.includes("\r") ||
    /^\s|\s$/.test(s);
  if (s.includes("\"")) s = s.replace(/"/g, "\"\"");
  return needsQuote ? `"${s}"` : s;
}

/**
 * Build a complete CSV document from rows + column descriptors.
 *
 * @param {ReadonlyArray<object>} rows
 * @param {ReadonlyArray<CsvColumn>} columns
 * @param {CsvOptions} [options]
 * @returns {string}
 */
export function buildCsv(rows, columns, options = {}) {
  const delimiter = options.delimiter ?? ",";
  const newline = options.newline ?? "\r\n";
  const bom = options.bom !== false;
  const includeHeaders = options.headers !== false;

  const lines = [];
  if (includeHeaders) {
    lines.push(
      columns
        .map((c) => escapeField(c.header ?? c.key, delimiter))
        .join(delimiter),
    );
  }
  for (const row of rows) {
    const cells = columns.map((c) => {
      const raw = row?.[c.key];
      const formatted = c.format ? c.format(raw, row) : raw;
      return escapeField(formatted, delimiter);
    });
    lines.push(cells.join(delimiter));
  }

  return (bom ? "\uFEFF" : "") + lines.join(newline);
}

/**
 * Convenience: derive columns from the keys of the first row.
 *
 * @param {ReadonlyArray<object>} rows
 * @returns {CsvColumn[]}
 */
export function inferColumns(rows) {
  if (!rows || rows.length === 0) return [];
  return Object.keys(rows[0]).map((key) => ({ key }));
}
