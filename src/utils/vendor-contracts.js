/**
 * src/utils/vendor-contracts.js — S620 Vendor contracts data model & helpers
 *
 * Pure helpers for vendor contract management — status lifecycle, term
 * validation, renewal detection, and summary statistics. All inputs are
 * plain values; no I/O.
 *
 * @module vendor-contracts
 * @owner vendor-crm
 */

/**
 * @typedef {object} VendorContract
 * @property {string}  id
 * @property {string}  vendorId
 * @property {string}  title
 * @property {"draft"|"sent"|"signed"|"expired"|"cancelled"} status
 * @property {number}  amount         // total contract value
 * @property {string=} currency       // ISO 4217, default "ILS"
 * @property {string=} signedDate     // ISO date
 * @property {string=} expiryDate     // ISO date
 * @property {string=} terms          // free-text terms/notes
 * @property {string=} createdAt      // ISO timestamp
 */

/** Valid contract statuses in lifecycle order. */
export const CONTRACT_STATUSES = /** @type {const} */ ([
  "draft",
  "sent",
  "signed",
  "expired",
  "cancelled",
]);

/** Allowed transitions from each status. */
const TRANSITIONS = /** @type {Record<string, readonly string[]>} */ ({
  draft: ["sent", "cancelled"],
  sent: ["signed", "cancelled"],
  signed: ["expired"],
  expired: [],
  cancelled: [],
});

/**
 * Check whether a status transition is valid.
 *
 * @param {string} from
 * @param {string} to
 * @returns {boolean}
 */
export function canTransition(from, to) {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Validate a contract object — returns an array of error strings (empty = valid).
 *
 * @param {VendorContract} c
 * @returns {string[]}
 */
export function validateContract(c) {
  const errors = [];
  if (!c || typeof c !== "object") return ["contract is required"];
  if (typeof c.id !== "string" || c.id.trim() === "") errors.push("id is required");
  if (typeof c.vendorId !== "string" || c.vendorId.trim() === "") errors.push("vendorId is required");
  if (typeof c.title !== "string" || c.title.trim() === "") errors.push("title is required");
  if (!CONTRACT_STATUSES.includes(/** @type {any} */ (c.status))) {
    errors.push(`invalid status: ${String(c.status)}`);
  }
  if (typeof c.amount !== "number" || !Number.isFinite(c.amount) || c.amount < 0) {
    errors.push("amount must be a non-negative finite number");
  }
  if (c.signedDate && c.expiryDate && c.signedDate > c.expiryDate) {
    errors.push("signedDate must be before expiryDate");
  }
  return errors;
}

/**
 * Determine whether a signed contract has expired relative to a reference date.
 *
 * @param {VendorContract} c
 * @param {string} [refDate] — ISO date, defaults to today
 * @returns {boolean}
 */
export function isExpired(c, refDate) {
  if (!c?.expiryDate || c.status !== "signed") return false;
  const ref = refDate ?? new Date().toISOString().slice(0, 10);
  return c.expiryDate < ref;
}

/**
 * Return contracts expiring within `days` of `refDate`.
 *
 * @param {readonly VendorContract[]} contracts
 * @param {number} days
 * @param {string} [refDate]
 * @returns {VendorContract[]}
 */
export function expiringWithin(contracts, days, refDate) {
  if (!Array.isArray(contracts) || !Number.isFinite(days) || days < 0) return [];
  const ref = refDate ?? new Date().toISOString().slice(0, 10);
  const refMs = new Date(ref).getTime();
  const limitMs = refMs + days * 86_400_000;
  return contracts.filter((c) => {
    if (c.status !== "signed" || !c.expiryDate) return false;
    const expMs = new Date(c.expiryDate).getTime();
    return expMs >= refMs && expMs <= limitMs;
  });
}

/**
 * Summarise a list of contracts by status + total value.
 *
 * @param {readonly VendorContract[]} contracts
 * @returns {{ total: number, byStatus: Record<string, number>, totalValue: number, signedValue: number }}
 */
export function contractSummary(contracts) {
  const byStatus = /** @type {Record<string, number>} */ ({});
  let totalValue = 0;
  let signedValue = 0;
  for (const s of CONTRACT_STATUSES) byStatus[s] = 0;
  if (!Array.isArray(contracts)) return { total: 0, byStatus, totalValue: 0, signedValue: 0 };
  for (const c of contracts) {
    const st = CONTRACT_STATUSES.includes(/** @type {any} */ (c?.status)) ? c.status : "draft";
    byStatus[st] = (byStatus[st] ?? 0) + 1;
    const amt = typeof c?.amount === "number" && Number.isFinite(c.amount) ? c.amount : 0;
    totalValue += amt;
    if (st === "signed") signedValue += amt;
  }
  return { total: contracts.length, byStatus, totalValue, signedValue };
}
