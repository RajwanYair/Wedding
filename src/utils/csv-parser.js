/**
 * RFC 4180-ish CSV parser — handles quoted fields, embedded commas,
 * embedded newlines, and doubled-quote escaping.  Pure, no I/O.
 *
 * @typedef {object} ParseOptions
 * @property {string} [delimiter] - field separator, default ","
 * @property {boolean} [header] - treat first row as header, default false
 * @property {boolean} [trim] - trim each field, default false
 */

/**
 * Parse CSV text into rows of strings (or objects when header=true).
 *
 * @param {string} input
 * @param {ParseOptions} [options]
 * @returns {string[][] | Record<string, string>[]}
 */
export function parseCsv(input, options = {}) {
  const delimiter = options.delimiter ?? ",";
  const trim = options.trim === true;
  const text = typeof input === "string" ? input : "";

  /** @type {string[][]} */
  const rows = [];
  /** @type {string[]} */
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  const flushField = () => {
    row.push(trim ? field.trim() : field);
    field = "";
  };
  const flushRow = () => {
    rows.push(row);
    row = [];
  };

  while (i < len) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
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
    if (ch === delimiter) {
      flushField();
      i += 1;
      continue;
    }
    if (ch === "\r") {
      if (text[i + 1] === "\n") i += 2;
      else i += 1;
      flushField();
      flushRow();
      continue;
    }
    if (ch === "\n") {
      flushField();
      flushRow();
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  if (field.length > 0 || row.length > 0) {
    flushField();
    flushRow();
  }

  if (options.header === true) {
    const head = rows.shift() ?? [];
    return rows.map((r) => {
      /** @type {Record<string, string>} */
      const obj = {};
      head.forEach((key, idx) => {
        obj[key] = r[idx] ?? "";
      });
      return obj;
    });
  }
  return rows;
}
