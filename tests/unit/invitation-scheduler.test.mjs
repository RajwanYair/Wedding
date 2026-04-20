import { describe, it, expect } from 'vitest';
import {
  buildInvitationBatch,
  prioritizeBatch,
  splitBatchByChannel,
  chunkBatch,
  getChunkSizeForChannel,
  estimateSendDuration,
  summarizeBatch,
  countUnreachable,
  CHANNELS,
  DEFAULT_RATE_LIMITS,
} from '../../src/utils/invitation-scheduler.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const G = {
  withPhone: { id: 'g1', name: 'Alice', phone: '+972501111111', status: 'pending', priority: 0 },
  withEmail: { id: 'g2', name: 'Bob', email: 'bob@example.com', status: 'pending', priority: 0 },
  withBoth: { id: 'g3', name: 'Carol', phone: '+972502222222', email: 'carol@example.com', status: 'pending', priority: 5 },
  declined: { id: 'g4', name: 'Dave', phone: '+972503333333', status: 'declined', priority: 0 },
  confirmed: { id: 'g5', name: 'Eve', phone: '+972504444444', status: 'confirmed', priority: 0 },
  noContact: { id: 'g6', name: 'Frank', status: 'pending', priority: 0 },
  highPriority: { id: 'g7', name: 'Grace', phone: '+972505555555', status: 'pending', priority: 10 },
};

// ─── CHANNELS constant ────────────────────────────────────────────────────────

describe('CHANNELS', () => {
  it('includes whatsapp, sms, email', () => {
    expect(CHANNELS).toContain('whatsapp');
    expect(CHANNELS).toContain('sms');
    expect(CHANNELS).toContain('email');
  });
});

// ─── DEFAULT_RATE_LIMITS ──────────────────────────────────────────────────────

describe('DEFAULT_RATE_LIMITS', () => {
  it('defines limits for whatsapp, sms and email', () => {
    expect(typeof DEFAULT_RATE_LIMITS.whatsapp).toBe('number');
    expect(typeof DEFAULT_RATE_LIMITS.sms).toBe('number');
    expect(typeof DEFAULT_RATE_LIMITS.email).toBe('number');
  });
});

// ─── buildInvitationBatch ─────────────────────────────────────────────────────

describe('buildInvitationBatch', () => {
  it('returns empty array for non-array input', () => {
    expect(buildInvitationBatch(null)).toEqual([]);
    expect(buildInvitationBatch(undefined)).toEqual([]);
  });

  it('returns empty array for empty guest list', () => {
    expect(buildInvitationBatch([])).toEqual([]);
  });

  it('assigns whatsapp channel to guest with phone', () => {
    const [item] = buildInvitationBatch([G.withPhone]);
    expect(item.channel).toBe('whatsapp');
    expect(item.address).toBe('+972501111111');
  });

  it('assigns email channel to guest with only email', () => {
    const [item] = buildInvitationBatch([G.withEmail]);
    expect(item.channel).toBe('email');
    expect(item.address).toBe('bob@example.com');
  });

  it('prefers whatsapp over email when both present', () => {
    const [item] = buildInvitationBatch([G.withBoth]);
    expect(item.channel).toBe('whatsapp');
  });

  it('excludes declined guests by default', () => {
    const batch = buildInvitationBatch([G.withPhone, G.declined]);
    expect(batch).toHaveLength(1);
    expect(batch[0].guestId).toBe('g1');
  });

  it('includes declined guests when excludeDeclined is false', () => {
    const batch = buildInvitationBatch([G.withPhone, G.declined], { excludeDeclined: false });
    expect(batch).toHaveLength(2);
  });

  it('does not exclude confirmed guests by default', () => {
    const batch = buildInvitationBatch([G.withPhone, G.confirmed]);
    expect(batch).toHaveLength(2);
  });

  it('excludes confirmed guests when excludeConfirmed is true', () => {
    const batch = buildInvitationBatch([G.withPhone, G.confirmed], { excludeConfirmed: true });
    expect(batch).toHaveLength(1);
  });

  it('skips guests with no contact info', () => {
    const batch = buildInvitationBatch([G.withPhone, G.noContact]);
    expect(batch).toHaveLength(1);
  });

  it('applies basePriority to all items', () => {
    const batch = buildInvitationBatch([G.withPhone], { basePriority: 100 });
    expect(batch[0].priority).toBe(100);
  });

  it('adds guest.priority to basePriority', () => {
    const batch = buildInvitationBatch([G.highPriority], { basePriority: 5 });
    expect(batch[0].priority).toBe(15);
  });

  it('respects channels option — skips whatsapp if only sms/email allowed', () => {
    const batch = buildInvitationBatch([G.withPhone, G.withEmail], { channels: ['email'] });
    expect(batch).toHaveLength(1);
    expect(batch[0].channel).toBe('email');
  });

  it('includes guestId and name in output', () => {
    const [item] = buildInvitationBatch([G.withPhone]);
    expect(item.guestId).toBe('g1');
    expect(item.name).toBe('Alice');
  });

  it('skips null/non-object entries gracefully', () => {
    const batch = buildInvitationBatch([null, undefined, G.withPhone]);
    expect(batch).toHaveLength(1);
  });
});

// ─── prioritizeBatch ─────────────────────────────────────────────────────────

describe('prioritizeBatch', () => {
  it('returns empty array for non-array input', () => {
    expect(prioritizeBatch(null)).toEqual([]);
  });

  it('sorts highest priority first', () => {
    const batch = buildInvitationBatch([G.withPhone, G.withBoth, G.highPriority]);
    const sorted = prioritizeBatch(batch);
    expect(sorted[0].guestId).toBe('g7'); // priority 10
    expect(sorted[1].guestId).toBe('g3'); // priority 5
    expect(sorted[2].guestId).toBe('g1'); // priority 0
  });

  it('does not mutate input', () => {
    const batch = buildInvitationBatch([G.withPhone, G.highPriority]);
    const original = [...batch];
    prioritizeBatch(batch);
    expect(batch[0].guestId).toBe(original[0].guestId);
  });

  it('handles empty array', () => {
    expect(prioritizeBatch([])).toEqual([]);
  });
});

