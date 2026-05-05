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
 * @owner shared
 * @module csv
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
      // @ts-ignore
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

// ──────────────────────────────────────────────────────────────────────────
// csv-parse
// ──────────────────────────────────────────────────────────────────────────

/**
 * @param {string} input
 * @param {{ delimiter?: string }} [opts]
 * @returns {string[][]}
 */
export function parseCsv(input, opts = {}) {
  const delim = opts.delimiter ?? ",";
  /** @type {string[][]} */
  const rows = [];
  if (typeof input !== "string" || input.length === 0) return rows;
  /** @type {string[]} */
  let row = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  while (i < input.length) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === delim) {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (ch === "\r") {
      if (input[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  // flush trailing field/row when input doesn't end with newline
  row.push(field);
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows;
}

/**
 * Parse CSV with header row into objects keyed by the first row.
 *
 * @param {string} input
 * @param {{ delimiter?: string }} [opts]
 * @returns {Array<Record<string, string>>}
 */
export function parseCsvObjects(input, opts) {
  const rows = parseCsv(input, opts);
  if (rows.length === 0) return [];
  const headers = rows[0];
  /** @type {Array<Record<string, string>>} */
  const out = [];
  for (let r = 1; r < rows.length; r += 1) {
    const row = rows[r];
    /** @type {Record<string, string>} */
    const obj = {};
    for (let c = 0; c < headers.length; c += 1) {
      obj[headers[c]] = row[c] ?? "";
    }
    out.push(obj);
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────────
// csv-stringify
// ──────────────────────────────────────────────────────────────────────────

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
