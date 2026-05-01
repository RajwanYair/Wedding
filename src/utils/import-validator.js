/**
 * Guest CSV row validator — pure schema check for imported guest rows.
 * Returns per-row errors keyed by field plus aggregate stats so the UI
 * can render a precise error report.
 *
 * @typedef {object} ImportRow
 * @property {string} [name]
 * @property {string} [phone]
 * @property {string} [email]
 * @property {string|number} [seats]
 * @property {string} [meal]
 * @property {string} [side]
 *
 * @typedef {object} RowReport
 * @property {number} index
 * @property {boolean} ok
 * @property {Record<string, string>} errors
 * @property {ImportRow} normalised
 *
 * @typedef {object} ImportReport
 * @property {RowReport[]} rows
 * @property {number} validCount
 * @property {number} invalidCount
 * @property {Record<string, number>} errorsByField
 * @owner shared
 */

const PHONE_RE = /^[+\d][\d\s\-()]{6,}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ALLOWED_SIDES = new Set(["bride", "groom", "both", ""]);

/**
 * Trim a string-or-number value and stringify it.
 *
 * @param {unknown} v
 * @returns {string}
 */
function asString(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/**
 * Validate a single row.
 *
 * @param {ImportRow} row
 * @param {number} index
 * @returns {RowReport}
 */
export function validateRow(row, index) {
  /** @type {Record<string, string>} */
  const errors = {};
  /** @type {ImportRow} */
  const normalised = {};

  const name = asString(row?.name);
  if (name.length === 0) errors.name = "required";
  else if (name.length > 120) errors.name = "too-long";
  normalised.name = name;

  const phone = asString(row?.phone);
  if (phone.length > 0) {
    if (!PHONE_RE.test(phone)) errors.phone = "invalid";
    normalised.phone = phone;
  }

  const email = asString(row?.email);
  if (email.length > 0) {
    if (!EMAIL_RE.test(email)) errors.email = "invalid";
    normalised.email = email;
  }

  const rawSeats = row?.seats;
  if (rawSeats !== undefined && rawSeats !== "") {
    const n = Number(rawSeats);
    if (!Number.isInteger(n) || n < 1 || n > 20) errors.seats = "invalid";
    else normalised.seats = n;
  } else {
    normalised.seats = 1;
  }

  const meal = asString(row?.meal).toLowerCase();
  if (meal.length > 40) errors.meal = "too-long";
  if (meal.length > 0) normalised.meal = meal;

  const side = asString(row?.side).toLowerCase();
  if (!ALLOWED_SIDES.has(side)) errors.side = "invalid";
  if (side.length > 0) normalised.side = side;

  return {
    index,
    ok: Object.keys(errors).length === 0,
    errors,
    normalised,
  };
}

/**
 * Validate a batch of rows and aggregate statistics.
 *
 * @param {ReadonlyArray<ImportRow>} rows
 * @returns {ImportReport}
 */
export function validateBatch(rows) {
  /** @type {RowReport[]} */
  const reports = [];
  /** @type {Record<string, number>} */
  const errorsByField = {};
  let validCount = 0;
  let invalidCount = 0;
  rows.forEach((row, idx) => {
    const r = validateRow(row, idx);
    reports.push(r);
    if (r.ok) validCount += 1;
    else {
      invalidCount += 1;
      for (const f of Object.keys(r.errors)) {
        errorsByField[f] = (errorsByField[f] ?? 0) + 1;
      }
    }
  });
  return { rows: reports, validCount, invalidCount, errorsByField };
}
