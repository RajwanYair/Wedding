/**
 * src/utils/stripe-connect.js — S638 Stripe Connect vendor onboarding
 *
 * Pure helpers for Stripe Connect vendor account lifecycle:
 * onboarding URL construction, payout status mapping,
 * milestone-linked disbursement payloads, and webhook
 * event classification.
 *
 * @module stripe-connect
 * @owner vendor-crm
 */

/**
 * @typedef {object} ConnectAccount
 * @property {string}  vendorId
 * @property {string}  stripeAccountId     // acct_xxx
 * @property {"pending"|"active"|"restricted"|"disabled"} status
 * @property {string}  email
 * @property {string=} businessName
 * @property {string}  createdAt           // ISO timestamp
 * @property {boolean} payoutsEnabled
 * @property {boolean} chargesEnabled
 */

/**
 * @typedef {object} DisbursementPayload
 * @property {string}  stripeAccountId
 * @property {number}  amount              // cents
 * @property {string}  currency            // ISO 4217
 * @property {string}  transferGroup        // milestone group key
 * @property {string}  description
 */

const VALID_STATUSES = /** @type {const} */ (["pending", "active", "restricted", "disabled"]);

/**
 * Create a new connect account record for a vendor.
 *
 * @param {string} vendorId
 * @param {string} stripeAccountId
 * @param {string} email
 * @param {string} [businessName]
 * @returns {ConnectAccount}
 */
export function createConnectAccount(vendorId, stripeAccountId, email, businessName) {
  return {
    vendorId,
    stripeAccountId,
    email: (email ?? "").trim().toLowerCase(),
    businessName: businessName || undefined,
    status: /** @type {const} */ ("pending"),
    createdAt: new Date().toISOString(),
    payoutsEnabled: false,
    chargesEnabled: false,
  };
}

/**
 * Build the Stripe Connect onboarding URL.
 *
 * @param {string} stripeAccountId
 * @param {string} returnUrl     // after onboarding success
 * @param {string} refreshUrl    // if onboarding link expires
 * @returns {string}
 */
export function buildOnboardingUrl(stripeAccountId, returnUrl, refreshUrl) {
  const params = new URLSearchParams({
    account: stripeAccountId,
    return_url: returnUrl,
    refresh_url: refreshUrl,
    type: "account_onboarding",
  });
  return `https://connect.stripe.com/setup/s/${stripeAccountId}?${params.toString()}`;
}

/**
 * Map a Stripe webhook event type to an internal account status update.
 *
 * @param {string} eventType   // e.g. "account.updated"
 * @param {{ payouts_enabled?: boolean, charges_enabled?: boolean, disabled_reason?: string }} [data]
 * @returns {{ status: ConnectAccount["status"], payoutsEnabled: boolean, chargesEnabled: boolean } | null}
 */
export function mapWebhookToStatus(eventType, data) {
  if (eventType !== "account.updated") return null;
  if (!data) return null;
  const payoutsEnabled = data.payouts_enabled ?? false;
  const chargesEnabled = data.charges_enabled ?? false;
  let status = /** @type {ConnectAccount["status"]} */ ("pending");
  if (data.disabled_reason) {
    status = "disabled";
  } else if (payoutsEnabled && chargesEnabled) {
    status = "active";
  } else if (payoutsEnabled || chargesEnabled) {
    status = "restricted";
  }
  return { status, payoutsEnabled, chargesEnabled };
}

/**
 * Build a disbursement payload for a milestone payment.
 *
 * @param {string} stripeAccountId
 * @param {number} amountCents
 * @param {string} milestoneName
 * @param {string} [currency="ILS"]
 * @returns {DisbursementPayload}
 */
export function buildDisbursement(stripeAccountId, amountCents, milestoneName, currency = "ILS") {
  return {
    stripeAccountId,
    amount: Math.round(amountCents),
    currency: currency.toUpperCase(),
    transferGroup: `milestone_${milestoneName.toLowerCase().replace(/\s+/g, "_")}`,
    description: `Payment for milestone: ${milestoneName}`,
  };
}

/**
 * Check whether an account is ready to receive payouts.
 *
 * @param {ConnectAccount} account
 * @returns {boolean}
 */
export function isPayoutReady(account) {
  return account?.status === "active" && account.payoutsEnabled === true;
}

/**
 * Compute payout summary for a list of accounts.
 *
 * @param {ConnectAccount[]} accounts
 * @returns {{ total: number, active: number, pending: number, restricted: number, disabled: number, payoutReady: number }}
 */
export function payoutSummary(accounts) {
  const summary = { total: 0, active: 0, pending: 0, restricted: 0, disabled: 0, payoutReady: 0 };
  if (!Array.isArray(accounts)) return summary;
  for (const a of accounts) {
    summary.total++;
    if (VALID_STATUSES.includes(/** @type {any} */ (a.status))) {
      summary[a.status]++;
    }
    if (isPayoutReady(a)) summary.payoutReady++;
  }
  return summary;
}

/**
 * Classify a Stripe webhook event type into a processing category.
 *
 * @param {string} eventType
 * @returns {"account"|"payout"|"transfer"|"charge"|"unknown"}
 */
export function classifyWebhookEvent(eventType) {
  if (typeof eventType !== "string") return "unknown";
  if (eventType.startsWith("account.")) return "account";
  if (eventType.startsWith("payout.")) return "payout";
  if (eventType.startsWith("transfer.")) return "transfer";
  if (eventType.startsWith("charge.") || eventType.startsWith("payment_intent.")) return "charge";
  return "unknown";
}
