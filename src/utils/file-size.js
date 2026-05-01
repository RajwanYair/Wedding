/**
 * Format a byte count as a human-readable file size.  Supports binary
 * (`KiB`, `MiB`) and decimal (`kB`, `MB`) modes plus EN/HE locale labels.
 * @owner shared
 */

const UNITS_BIN = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];
const UNITS_DEC = ["B", "kB", "MB", "GB", "TB", "PB"];
const UNITS_HE = ["בייט", 'ק״ב', 'מ״ב', 'ג״ב', 'ט״ב', 'פ״ב'];

/**
 * @param {number} bytes
 * @param {{
 *   base?: 2 | 10,
 *   decimals?: number,
 *   locale?: "en" | "he",
 * }} [opts]
 * @returns {string}
 */
export function formatFileSize(bytes, opts = {}) {
  if (!Number.isFinite(bytes)) return "";
  const base = opts.base === 10 ? 1000 : 1024;
  const decimals = Math.max(0, Math.min(6, opts.decimals ?? 2));
  const locale = opts.locale ?? "en";
  const sign = bytes < 0 ? "-" : "";
  let n = Math.abs(bytes);
  const labels =
    locale === "he" ? UNITS_HE : opts.base === 10 ? UNITS_DEC : UNITS_BIN;
  let i = 0;
  while (n >= base && i < labels.length - 1) {
    n /= base;
    i += 1;
  }
  const fixed = i === 0 ? Math.round(n).toString() : n.toFixed(decimals);
  return `${sign}${fixed} ${labels[i]}`;
}

/**
 * Parse a human file size like `"1.5 MB"`, `"512KiB"`, `"3 גיגה"` (HE
 * uses the same prefix letters in `UNITS_HE`).  Returns bytes or `null`.
 *
 * @param {string} input
 * @returns {number | null}
 */
export function parseFileSize(input) {
  if (typeof input !== "string") return null;
  const m = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*([A-Za-z\u05d0-\u05ea״]+)?$/);
  if (!m) return null;
  const value = Number(m[1]);
  if (!Number.isFinite(value)) return null;
  const rawUnit = (m[2] ?? "B").trim();
  const factor = unitFactor(rawUnit);
  if (factor === null) return null;
  return value * factor;
}

/**
 * @param {string} unit
 * @returns {number | null}
 */
function unitFactor(unit) {
  // Hebrew (binary semantics) — matched on original glyphs.
  if (unit.includes('ק״ב')) return 1024;
  if (unit.includes('מ״ב')) return 1024 ** 2;
  if (unit.includes('ג״ב')) return 1024 ** 3;
  if (unit.includes('ט״ב')) return 1024 ** 4;
  if (unit.startsWith("בייט")) return 1;
  // Binary forms (case sensitive — uppercase prefix + i + B/b).
  if (/^[KkMGTP]iB$/.test(unit)) {
    const idx = "KMGTP".indexOf(unit[0].toUpperCase());
    return 1024 ** (idx + 1);
  }
  // Decimal forms — kB / MB / GB / TB / PB (B uppercase, prefix any).
  if (/^[kKMGTP]B$/.test(unit)) {
    const idx = "KMGTP".indexOf(unit[0].toUpperCase());
    return 1000 ** (idx + 1);
  }
  // Plain prefix without B → binary (K/M/G/T/P).
  if (/^[KMGTP]$/.test(unit.toUpperCase())) {
    const idx = "KMGTP".indexOf(unit.toUpperCase());
    return 1024 ** (idx + 1);
  }
  const u = unit.toLowerCase();
  if (u === "b" || u === "byte" || u === "bytes") return 1;
  return null;
}
