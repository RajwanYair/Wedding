/**
 * Thank-you note tracker — record and query thank-you status per gift.
 *
 * Pure functions over a thank-you log, persisted by callers under
 * `wedding_v1_thanks_log` (or anywhere — this module is storage-agnostic).
 *
 * @typedef {object} ThanksEntry
 * @property {string} giftId         Stable gift identifier.
 * @property {string} giverId        Guest id who gave the gift.
 * @property {string} sentAt         ISO timestamp the thank-you went out.
 * @property {"whatsapp" | "email" | "card" | "other"} [channel]
 * @property {string} [notes]
 * @owner shared
 */

/**
 * Record a thank-you note as sent.
 *
 * @param {ReadonlyArray<ThanksEntry>} log
 * @param {{ giftId: string, giverId: string, channel?: ThanksEntry["channel"], notes?: string, sentAt?: string }} entry
 * @returns {ThanksEntry[]}
 */
export function recordThanks(log, entry) {
  if (!entry || typeof entry.giftId !== "string" || typeof entry.giverId !== "string") {
    throw new TypeError("recordThanks requires giftId and giverId");
  }
  const sentAt = entry.sentAt ?? new Date().toISOString();
  /** @type {ThanksEntry} */
  const filled = {
    giftId: entry.giftId,
    giverId: entry.giverId,
    sentAt,
    channel: entry.channel ?? "whatsapp",
  };
  if (entry.notes) filled.notes = entry.notes;
  // Replace any existing entry for the same gift.
  return [...log.filter((e) => e.giftId !== entry.giftId), filled];
}

/**
 * Remove a thank-you record (e.g. mistakenly logged).
 *
 * @param {ReadonlyArray<ThanksEntry>} log
 * @param {string} giftId
 * @returns {ThanksEntry[]}
 */
export function unrecordThanks(log, giftId) {
  return log.filter((e) => e.giftId !== giftId);
}

/**
 * True iff a thank-you has been sent for the given gift.
 *
 * @param {ReadonlyArray<ThanksEntry>} log
 * @param {string} giftId
 * @returns {boolean}
 */
export function hasThanked(log, giftId) {
  return log.some((e) => e.giftId === giftId);
}

/**
 * Compute outstanding gifts that have no thank-you yet.
 *
 * @param {ReadonlyArray<{ id: string, received?: boolean }>} gifts
 * @param {ReadonlyArray<ThanksEntry>} log
 * @returns {string[]} gift ids needing a thank-you
 */
export function outstanding(gifts, log) {
  const sent = new Set(log.map((e) => e.giftId));
  return gifts
    .filter((g) => g && g.received === true && typeof g.id === "string" && !sent.has(g.id))
    .map((g) => g.id);
}

/**
 * Per-channel breakdown of sent thank-yous.
 *
 * @param {ReadonlyArray<ThanksEntry>} log
 * @returns {Record<string, number>}
 */
export function channelCounts(log) {
  /** @type {Record<string, number>} */
  const out = Object.create(null);
  for (const e of log) {
    const c = e.channel ?? "whatsapp";
    out[c] = (out[c] ?? 0) + 1;
  }
  return out;
}
