/**
 * src/repositories/base-repository.js — Abstract in-memory repository (Sprint 53)
 *
 * A lightweight repository interface backed by the Vuex-like store.
 * Concrete repositories extend BaseRepository and pass the store key + the
 * three store primitives on construction.
 *
 * Every item in the store MUST have a unique string `id` property.
 *
 * Usage:
 *   class GuestRepository extends BaseRepository {
 *     constructor() {
 *       super("guests", storeGet, storeSet, storeUpsert);
 *     }
 *   }
 *   const repo = new GuestRepository();
 *   const guest = repo.findById("abc123");
 */

/**
 * @template {object & { id: string }} T
 */
export class BaseRepository {
  /**
   * @param {string} storeKey
   * @param {(key: string) => T[]} storeGet
   * @param {(key: string, items: T[]) => void} storeSet
   * @param {(key: string, item: T) => void} storeUpsert
   */
  constructor(storeKey, storeGet, storeSet, storeUpsert) {
    this._key = storeKey;
    this._storeGet = storeGet;
    this._storeSet = storeSet;
    this._storeUpsert = storeUpsert;
  }

  /** @returns {T[]} */
  findAll() {
    return this._storeGet(this._key) ?? [];
  }

  /**
   * @param {string} id
   * @returns {T | undefined}
   */
  findById(id) {
    return this.findAll().find((item) => item.id === id);
  }

  /**
   * Create or update an item.
   * @param {T} item
   * @returns {T}
   */
  upsert(item) {
    this._storeUpsert(this._key, item);
    return item;
  }

  /**
   * Create an item (alias for upsert).
   * @param {T} item
   * @returns {T}
   */
  create(item) {
    return this.upsert(item);
  }

  /**
   * Update specific fields of an item by ID.
   * Merges the patch on top of the existing item.
   * @param {string} id
   * @param {Partial<T>} patch
   * @returns {T | undefined} Updated item, or undefined if not found.
   */
  update(id, patch) {
    const existing = this.findById(id);
    if (!existing) return undefined;
    const updated = /** @type {T} */ ({ ...existing, ...patch, id });
    this._storeUpsert(this._key, updated);
    return updated;
  }

  /**
   * Delete an item by ID.
   * @param {string} id
   * @returns {boolean} true if item was found and deleted.
   */
  delete(id) {
    const all = this.findAll();
    const next = all.filter((item) => item.id !== id);
    if (next.length === all.length) return false;
    this._storeSet(this._key, next);
    return true;
  }

  /** @returns {number} */
  count() {
    return this.findAll().length;
  }

  /** Clear all items. */
  clear() {
    this._storeSet(this._key, []);
  }

  /**
   * Check if an item exists by ID.
   * @param {string} id
   * @returns {boolean}
   */
  exists(id) {
    return this.findById(id) !== undefined;
  }
}
