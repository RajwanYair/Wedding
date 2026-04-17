/**
 * src/repositories/guest-repository.js — Store-backed GuestRepository (Sprint 53)
 *
 * Concrete implementation of BaseRepository for the `guests` store key.
 * Adds domain-specific query methods.
 *
 * Usage:
 *   import { GuestRepository } from "../repositories/guest-repository.js";
 *   import { storeGet, storeSet, storeUpsert } from "../core/store.js";
 *   const guests = new GuestRepository(storeGet, storeSet, storeUpsert);
 *   const confirmed = guests.findByStatus("confirmed");
 */

import { BaseRepository } from "./base-repository.js";

/**
 * @typedef {import("../types.d.ts").Guest} Guest
 */

export class GuestRepository extends BaseRepository {
  /**
   * @param {(key: string) => Guest[]} storeGet
   * @param {(key: string, items: Guest[]) => void} storeSet
   * @param {(key: string, item: Guest) => void} storeUpsert
   */
  constructor(storeGet, storeSet, storeUpsert) {
    super("guests", storeGet, storeSet, storeUpsert);
  }

  /**
   * Find guests by RSVP status.
   * @param {string} status
   * @returns {Guest[]}
   */
  findByStatus(status) {
    return this.findAll().filter((g) => g.status === status);
  }

  /**
   * Find guests by table ID.
   * @param {string} tableId
   * @returns {Guest[]}
   */
  findByTable(tableId) {
    return this.findAll().filter((g) => g.tableId === tableId);
  }

  /**
   * Find a guest by normalised phone number.
   * Strips spaces/dashes then compares.
   * @param {string} phone
   * @returns {Guest | undefined}
   */
  findByPhone(phone) {
    const normalised = phone.replace(/[\s\-().+]/g, "");
    return this.findAll().find((g) => {
      const gPhone = (g.phone ?? "").replace(/[\s\-().+]/g, "");
      return gPhone === normalised;
    });
  }

  /**
   * Find guests by wedding side ("groom" | "bride" | "mutual").
   * @param {string} side
   * @returns {Guest[]}
   */
  findBySide(side) {
    return this.findAll().filter((g) => g.side === side);
  }

  /**
   * Find guests by group ("family" | "friends" | "work" | "other").
   * @param {string} group
   * @returns {Guest[]}
   */
  findByGroup(group) {
    return this.findAll().filter((g) => g.group === group);
  }

  /**
   * Find all guests who have NOT been checked in yet.
   * @returns {Guest[]}
   */
  findUncheckedIn() {
    return this.findAll().filter((g) => !g.checkedIn);
  }

  /**
   * Find guests not yet assigned to a table.
   * @returns {Guest[]}
   */
  findUnassigned() {
    return this.findAll().filter((g) => !g.tableId);
  }

  /**
   * Get total confirmed attendee count (including children).
   * @returns {number}
   */
  confirmedCount() {
    return this.findByStatus("confirmed").reduce(
      (sum, g) => sum + (g.count ?? 1) + (g.children ?? 0),
      0,
    );
  }
}
