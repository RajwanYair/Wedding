/**
 * Streaming-friendly RFC-4180 CSV parser.  Handles quoted fields,
 * embedded commas / newlines, doubled-quote escapes, and \r\n or \n line
 * endings.  Returns an array of string arrays.
 * @owner shared
 */

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
