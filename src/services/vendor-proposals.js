/**
 * src/services/vendor-proposals.js — Sprint 121
 *
 * Manage vendor proposals: draft, send, accept, decline, expire.
 * All state lives in the store under key `vendorProposals`.
 */

import { storeGet, storeSet } from "../core/store.js";
import { enqueueWrite } from "./sheets.js";

const _KEY = "vendorProposals";

/**
 * @typedef {{ id: string, vendorId: string, title: string, amount: number,
 *   notes: string, status: "draft"|"sent"|"accepted"|"declined"|"expired",
 *   sentAt: string|null, respondedAt: string|null, createdAt: string, updatedAt: string }} Proposal
 */

function _all() { return /** @type {Proposal[]} */ (storeGet(_KEY) ?? []); }
function _save(list) {
  storeSet(_KEY, list);
  enqueueWrite(_KEY, () => Promise.resolve());
}
function _now() { return new Date().toISOString(); }

/**
 * Create a new draft proposal.
 * @param {{ vendorId: string, title: string, amount: number, notes?: string }} opts
 * @returns {string} New proposal id
 */
export function createProposal({ vendorId, title, amount, notes = "" }) {
  if (!vendorId || !title) throw new Error("vendorId and title are required");
  if (amount < 0) throw new Error("amount must be non-negative");
  const now = _now();
  /** @type {Proposal} */
  const p = {
    id: `prop_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    vendorId, title, amount, notes,
    status: "draft",
    sentAt: null, respondedAt: null,
    createdAt: now, updatedAt: now,
  };
  _save([..._all(), p]);
  return p.id;
}

/**
 * Get a proposal by id.
 * @param {string} id
 * @returns {Proposal | null}
 */
export function getProposal(id) {
  return _all().find((p) => p.id === id) ?? null;
}

/**
 * List proposals, optionally filtered by vendorId or status.
 * @param {{ vendorId?: string, status?: Proposal["status"] }} [filter]
 * @returns {Proposal[]}
 */
export function listProposals({ vendorId, status } = {}) {
  return _all().filter((p) => {
    if (vendorId && p.vendorId !== vendorId) return false;
    if (status   && p.status   !== status)   return false;
    return true;
  });
}

/**
 * Update a draft proposal.
 * @param {string} id
 * @param {Partial<Pick<Proposal,"title"|"amount"|"notes">>} patch
 * @returns {boolean}
 */
export function updateProposal(id, patch) {
  const list = _all();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  if (list[idx].status !== "draft") throw new Error("Only draft proposals can be updated");
  list[idx] = { ...list[idx], ...patch, updatedAt: _now() };
  _save(list);
  return true;
}

/**
 * Send a draft proposal (transitions draft → sent).
 * @param {string} id
 * @returns {boolean}
 */
export function sendProposal(id) {
  const list = _all();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  if (list[idx].status !== "draft") throw new Error("Only draft proposals can be sent");
  list[idx] = { ...list[idx], status: "sent", sentAt: _now(), updatedAt: _now() };
  _save(list);
  return true;
}

/**
 * Accept a sent proposal.
 * @param {string} id
 * @returns {boolean}
 */
export function acceptProposal(id) {
  const list = _all();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  if (list[idx].status !== "sent") throw new Error("Only sent proposals can be accepted");
  list[idx] = { ...list[idx], status: "accepted", respondedAt: _now(), updatedAt: _now() };
  _save(list);
  return true;
}

/**
 * Decline a sent proposal.
 * @param {string} id
 * @returns {boolean}
 */
export function declineProposal(id) {
  const list = _all();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  if (list[idx].status !== "sent") throw new Error("Only sent proposals can be declined");
  list[idx] = { ...list[idx], status: "declined", respondedAt: _now(), updatedAt: _now() };
  _save(list);
  return true;
}

/**
 * Expire a sent proposal.
 * @param {string} id
 * @returns {boolean}
 */
export function expireProposal(id) {
  const list = _all();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  if (list[idx].status !== "sent") throw new Error("Only sent proposals can be expired");
  list[idx] = { ...list[idx], status: "expired", updatedAt: _now() };
  _save(list);
  return true;
}

/**
 * Delete a proposal (any status).
 * @param {string} id
 * @returns {boolean}
 */
export function deleteProposal(id) {
  const list = _all();
  const next = list.filter((p) => p.id !== id);
  if (next.length === list.length) return false;
  _save(next);
  return true;
}

/**
 * Get status counts across all proposals.
 * @returns {{ total: number, draft: number, sent: number, accepted: number, declined: number, expired: number }}
 */
export function getProposalStats() {
  const all = _all();
  return {
    total:    all.length,
    draft:    all.filter((p) => p.status === "draft").length,
    sent:     all.filter((p) => p.status === "sent").length,
    accepted: all.filter((p) => p.status === "accepted").length,
    declined: all.filter((p) => p.status === "declined").length,
    expired:  all.filter((p) => p.status === "expired").length,
  };
}
