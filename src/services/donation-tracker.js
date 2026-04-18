/**
 * src/services/donation-tracker.js — Sprint 137
 *
 * Track monetary donation goals and individual donations toward those goals.
 */

import { storeGet, storeSet } from "../core/store.js";

const GOALS_KEY = "donationGoals";
const DONATIONS_KEY = "donations";

/**
 * @typedef {{
 *   id: string, name: string, target: number, notes: string,
 *   createdAt: string, updatedAt: string
 * }} DonationGoal
 *
 * @typedef {{
 *   id: string, goalId: string, amount: number,
 *   donorName: string, note: string, createdAt: string
 * }} Donation
 */

/**
 * Create a new donation goal.
 * @param {{ name: string, target: number, notes?: string }} params
 * @returns {string} New goal id
 */
export function createDonationGoal({ name, target, notes = "" }) {
  const id = `dg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  /** @type {DonationGoal} */
  const goal = { id, name, target, notes, createdAt: now, updatedAt: now };
  const goals = storeGet(GOALS_KEY) ?? [];
  storeSet(GOALS_KEY, [...goals, goal]);
  return id;
}

/**
 * Record a donation toward a goal.
 * @param {{ goalId: string, amount: number, donorName?: string, note?: string }} params
 * @returns {string} New donation id
 */
export function recordDonation({ goalId, amount, donorName = "Anonymous", note = "" }) {
  const id = `dn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  /** @type {Donation} */
  const donation = { id, goalId, amount, donorName, note, createdAt: now };
  const donations = storeGet(DONATIONS_KEY) ?? [];
  storeSet(DONATIONS_KEY, [...donations, donation]);
  return id;
}

/**
 * Get donation statistics for a goal.
 * @param {string} goalId
 * @returns {{ total: number, count: number, remaining: number, percentFunded: number, donors: string[] }}
 */
export function getDonationStats(goalId) {
  const goals = storeGet(GOALS_KEY) ?? [];
  const goal = goals.find((g) => g.id === goalId);
  if (!goal) return { total: 0, count: 0, remaining: 0, percentFunded: 0, donors: [] };

  const donations = (storeGet(DONATIONS_KEY) ?? []).filter((d) => d.goalId === goalId);
  const total = donations.reduce((s, d) => s + d.amount, 0);
  const remaining = Math.max(0, goal.target - total);
  const percentFunded = goal.target > 0 ? Math.round((total / goal.target) * 100) : 0;
  const donors = [...new Set(donations.map((d) => d.donorName))];
  return { total, count: donations.length, remaining, percentFunded, donors };
}

/**
 * List all donation goals.
 * @returns {DonationGoal[]}
 */
export function listDonationGoals() {
  return storeGet(GOALS_KEY) ?? [];
}

/**
 * Delete a donation goal and its donations.
 * @param {string} goalId
 */
export function deleteDonationGoal(goalId) {
  const goals = (storeGet(GOALS_KEY) ?? []).filter((g) => g.id !== goalId);
  const donations = (storeGet(DONATIONS_KEY) ?? []).filter((d) => d.goalId !== goalId);
  storeSet(GOALS_KEY, goals);
  storeSet(DONATIONS_KEY, donations);
}
