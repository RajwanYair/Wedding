/**
 * src/repositories/table-repository.js — Store-backed TableRepository (Sprint 54)
 */

import { BaseRepository } from "./base-repository.js";

export class TableRepository extends BaseRepository {
  constructor(storeGet, storeSet, storeUpsert) {
    super("tables", storeGet, storeSet, storeUpsert);
  }

  /** @returns {import("../types.d.ts").Table[]} */
  findByShape(shape) {
    return this.findAll().filter((t) => t.shape === shape);
  }

  /** @returns {number} sum of all table capacities */
  totalCapacity() {
    return this.findAll().reduce((sum, t) => sum + (t.capacity ?? 0), 0);
  }

  /**
   * Find a table by name (case-insensitive).
   * @param {string} name
   * @returns {import("../types.d.ts").Table | undefined}
   */
  findByName(name) {
    const lower = name.toLowerCase();
    return this.findAll().find((t) => (t.name ?? "").toLowerCase() === lower);
  }
}
