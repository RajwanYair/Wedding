/**
 * src/utils/registry-thankyou.js — S635 Registry thank-you automation
 *
 * Connects gift-registry (received tracking) with gift-thanks (thanks log)
 * to automate thank-you message generation, batch processing, and follow-up
 * reminders.
 *
 * @module registry-thankyou
 * @owner sections
 */

import { filterByState, summarise } from "./gift-registry.js";
import { outstanding, channelCounts } from "./gift-thanks.js";

/**
 * Generate pending thank-you items with gift details for a batch send.
 *
 * @param {import('./gift-registry.js').GiftItem[]} gifts
 * @param {import('./gift-thanks.js').ThanksEntry[]} log
 * @returns {{ giftId: string, giftName: string, giverId: string | undefined, price: number | undefined }[]}
 */
export function pendingThankYous(gifts, log) {
  const ids = outstanding(gifts, log ?? []);
  const received = filterByState(gifts, "received");
  // @ts-ignore
  return ids
    .map((id) => {
      const g = received.find((r) => r.id === id);
      return g ? { giftId: g.id, giftName: g.name, giverId: g.giverId, price: g.price } : null;
    })
    .filter(Boolean);
}

/**
 * Build a thank-you message for a gift.
 *
 * @param {string} giftName
 * @param {string} [giverName]
 * @param {"he"|"en"} [lang="he"]
 * @returns {string}
 */
export function buildMessage(giftName, giverName, lang = "he") {
  const name = giverName || (lang === "he" ? "אורח/ת יקר/ה" : "Dear Guest");
  if (lang === "he") {
    return `${name} שלום,\nתודה רבה על המתנה המקסימה — ${giftName}!\nאנחנו מעריכים מאוד את הנדיבות שלך. 💕`;
  }
  return `Hi ${name},\nThank you so much for the wonderful gift — ${giftName}!\nWe truly appreciate your generosity. 💕`;
}

/**
 * Generate a batch of thank-you messages ready for sending.
 *
 * @param {import('./gift-registry.js').GiftItem[]} gifts
 * @param {import('./gift-thanks.js').ThanksEntry[]} log
 * @param {Record<string, string>} [giverNames]  // userId → display name
 * @param {"he"|"en"} [lang="he"]
 * @returns {{ giftId: string, giverId: string | undefined, message: string }[]}
 */
export function batchMessages(gifts, log, giverNames, lang = "he") {
  const pending = pendingThankYous(gifts, log);
  const names = giverNames ?? {};
  return pending.map((p) => ({
    giftId: p.giftId,
    giverId: p.giverId,
    message: buildMessage(p.giftName, p.giverId ? names[p.giverId] : undefined, lang),
  }));
}

/**
 * Compute a summary of the thank-you progress.
 *
 * @param {import('./gift-registry.js').GiftItem[]} gifts
 * @param {import('./gift-thanks.js').ThanksEntry[]} log
 * @returns {{ received: number, thanked: number, pending: number, rate: number, channels: Record<string, number> }}
 */
export function thankYouProgress(gifts, log) {
  const giftSummary = summarise(gifts);
  const pendingIds = outstanding(gifts, log ?? []);
  const thanked = giftSummary.received - pendingIds.length;
  const channels = channelCounts(log ?? []);
  return {
    received: giftSummary.received,
    thanked,
    pending: pendingIds.length,
    rate: giftSummary.received > 0 ? Math.round((thanked / giftSummary.received) * 100) : 0,
    channels,
  };
}

/**
 * Find gifts that were received more than `days` days ago but haven't been thanked.
 *
 * @param {import('./gift-registry.js').GiftItem[]} gifts
 * @param {import('./gift-thanks.js').ThanksEntry[]} log
 * @param {number} [days=7]
 * @param {Date} [now]
 * @returns {{ giftId: string, giftName: string, daysSinceReceived: number }[]}
 */
export function overdueThankYous(gifts, log, days = 7, now) {
  const ref = now ?? new Date();
  const pendingIds = new Set(outstanding(gifts, log ?? []));
  const received = filterByState(gifts, "received");
  // @ts-ignore
  return received
    .filter((g) => pendingIds.has(g.id) && g.receivedAt)
    .map((g) => {
      // @ts-ignore
      const diff = Math.floor((ref.getTime() - new Date(g.receivedAt).getTime()) / 86_400_000);
      return diff >= days ? { giftId: g.id, giftName: g.name, daysSinceReceived: diff } : null;
    })
    .filter(Boolean);
}
