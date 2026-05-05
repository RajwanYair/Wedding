/**
 * src/utils/contract-esign.js — S639 Contract e-sign lifecycle
 *
 * Pure helpers for electronic signature on vendor contracts:
 * signing intent creation, hash-based verification, signer
 * management, and audit trail entries.
 *
 * @module contract-esign
 * @owner vendor-crm
 */

import { fnv1a32 } from "./fnv1a.js";

/**
 * @typedef {object} SigningIntent
 * @property {string}  id
 * @property {string}  contractId
 * @property {string}  signerEmail
 * @property {string}  signerName
 * @property {"pending"|"viewed"|"signed"|"declined"|"expired"} status
 * @property {string}  createdAt
 * @property {string=} signedAt
 * @property {string=} declinedAt
 * @property {string=} signatureHash
 * @property {string=} declineReason
 */

/**
 * @typedef {object} AuditEntry
 * @property {string}  intentId
 * @property {string}  action
 * @property {string}  timestamp
 * @property {string=} ip
 * @property {string=} userAgent
 */

let _nextId = 1;

/**
 * Create a signing intent for a contract signer.
 *
 * @param {string} contractId
 * @param {string} signerEmail
 * @param {string} signerName
 * @returns {SigningIntent}
 */
export function createSigningIntent(contractId, signerEmail, signerName) {
  return {
    id: `esign_${_nextId++}`,
    contractId,
    signerEmail: (signerEmail ?? "").trim().toLowerCase(),
    signerName: signerName || "Unknown",
    status: /** @type {const} */ ("pending"),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Reset the ID counter (for testing).
 *
 * @param {number} [start=1]
 */
export function resetIdCounter(start = 1) {
  _nextId = start;
}

/**
 * Mark an intent as viewed.
 *
 * @param {SigningIntent} intent
 * @returns {SigningIntent}
 */
export function markViewed(intent) {
  if (intent.status !== "pending") return intent;
  return { ...intent, status: /** @type {const} */ ("viewed") };
}

/**
 * Sign a contract — generates a hash from contract content + signer email + timestamp.
 *
 * @param {SigningIntent} intent
 * @param {string} contractContent   // full contract text for hashing
 * @returns {SigningIntent}
 */
export function signContract(intent, contractContent) {
  if (intent.status !== "pending" && intent.status !== "viewed") return intent;
  const now = new Date().toISOString();
  const hashInput = `${contractContent}|${intent.signerEmail}|${now}`;
  const hash = fnv1a32(hashInput).toString(16);
  return {
    ...intent,
    status: /** @type {const} */ ("signed"),
    signedAt: now,
    signatureHash: hash,
  };
}

/**
 * Decline a contract.
 *
 * @param {SigningIntent} intent
 * @param {string} [reason]
 * @returns {SigningIntent}
 */
export function declineContract(intent, reason) {
  if (intent.status === "signed" || intent.status === "expired") return intent;
  return {
    ...intent,
    status: /** @type {const} */ ("declined"),
    declinedAt: new Date().toISOString(),
    declineReason: reason || undefined,
  };
}

/**
 * Expire a signing intent (e.g., past deadline).
 *
 * @param {SigningIntent} intent
 * @returns {SigningIntent}
 */
export function expireIntent(intent) {
  if (intent.status === "signed") return intent;
  return { ...intent, status: /** @type {const} */ ("expired") };
}

/**
 * Verify a signature hash against contract content.
 *
 * @param {string} contractContent
 * @param {string} signerEmail
 * @param {string} signedAt
 * @param {string} expectedHash
 * @returns {boolean}
 */
export function verifySignature(contractContent, signerEmail, signedAt, expectedHash) {
  const hashInput = `${contractContent}|${signerEmail}|${signedAt}`;
  const computed = fnv1a32(hashInput).toString(16);
  return computed === expectedHash;
}

/**
 * Create an audit trail entry.
 *
 * @param {string} intentId
 * @param {string} action   // e.g., "created", "viewed", "signed", "declined", "expired"
 * @param {string} [ip]
 * @param {string} [userAgent]
 * @returns {AuditEntry}
 */
export function createAuditEntry(intentId, action, ip, userAgent) {
  return {
    intentId,
    action,
    timestamp: new Date().toISOString(),
    ...(ip ? { ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}

/**
 * Get signing progress for a set of intents.
 *
 * @param {SigningIntent[]} intents
 * @returns {{ total: number, signed: number, pending: number, declined: number, expired: number, rate: number }}
 */
export function signingProgress(intents) {
  const result = { total: 0, signed: 0, pending: 0, declined: 0, expired: 0, rate: 0 };
  if (!Array.isArray(intents)) return result;
  for (const i of intents) {
    result.total++;
    if (i.status === "signed") result.signed++;
    else if (i.status === "declined") result.declined++;
    else if (i.status === "expired") result.expired++;
    else result.pending++;
  }
  result.rate = result.total > 0 ? Math.round((result.signed / result.total) * 100) : 0;
  return result;
}
