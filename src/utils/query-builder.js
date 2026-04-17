/**
 * src/utils/query-builder.js — In-memory query builder for store arrays (Sprint 162)
 *
 * Provides a fluent API for filtering, sorting, and paginating arrays
 * from the store. Zero dependencies, pure functions.
 *
 * Usage:
 *   const results = query(guests)
 *     .where("status", "confirmed")
 *     .whereIn("side", ["groom", "bride"])
 *     .orderBy("lastName", "asc")
 *     .limit(10)
 *     .toArray();
 */

/**
 * @template {Record<string, unknown>} T
 */
export class Query {
  /** @param {T[]} items */
  constructor(items) {
    this._items = Array.isArray(items) ? [...items] : [];
    this._filters = [];
    this._sortKey = null;
    this._sortDir = "asc";
    this._limitVal = null;
    this._offsetVal = 0;
  }

  /**
   * Filter by exact field value.
   * @param {keyof T} field
   * @param {unknown} value
   * @returns {this}
   */
  where(field, value) {
    this._filters.push((item) => item[field] === value);
    return this;
  }

  /**
   * Filter where field value is in the given array.
   * @param {keyof T} field
   * @param {unknown[]} values
   * @returns {this}
   */
  whereIn(field, values) {
    const set = new Set(values);
    this._filters.push((item) => set.has(item[field]));
    return this;
  }

  /**
   * Filter where field value is NOT in the given array.
   * @param {keyof T} field
   * @param {unknown[]} values
   * @returns {this}
   */
  whereNotIn(field, values) {
    const set = new Set(values);
    this._filters.push((item) => !set.has(item[field]));
    return this;
  }

  /**
   * Filter using a custom predicate.
   * @param {(item: T) => boolean} predicate
   * @returns {this}
   */
  filter(predicate) {
    this._filters.push(predicate);
    return this;
  }

  /**
   * Sort by a field.
   * @param {keyof T} field
   * @param {'asc' | 'desc'} [direction]
   * @returns {this}
   */
  orderBy(field, direction = "asc") {
    this._sortKey = field;
    this._sortDir = direction;
    return this;
  }

  /**
   * Limit result count.
   * @param {number} n
   * @returns {this}
   */
  limit(n) {
    this._limitVal = n;
    return this;
  }

  /**
   * Skip the first n results.
   * @param {number} n
   * @returns {this}
   */
  offset(n) {
    this._offsetVal = n;
    return this;
  }

  /**
   * Execute the query and return the resulting array.
   * @returns {T[]}
   */
  toArray() {
    let result = this._items;

    // Apply all filters
    for (const fn of this._filters) {
      result = result.filter(fn);
    }

    // Sort
    if (this._sortKey) {
      const key = this._sortKey;
      const dir = this._sortDir === "desc" ? -1 : 1;
      result = [...result].sort((a, b) => {
        const av = a[key] ?? "";
        const bv = b[key] ?? "";
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }

    // Offset + limit
    if (this._offsetVal > 0) result = result.slice(this._offsetVal);
    if (this._limitVal !== null) result = result.slice(0, this._limitVal);

    return result;
  }

  /**
   * Execute and return only the count.
   * @returns {number}
   */
  count() {
    return this.toArray().length;
  }

  /**
   * Execute and return the first result or undefined.
   * @returns {T | undefined}
   */
  first() {
    return this.toArray()[0];
  }
}

/**
 * Create a Query for an array of items.
 * @template {Record<string, unknown>} T
 * @param {T[]} items
 * @returns {Query<T>}
 */
export function query(items) {
  return new Query(items);
}
