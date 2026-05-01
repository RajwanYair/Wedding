/**
 * Strip leading byte-order marks from imported text — common cause of
 * silent failures in CSV / JSON imports from Excel and Google Sheets.
 */

const BOMS = [
  // UTF-8 BOM as a single code-point.
  "\uFEFF",
];

/**
 * Strip a leading UTF-8 / UTF-16 BOM from a string.  Returns the input
 * unchanged when no BOM is present.  Non-string inputs become empty
 * strings.
 *
 * @param {string} input
 * @returns {string}
 */
export function stripBom(input) {
  if (typeof input !== "string" || input.length === 0) return "";
  for (const bom of BOMS) {
    if (input.startsWith(bom)) return input.slice(bom.length);
  }
  return input;
}

/**
 * Strip a leading BOM from a `Uint8Array` (UTF-8: EF BB BF, UTF-16 LE:
 * FF FE, UTF-16 BE: FE FF).  Returns a new view; original is untouched.
 *
 * @param {Uint8Array} bytes
 * @returns {Uint8Array}
 */
export function stripBomBytes(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("stripBomBytes: expected Uint8Array");
  }
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return bytes.subarray(3);
  }
  if (bytes.length >= 2) {
    if (bytes[0] === 0xff && bytes[1] === 0xfe) return bytes.subarray(2);
    if (bytes[0] === 0xfe && bytes[1] === 0xff) return bytes.subarray(2);
  }
  return bytes;
}

/**
 * Returns true if the string starts with a UTF BOM.
 * @param {string} input
 * @returns {boolean}
 */
export function hasBom(input) {
  if (typeof input !== "string" || input.length === 0) return false;
  return BOMS.some((b) => input.startsWith(b));
}
