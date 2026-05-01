/**
 * Tiny 5-field cron parser ("min hour dom mon dow").  Supports `*`, lists
 * (`1,2,3`), ranges (`1-5`), and step values (`*\/15`).  No I/O.  The
 * `nextRun` helper iterates minute-by-minute up to a bound.
 *
 * @typedef {object} CronSpec
 * @property {Set<number>} minute - 0..59
 * @property {Set<number>} hour - 0..23
 * @property {Set<number>} dom - 1..31
 * @property {Set<number>} month - 1..12
 * @property {Set<number>} dow - 0..6 (Sun..Sat)
 * @owner shared
 */

const RANGES = [
  { min: 0, max: 59 },
  { min: 0, max: 23 },
  { min: 1, max: 31 },
  { min: 1, max: 12 },
  { min: 0, max: 6 },
];

/**
 * Parse a 5-field cron expression.
 *
 * @param {string} expr
 * @returns {CronSpec}
 */
export function parseCron(expr) {
  if (typeof expr !== "string") throw new Error("cron: string required");
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error("cron: expected 5 fields");
  const [minute, hour, dom, month, dow] = parts.map((field, idx) =>
    parseField(field, RANGES[idx].min, RANGES[idx].max),
  );
  return { minute, hour, dom, month, dow };
}

/**
 * Test whether the given Date matches the cron spec.
 *
 * @param {CronSpec} spec
 * @param {Date} date
 * @returns {boolean}
 */
export function matches(spec, date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false;
  return (
    spec.minute.has(date.getMinutes()) &&
    spec.hour.has(date.getHours()) &&
    spec.dom.has(date.getDate()) &&
    spec.month.has(date.getMonth() + 1) &&
    spec.dow.has(date.getDay())
  );
}

/**
 * Find the next minute boundary at or after `from` that matches the spec.
 *
 * @param {CronSpec} spec
 * @param {Date} from
 * @param {number} [maxIterations]
 * @returns {Date | null}
 */
export function nextRun(spec, from, maxIterations = 366 * 24 * 60) {
  if (!(from instanceof Date) || Number.isNaN(from.getTime())) return null;
  const cursor = new Date(from.getTime());
  cursor.setSeconds(0, 0);
  if (cursor.getTime() < from.getTime()) {
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  for (let i = 0; i < maxIterations; i += 1) {
    if (matches(spec, cursor)) return new Date(cursor.getTime());
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return null;
}

/**
 * @param {string} field
 * @param {number} min
 * @param {number} max
 * @returns {Set<number>}
 */
function parseField(field, min, max) {
  /** @type {Set<number>} */
  const values = new Set();
  for (const part of field.split(",")) {
    let step = 1;
    let body = part;
    const slash = part.indexOf("/");
    if (slash !== -1) {
      step = Number(part.slice(slash + 1));
      body = part.slice(0, slash);
      if (!Number.isInteger(step) || step < 1) {
        throw new Error(`cron: invalid step "${part}"`);
      }
    }
    let lo = min;
    let hi = max;
    if (body !== "*") {
      const dash = body.indexOf("-");
      if (dash === -1) {
        const n = Number(body);
        if (!Number.isInteger(n)) throw new Error(`cron: invalid value "${body}"`);
        lo = n;
        hi = step === 1 ? n : max;
      } else {
        lo = Number(body.slice(0, dash));
        hi = Number(body.slice(dash + 1));
        if (!Number.isInteger(lo) || !Number.isInteger(hi)) {
          throw new Error(`cron: invalid range "${body}"`);
        }
      }
    }
    if (lo < min || hi > max || lo > hi) {
      throw new Error(`cron: out of range "${part}"`);
    }
    for (let v = lo; v <= hi; v += step) values.add(v);
  }
  return values;
}