// ─── splitBatchByChannel ──────────────────────────────────────────────────────

describe('splitBatchByChannel', () => {
  it('returns empty object for non-array input', () => {
    expect(splitBatchByChannel(null)).toEqual({});
  });

  it('groups items by channel', () => {
    const batch = buildInvitationBatch([G.withPhone, G.withEmail, G.withBoth]);
    const split = splitBatchByChannel(batch);
    expect(split.whatsapp).toHaveLength(2); // withPhone + withBoth
    expect(split.email).toHaveLength(1);    // withEmail
  });

  it('handles empty array', () => {
    expect(splitBatchByChannel([])).toEqual({});
  });
});

// ─── chunkBatch ───────────────────────────────────────────────────────────────

describe('chunkBatch', () => {
  it('returns empty array for empty input', () => {
    expect(chunkBatch([])).toEqual([]);
    expect(chunkBatch(null)).toEqual([]);
  });

  it('splits into correct number of chunks', () => {
    const items = Array.from({ length: 110 }, (_, i) => ({ guestId: `g${i}`, channel: 'whatsapp', address: '+1', priority: 0 }));
    const chunks = chunkBatch(items, { chunkSize: 50 });
    expect(chunks).toHaveLength(3);
    expect(chunks[0].items).toHaveLength(50);
    expect(chunks[1].items).toHaveLength(50);
    expect(chunks[2].items).toHaveLength(10);
  });

  it('assigns correct sendAfterMs', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ guestId: `g${i}`, channel: 'whatsapp', address: '+1', priority: 0 }));
    const chunks = chunkBatch(items, { chunkSize: 50, delayMs: 60000 });
    expect(chunks[0].sendAfterMs).toBe(0);
    expect(chunks[1].sendAfterMs).toBe(60000);
  });

  it('handles chunk size larger than batch', () => {
    const items = [{ guestId: 'g1', channel: 'whatsapp', address: '+1', priority: 0 }];
    const chunks = chunkBatch(items, { chunkSize: 100 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].sendAfterMs).toBe(0);
  });

  it('assigns sequential index to chunks', () => {
    const items = Array.from({ length: 3 }, (_, i) => ({ guestId: `g${i}`, channel: 'whatsapp', address: '+1', priority: 0 }));
    const chunks = chunkBatch(items, { chunkSize: 1 });
    expect(chunks.map(c => c.index)).toEqual([0, 1, 2]);
  });
});

// ─── getChunkSizeForChannel ───────────────────────────────────────────────────

describe('getChunkSizeForChannel', () => {
  it('returns whatsapp rate limit by default (1 min window)', () => {
    expect(getChunkSizeForChannel('whatsapp')).toBe(DEFAULT_RATE_LIMITS.whatsapp);
  });

  it('scales with window size', () => {
    expect(getChunkSizeForChannel('whatsapp', 2)).toBe(DEFAULT_RATE_LIMITS.whatsapp * 2);
  });

  it('falls back to default chunk size for unknown channel', () => {
    expect(getChunkSizeForChannel('fax')).toBeGreaterThan(0);
  });

  it('never returns less than 1', () => {
    expect(getChunkSizeForChannel('whatsapp', 0)).toBeGreaterThanOrEqual(1);
  });
});

// ─── estimateSendDuration ─────────────────────────────────────────────────────

describe('estimateSendDuration', () => {
  it('returns 0 for a single chunk', () => {
    expect(estimateSendDuration(50, 50, 60000)).toBe(0);
  });

  it('calculates duration for multiple chunks', () => {
    // 100 items, 50 per chunk = 2 chunks → 1 delay
    expect(estimateSendDuration(100, 50, 60000)).toBe(60000);
  });

  it('calculates for 3 chunks', () => {
    expect(estimateSendDuration(110, 50, 60000)).toBe(120000);
  });

  it('returns 0 for 0 items', () => {
    expect(estimateSendDuration(0, 50, 60000)).toBe(0);
  });
});

// ─── summarizeBatch ───────────────────────────────────────────────────────────

describe('summarizeBatch', () => {
  it('returns zero summary for non-array', () => {
    expect(summarizeBatch(null).total).toBe(0);
  });

  it('counts total items', () => {
    const batch = buildInvitationBatch([G.withPhone, G.withEmail, G.withBoth]);
    expect(summarizeBatch(batch).total).toBe(3);
  });

  it('groups by channel', () => {
    const batch = buildInvitationBatch([G.withPhone, G.withEmail, G.withBoth]);
    const summary = summarizeBatch(batch);
    expect(summary.byChannel.whatsapp).toBe(2);
    expect(summary.byChannel.email).toBe(1);
  });
});

// ─── countUnreachable ─────────────────────────────────────────────────────────

describe('countUnreachable', () => {
  it('returns 0 for non-array', () => {
    expect(countUnreachable(null)).toBe(0);
  });

  it('counts guests with no contact info', () => {
    expect(countUnreachable([G.withPhone, G.noContact, G.noContact])).toBe(2);
  });

  it('returns 0 when all guests are reachable', () => {
    expect(countUnreachable([G.withPhone, G.withEmail])).toBe(0);
  });

  it('respects channel filter', () => {
    // withPhone has phone, not email — unreachable on email-only list
    expect(countUnreachable([G.withPhone], ['email'])).toBe(1);
  });
});
