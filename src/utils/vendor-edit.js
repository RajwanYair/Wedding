/**
 * src/utils/vendor-edit.js — S628 Vendor contract edit form helpers
 *
 * Pure helpers for editing vendor contracts through a form UI.
 * Handles field defaults, change-set diffing, and auto-transition
 * on signature or expiry fields. Works with vendor-contracts.js
 * lifecycle model.
 *
 * @module vendor-edit
 * @owner vendor-crm
 */

import { canTransition, validateContract, CONTRACT_STATUSES } from "./vendor-contracts.js";

/**
 * @typedef {import('./vendor-contracts.js').VendorContract} VendorContract
 */

/**
 * Create a blank draft contract with sensible defaults.
 *
 * @param {string} vendorId
 * @param {Partial<VendorContract>} [overrides]
 * @returns {VendorContract}
 */
export function createDraft(vendorId, overrides) {
  return {
    id: `ctr_${Date.now().toString(36)}`,
    vendorId,
    title: "",
    status: "draft",
    amount: 0,
    currency: "ILS",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Compute a change-set (diff) between old and new contract values.
 * Returns an array of `{ field, from, to }` entries for changed fields.
 *
 * @param {VendorContract} prev
 * @param {VendorContract} next
 * @returns {{ field: string, from: unknown, to: unknown }[]}
 */
export function diffContract(prev, next) {
  if (!prev || !next) return [];
  const fields = ["title", "status", "amount", "currency", "signedDate", "expiryDate", "terms"];
  /** @type {{ field: string, from: unknown, to: unknown }[]} */
  const changes = [];
  for (const f of fields) {
    const a = /** @type {any} */ (prev)[f];
    const b = /** @type {any} */ (next)[f];
    if (a !== b) changes.push({ field: f, from: a, to: b });
  }
  return changes;
}

/**
 * Apply a partial update to a contract, auto-transitioning status when
 * a signedDate is added to a "sent" contract.
 *
 * @param {VendorContract} contract
 * @param {Partial<VendorContract>} updates
 * @returns {{ ok: boolean, contract?: VendorContract, errors?: string[] }}
 */
export function applyUpdate(contract, updates) {
  if (!contract) return { ok: false, errors: ["contract is required"] };

  // Auto-determine if status should be auto-transitioned
  const autoStatus =
    !contract.signedDate &&
    updates.signedDate &&
    contract.status === "sent" &&
    !updates.status
      ? "signed"
      : undefined;

  const merged = { ...contract, ...updates, ...(autoStatus ? { status: autoStatus } : {}) };

  // Status change validation
  if (updates.status && updates.status !== contract.status) {
    if (!canTransition(contract.status, updates.status)) {
      return {
        ok: false,
        errors: [`cannot transition from "${contract.status}" to "${updates.status}"`],
      };
    }
  }

  const errors = validateContract(merged);
  if (errors.length > 0) return { ok: false, errors };

  return { ok: true, contract: merged };
}

/**
 * Generate a human-readable label for a contract status.
 *
 * @param {string} status
 * @returns {string}
 */
export function statusLabel(status) {
  const labels = {
    draft: "Draft",
    sent: "Sent for Review",
    signed: "Signed",
    expired: "Expired",
    cancelled: "Cancelled",
  };
  return labels[status] ?? "Unknown";
}

/**
 * Return the set of valid next statuses from the current status.
 *
 * @param {string} current
 * @returns {string[]}
 */
export function nextStatuses(current) {
  return CONTRACT_STATUSES.filter((s) => canTransition(current, s));
}

/**
 * Validate that required form fields are filled for a given status.
 * "sent" requires title+amount; "signed" additionally requires signedDate.
 *
 * @param {VendorContract} contract
 * @returns {string[]} — missing field names (empty = valid)
 */
export function requiredFieldsForStatus(contract) {
  if (!contract) return ["contract"];
  const missing = [];
  if (!contract.title?.trim()) missing.push("title");
  if (typeof contract.amount !== "number" || contract.amount <= 0) missing.push("amount");
  if (contract.status === "signed" && !contract.signedDate) missing.push("signedDate");
  if (contract.status === "signed" && !contract.expiryDate) missing.push("expiryDate");
  return missing;
}
