/**
 * src/utils/vendor-inbox.js — S594 Vendor CRM inbox scaffold
 *
 * Pure helpers used by the upcoming Vendor CRM inbox view. A "thread"
 * is a vendor-scoped conversation (email/whatsapp/manual note) with
 * one or more entries. Helpers cover deterministic sorting, unread
 * counts, last-activity, and free-text filtering.
 *
 * @owner vendor-crm
 */

/**
 * @typedef {object} VendorMessage
 * @property {string} id
 * @property {string} vendorId
 * @property {string} channel    // "email" | "whatsapp" | "note"
 * @property {string} body
 * @property {string} ts          // ISO timestamp
 * @property {boolean=} read
 * @property {string=} from       // sender label / email
 */

/**
 * @typedef {object} VendorThread
 * @property {string} vendorId
 * @property {string} vendorName
 * @property {VendorMessage[]} messages
 */

/**
 * Group raw messages into per-vendor threads. The order of threads is
 * stable and sorted by last-activity descending; messages within a
 * thread are sorted by `ts` ascending.
 *
 * @param {readonly VendorMessage[]} messages
 * @param {Record<string, string>} [vendorNames]  // vendorId → display name
 * @returns {VendorThread[]}
 */
export function groupThreads(messages, vendorNames = {}) {
  if (!Array.isArray(messages)) return [];
  /** @type {Map<string, VendorMessage[]>} */
  const buckets = new Map();
  for (const m of messages) {
    if (!m?.vendorId) continue;
    const list = buckets.get(m.vendorId) ?? [];
    list.push(m);
    buckets.set(m.vendorId, list);
  }
  /** @type {VendorThread[]} */
  const threads = [];
  for (const [vendorId, list] of buckets) {
    list.sort((a, b) => Date.parse(a.ts ?? "") - Date.parse(b.ts ?? ""));
    threads.push({
      vendorId,
      vendorName: vendorNames[vendorId] ?? vendorId,
      messages: list,
    });
  }
  threads.sort((a, b) => lastActivity(b) - lastActivity(a));
  return threads;
}

/**
 * Last activity timestamp (ms) of a thread.
 * @param {VendorThread} thread
 * @returns {number}
 */
export function lastActivity(thread) {
  if (!thread?.messages?.length) return 0;
  const last = thread.messages[thread.messages.length - 1];
  const t = Date.parse(last?.ts ?? "");
  return Number.isFinite(t) ? t : 0;
}

/**
 * Count messages with `read !== true` in a thread.
 * @param {VendorThread} thread
 * @returns {number}
 */
export function unreadCount(thread) {
  if (!thread?.messages?.length) return 0;
  return thread.messages.reduce((n, m) => n + (m.read === true ? 0 : 1), 0);
}

/**
 * Free-text search across vendorName + message bodies.
 * Returns threads whose vendor name OR any message body contains the
 * (case-insensitive) query substring.
 *
 * @param {readonly VendorThread[]} threads
 * @param {string} query
 * @returns {VendorThread[]}
 */
export function searchThreads(threads, query) {
  const q = (query ?? "").trim().toLowerCase();
  if (!q) return [...(threads ?? [])];
  return (threads ?? []).filter((t) => {
    if (t.vendorName?.toLowerCase().includes(q)) return true;
    return t.messages.some((m) => (m.body ?? "").toLowerCase().includes(q));
  });
}
