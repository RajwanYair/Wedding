/**
 * Gift registry helpers — track gift items, mark received, totals.
 *
 * Pure functions over an array of gift items. No side effects, no DOM.
 *
 * @typedef {object} GiftItem
 * @property {string} id        Stable identifier.
 * @property {string} name      Item description.
 * @property {number} [price]   Estimated price (currency-agnostic).
 * @property {string} [url]     Optional link to product.
 * @property {boolean} [received] True once gift received.
 * @property {string} [giverId] Guest id who gave the gift.
 * @property {string} [receivedAt] ISO timestamp of receipt.
 */

/**
 * Mark a gift as received.
 *
 * @param {ReadonlyArray<GiftItem>} items
 * @param {string} id
 * @param {string} giverId
 * @param {string} [now] ISO timestamp; defaults to `new Date().toISOString()`.
 * @returns {GiftItem[]}
 */
export function markReceived(items, id, giverId, now) {
  const ts = now ?? new Date().toISOString();
  return items.map((g) =>
    g.id === id ? { ...g, received: true, giverId, receivedAt: ts } : g,
  );
}

/**
 * Mark a gift as not yet received (undo).
 *
 * @param {ReadonlyArray<GiftItem>} items
 * @param {string} id
 * @returns {GiftItem[]}
 */
export function markPending(items, id) {
  return items.map((g) => {
    if (g.id !== id) return g;
    const { received: _r, giverId: _gi, receivedAt: _ra, ...rest } = g;
    return rest;
  });
}

/**
 * Summarise totals across the registry.
 *
 * @param {ReadonlyArray<GiftItem>} items
 * @returns {{ total: number, received: number, pending: number,
 *   estimatedValue: number, receivedValue: number, pendingValue: number }}
 */
export function summarise(items) {
  let total = 0;
  let received = 0;
  let estimatedValue = 0;
  let receivedValue = 0;
  for (const g of items) {
    total += 1;
    const price = Number.isFinite(g.price) ? Number(g.price) : 0;
    estimatedValue += price;
    if (g.received) {
      received += 1;
      receivedValue += price;
    }
  }
  return {
    total,
    received,
    pending: total - received,
    estimatedValue,
    receivedValue,
    pendingValue: estimatedValue - receivedValue,
  };
}

/**
 * Filter the registry by received state.
 *
 * @param {ReadonlyArray<GiftItem>} items
 * @param {"received" | "pending" | "all"} [state="all"]
 * @returns {GiftItem[]}
 */
export function filterByState(items, state = "all") {
  if (state === "received") return items.filter((g) => g.received === true);
  if (state === "pending") return items.filter((g) => !g.received);
  return [...items];
}
