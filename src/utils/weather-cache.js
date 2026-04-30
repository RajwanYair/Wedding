/**
 * Weather forecast cache helpers — store, freshness check, and human delta.
 *
 * Pure functions over a serialisable cache record. Storage I/O is the
 * caller's responsibility (e.g. `localStorage.setItem("wedding_v1_weather",
 * JSON.stringify(record))`).
 *
 * @typedef {object} WeatherSnapshot
 * @property {number} tempC          Temperature in degrees Celsius.
 * @property {number} [precipPct]    Precipitation probability 0..100.
 * @property {number} [windKph]
 * @property {string} [conditions]   Free-form label ("clear", "rain"…).
 *
 * @typedef {object} WeatherCache
 * @property {string} fetchedAt        ISO timestamp of fetch.
 * @property {string} forDate          ISO date the forecast is for.
 * @property {WeatherSnapshot} snapshot
 */

const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000; // 6h

/**
 * Build a cache record from a snapshot.
 *
 * @param {WeatherSnapshot} snapshot
 * @param {string} forDate
 * @param {string} [fetchedAt=new Date().toISOString()]
 * @returns {WeatherCache}
 */
export function makeCache(snapshot, forDate, fetchedAt) {
  if (!snapshot || !Number.isFinite(snapshot.tempC)) {
    throw new TypeError("snapshot.tempC must be a finite number");
  }
  if (typeof forDate !== "string" || forDate.length === 0) {
    throw new TypeError("forDate must be a non-empty string");
  }
  return {
    fetchedAt: fetchedAt ?? new Date().toISOString(),
    forDate,
    snapshot: { ...snapshot },
  };
}

/**
 * True iff the cache is missing, malformed, or older than `ttlMs`.
 *
 * @param {WeatherCache | null | undefined} cache
 * @param {number} [ttlMs=DEFAULT_TTL_MS]
 * @param {number} [now=Date.now()]
 * @returns {boolean}
 */
export function isStale(cache, ttlMs = DEFAULT_TTL_MS, now = Date.now()) {
  if (!cache || typeof cache.fetchedAt !== "string") return true;
  const t = Date.parse(cache.fetchedAt);
  if (!Number.isFinite(t)) return true;
  if (!Number.isFinite(ttlMs) || ttlMs < 0) return true;
  return now - t > ttlMs;
}

/**
 * Compare two snapshots and return the deltas.
 *
 * @param {WeatherSnapshot} previous
 * @param {WeatherSnapshot} next
 * @returns {{ tempDelta: number, precipDelta: number, windDelta: number }}
 */
export function diff(previous, next) {
  const safe = (a, b) => {
    const x = Number.isFinite(a) ? a : 0;
    const y = Number.isFinite(b) ? b : 0;
    return y - x;
  };
  return {
    tempDelta: safe(previous?.tempC, next?.tempC),
    precipDelta: safe(previous?.precipPct, next?.precipPct),
    windDelta: safe(previous?.windKph, next?.windKph),
  };
}

/**
 * Render a short human label like "+2°C, rain ↑5%".
 *
 * @param {{ tempDelta: number, precipDelta: number, windDelta: number }} delta
 * @returns {string}
 */
export function describeDelta(delta) {
  const parts = [];
  if (delta.tempDelta !== 0) {
    parts.push(`${delta.tempDelta > 0 ? "+" : ""}${delta.tempDelta.toFixed(1)}°C`);
  }
  if (delta.precipDelta !== 0) {
    parts.push(`rain ${delta.precipDelta > 0 ? "↑" : "↓"}${Math.abs(delta.precipDelta)}%`);
  }
  if (delta.windDelta !== 0) {
    parts.push(`wind ${delta.windDelta > 0 ? "↑" : "↓"}${Math.abs(delta.windDelta)}kph`);
  }
  return parts.join(", ");
}
