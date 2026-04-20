/**
 * @module invitation-scheduler
 * @description Invitation batch scheduling utilities.
 * Builds, prioritises and splits batches of guest invitations across
 * delivery channels (WhatsApp, SMS, email) with rate-limit compliance.
 * All functions are pure (no DOM, no network).
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Supported delivery channels. */
export const CHANNELS = /** @type {const} */ (['whatsapp', 'sms', 'email']);

/**
 * Default rate limits — max messages per window (messages/minute).
 * Conservative figures compatible with WhatsApp Business API tier-1.
 */
export const DEFAULT_RATE_LIMITS = {
  whatsapp: 80,   // messages per minute
  sms: 60,
  email: 200,
};

/** Default chunk size when no rate-limit is specified. */
const DEFAULT_CHUNK_SIZE = 50;

// ─── Types (JSDoc only) ───────────────────────────────────────────────────────

/**
 * @typedef {object} GuestRecord
 * @property {string} id
 * @property {string} [name]
 * @property {string} [phone]
 * @property {string} [email]
 * @property {string} [status]   - 'pending' | 'confirmed' | 'declined'
 * @property {boolean} [plusOne]
 * @property {number} [priority] - higher = more urgent (default 0)
 */

/**
 * @typedef {object} InvitationItem
 * @property {string} guestId
 * @property {string} [name]
 * @property {string} channel   - 'whatsapp' | 'sms' | 'email'
 * @property {string} address   - phone number or email address
 * @property {number} priority  - computed sort key (higher = send first)
 * @property {object} [meta]    - extra fields forwarded from the guest record
 */

/**
 * @typedef {object} BatchOptions
 * @property {string[]} [channels]          - Channels to use; defaults to all available
 * @property {boolean} [excludeDeclined]    - Skip guests with status 'declined' (default true)
 * @property {boolean} [excludeConfirmed]   - Skip guests who already confirmed (default false)
 * @property {boolean} [includeGuests]      - Include guests matching filter (default true)
 * @property {number}  [basePriority]       - Base priority added to every item (default 0)
 */

/**
 * @typedef {object} ChunkOptions
 * @property {number} [chunkSize]           - Max items per chunk (default 50)
 * @property {number} [delayMs]             - Suggested delay between chunks in ms (default 60000)
 */

/**
 * @typedef {object} ScheduledChunk
 * @property {number} index                 - 0-based chunk index
 * @property {number} sendAfterMs           - Suggested ms offset from batch start
 * @property {InvitationItem[]} items
 */

// ─── Channel resolution ───────────────────────────────────────────────────────

/**
 * Resolve the best delivery channel for a guest.
 * Preference order: whatsapp (phone) → sms (phone) → email.
 *
 * @param {GuestRecord} guest
 * @param {string[]} [allowedChannels]
 * @returns {{ channel: string, address: string } | null}
 */
function resolveChannel(guest, allowedChannels = CHANNELS) {
  const hasPhone = typeof guest.phone === 'string' && guest.phone.trim() !== '';
  const hasEmail = typeof guest.email === 'string' && guest.email.trim() !== '';

  if (hasPhone && allowedChannels.includes('whatsapp')) {
    return { channel: 'whatsapp', address: guest.phone.trim() };
  }
  if (hasPhone && allowedChannels.includes('sms')) {
    return { channel: 'sms', address: guest.phone.trim() };
  }
  if (hasEmail && allowedChannels.includes('email')) {
    return { channel: 'email', address: guest.email.trim() };
  }
  return null;
}

// ─── Batch builder ────────────────────────────────────────────────────────────

/**
 * Build an unsorted flat list of invitation items from a guest array.
 *
 * @param {GuestRecord[]} guests
 * @param {BatchOptions} [opts]
 * @returns {InvitationItem[]}
 */
export function buildInvitationBatch(guests, opts = {}) {
  if (!Array.isArray(guests)) return [];

  const {
    channels = [...CHANNELS],
    excludeDeclined = true,
    excludeConfirmed = false,
    basePriority = 0,
  } = opts;

  const items = [];

  for (const guest of guests) {
    if (!guest || typeof guest !== 'object') continue;
    if (excludeDeclined && guest.status === 'declined') continue;
    if (excludeConfirmed && guest.status === 'confirmed') continue;

    const resolved = resolveChannel(guest, channels);
    if (!resolved) continue;

    const guestPriority = typeof guest.priority === 'number' ? guest.priority : 0;

    items.push({
      guestId: guest.id,
      name: guest.name ?? '',
      channel: resolved.channel,
      address: resolved.address,
      priority: basePriority + guestPriority,
      meta: { status: guest.status ?? 'pending', plusOne: guest.plusOne ?? false },
    });
  }

  return items;
}

