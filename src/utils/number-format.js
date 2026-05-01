/**
 * Number formatting helpers — thousands grouping, decimals, signed display,
 * compact short-scale (k/M/B), and Hebrew-friendly formatting via
 * `Intl.NumberFormat`.  Pure: no DOM, no locale side-effects.
 * @owner shared
 */

/**
 * @typedef {object} FormatOptions
 * @property {string} [locale]
 * @property {number} [decimals]
 * @property {boolean} [grouping]
 * @property {boolean} [signed]
 */

/**
 * Format a number with grouping and fixed decimals.
 *
 * @param {number} n
 * @param {FormatOptions} [options]
 * @returns {string}
 */
export function formatNumber(n, options = {}) {
  if (!Number.isFinite(n)) return "";
  const decimals = options.decimals ?? 0;
  const fmt = new Intl.NumberFormat(options.locale ?? "en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: options.grouping ?? true,
  });
  const out = fmt.format(n);
  if (options.signed && n > 0) return `+${out}`;
  return out;
}

/**
 * Compact format using short-scale suffixes.
 *
 * @param {number} n
 * @param {{locale?: string, decimals?: number}} [options]
 * @returns {string}
 */
export function formatCompact(n, options = {}) {
  if (!Number.isFinite(n)) return "";
  const abs = Math.abs(n);
  /** @type {Array<{limit: number, suffix: string, divisor: number}>} */
  const tiers = [
    { limit: 1e12, suffix: "T", divisor: 1e12 },
    { limit: 1e9, suffix: "B", divisor: 1e9 },
    { limit: 1e6, suffix: "M", divisor: 1e6 },
    { limit: 1e3, suffix: "k", divisor: 1e3 },
  ];
  for (const tier of tiers) {
    if (abs >= tier.limit) {
      const scaled = n / tier.divisor;
      return (
        formatNumber(scaled, {
          locale: options.locale,
          decimals: options.decimals ?? 1,
        }) + tier.suffix
      );
    }
  }
  return formatNumber(n, {
    locale: options.locale,
    decimals: options.decimals ?? 0,
  });
}

/**
 * Format as percent (n is a fraction, e.g. 0.42 → "42%").
 *
 * @param {number} n
 * @param {{decimals?: number, locale?: string}} [options]
 * @returns {string}
 */
export function formatPercent(n, options = {}) {
  if (!Number.isFinite(n)) return "";
  const decimals = options.decimals ?? 0;
  const fmt = new Intl.NumberFormat(options.locale ?? "en-US", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return fmt.format(n);
}

/**
 * Clamp + round to a fixed decimal count without floating-point drift.
 *
 * @param {number} n
 * @param {number} [decimals]
 * @returns {number}
 */
export function roundTo(n, decimals = 0) {
  if (!Number.isFinite(n)) return Number.NaN;
  const factor = Math.pow(10, Math.floor(decimals));
  return Math.round(n * factor) / factor;
}
