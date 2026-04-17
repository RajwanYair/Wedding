/**
 * src/repositories/vendor-repository.js — Store-backed VendorRepository (Sprint 54)
 */

import { BaseRepository } from "./base-repository.js";

export class VendorRepository extends BaseRepository {
  constructor(storeGet, storeSet, storeUpsert) {
    super("vendors", storeGet, storeSet, storeUpsert);
  }

  /** @returns {import("../types.d.ts").Vendor[]} */
  findByCategory(category) {
    return this.findAll().filter((v) => v.category === category);
  }

  /** @returns {import("../types.d.ts").Vendor[]} */
  findUnpaid() {
    return this.findAll().filter((v) => {
      const price = v.price ?? 0;
      const paid = v.paid ?? 0;
      return price > paid;
    });
  }

  /** @returns {number} sum of all vendor prices */
  totalCost() {
    return this.findAll().reduce((sum, v) => sum + (v.price ?? 0), 0);
  }

  /** @returns {number} sum of all amounts paid to vendors */
  totalPaid() {
    return this.findAll().reduce((sum, v) => sum + (v.paid ?? 0), 0);
  }

  /** @returns {number} outstanding balance */
  outstanding() {
    return this.totalCost() - this.totalPaid();
  }
}