// ─── Prioritisation ───────────────────────────────────────────────────────────

/**
 * Sort an invitation batch so highest-priority items come first.
 * Items with equal priority preserve original order (stable sort).
 *
 * @param {InvitationItem[]} batch
 * @returns {InvitationItem[]} New sorted array (input not mutated).
 */
export function prioritizeBatch(batch) {
  if (!Array.isArray(batch)) return [];
  return [...batch].sort((a, b) => b.priority - a.priority);
}

// ─── Channel split ────────────────────────────────────────────────────────────

/**
 * Split a batch into per-channel sub-arrays.
 *
 * @param {InvitationItem[]} batch
 * @returns {Record<string, InvitationItem[]>}
 */
export function splitBatchByChannel(batch) {
  if (!Array.isArray(batch)) return {};
  const result = {};
  for (const item of batch) {
    const ch = item.channel ?? 'unknown';
    if (!result[ch]) result[ch] = [];
    result[ch].push(item);
  }
  return result;
}

// ─── Rate-limit chunking ──────────────────────────────────────────────────────

/**
 * Split a flat batch into rate-limited chunks with timing metadata.
 *
 * @param {InvitationItem[]} batch
 * @param {ChunkOptions} [opts]
 * @returns {ScheduledChunk[]}
 */
export function chunkBatch(batch, opts = {}) {
  if (!Array.isArray(batch) || batch.length === 0) return [];

  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    delayMs = 60_000,
  } = opts;

  const size = Math.max(1, chunkSize);
  const chunks = [];

  for (let i = 0; i < batch.length; i += size) {
    const index = Math.floor(i / size);
    chunks.push({
      index,
      sendAfterMs: index * delayMs,
      items: batch.slice(i, i + size),
    });
  }

  return chunks;
}

// ─── Rate-limit helpers ───────────────────────────────────────────────────────

/**
 * Calculate the recommended chunk size for a channel given its rate limit.
 *
 * @param {string} channel
 * @param {number} [windowMinutes=1] - Duration of the rate-limit window in minutes.
 * @param {Record<string, number>} [rateLimits]
 * @returns {number}
 */
export function getChunkSizeForChannel(channel, windowMinutes = 1, rateLimits = DEFAULT_RATE_LIMITS) {
  const limit = rateLimits[channel] ?? DEFAULT_CHUNK_SIZE;
  return Math.max(1, Math.floor(limit * windowMinutes));
}

/**
 * Estimate total send duration for a batch given chunk size and inter-chunk delay.
 *
 * @param {number} totalItems
 * @param {number} chunkSize
 * @param {number} delayMs
 * @returns {number} Total estimated ms from first chunk to last.
 */
export function estimateSendDuration(totalItems, chunkSize, delayMs) {
  if (totalItems <= 0 || chunkSize <= 0) return 0;
  const chunks = Math.ceil(totalItems / chunkSize);
  return (chunks - 1) * delayMs;
}

// ─── Summary ──────────────────────────────────────────────────────────────────

/**
 * Build a human-readable summary of a batch.
 *
 * @param {InvitationItem[]} batch
 * @returns {{ total: number, byChannel: Record<string, number>, unreachable: number }}
 */
export function summarizeBatch(batch) {
  if (!Array.isArray(batch)) return { total: 0, byChannel: {}, unreachable: 0 };

  const byChannel = {};
  for (const item of batch) {
    const ch = item.channel ?? 'unknown';
    byChannel[ch] = (byChannel[ch] || 0) + 1;
  }

  return { total: batch.length, byChannel, unreachable: 0 };
}

/**
 * Count guests in a list who have no reachable address on any allowed channel.
 *
 * @param {GuestRecord[]} guests
 * @param {string[]} [channels]
 * @returns {number}
 */
export function countUnreachable(guests, channels = [...CHANNELS]) {
  if (!Array.isArray(guests)) return 0;
  return guests.filter(g => g && resolveChannel(g, channels) === null).length;
}
