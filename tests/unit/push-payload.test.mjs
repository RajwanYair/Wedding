/**
 * tests/unit/push-payload.test.mjs — Sprint 46: Web Push payload builder
 */

import { describe, it, expect } from 'vitest';
import {
  buildRsvpConfirmedPayload,
  buildRsvpDeclinedPayload,
  buildRsvpMilestonePayload,
  buildCheckinPayload,
  buildCheckinMilestonePayload,
  buildVendorDuePayload,
  buildBudgetAlertPayload,
  buildRsvpDeadlinePayload,
  buildReminderPayload,
  validatePushPayload,
  PUSH_TAGS,
  DEFAULT_ICON,
  DEFAULT_BADGE,
} from '../../src/utils/push-payload.js';

// ---------------------------------------------------------------------------
// buildRsvpConfirmedPayload
// ---------------------------------------------------------------------------

describe('buildRsvpConfirmedPayload', () => {
  it('includes guest name in title', () => {
    const p = buildRsvpConfirmedPayload({ firstName: 'Alice', lastName: 'Smith' });
    expect(p.title).toContain('Alice');
    expect(p.title).toContain('Smith');
  });

  it('falls back to "Guest" for missing name', () => {
    const p = buildRsvpConfirmedPayload({});
    expect(p.title).toContain('Guest');
  });

  it('includes guestCount in body', () => {
    const p = buildRsvpConfirmedPayload({ firstName: 'Bob', guestCount: 3 });
    expect(p.body).toContain('3');
  });

  it('includes tableName when provided', () => {
    const p = buildRsvpConfirmedPayload({ firstName: 'Carol', tableName: 'Table 5' });
    expect(p.body).toContain('Table 5');
  });

  it('has correct tag and url', () => {
    const p = buildRsvpConfirmedPayload({ firstName: 'Dave' });
    expect(p.tag).toBe(PUSH_TAGS.RSVP);
    expect(p.url).toBe('#guests');
  });

  it('has required icon and badge', () => {
    const p = buildRsvpConfirmedPayload({});
    expect(p.icon).toBe(DEFAULT_ICON);
    expect(p.badge).toBe(DEFAULT_BADGE);
  });

  it('sets type in data', () => {
    const p = buildRsvpConfirmedPayload({ firstName: 'Eve' });
    expect(p.data?.type).toBe('rsvp_confirmed');
  });
});

// ---------------------------------------------------------------------------
// buildRsvpDeclinedPayload
// ---------------------------------------------------------------------------

describe('buildRsvpDeclinedPayload', () => {
  it('includes guest name in title', () => {
    const p = buildRsvpDeclinedPayload({ firstName: 'Frank' });
    expect(p.title).toContain('Frank');
  });

  it('sets RSVP tag', () => {
    expect(buildRsvpDeclinedPayload({}).tag).toBe(PUSH_TAGS.RSVP);
  });

  it('sets correct data type', () => {
    expect(buildRsvpDeclinedPayload({}).data?.type).toBe('rsvp_declined');
  });
});

// ---------------------------------------------------------------------------
// buildRsvpMilestonePayload
// ---------------------------------------------------------------------------

describe('buildRsvpMilestonePayload', () => {
  it('includes confirmed count in title', () => {
    const p = buildRsvpMilestonePayload({ confirmed: 100, total: 150 });
    expect(p.title).toContain('100');
  });

  it('includes percentage in body', () => {
    const p = buildRsvpMilestonePayload({ confirmed: 75, total: 100 });
    expect(p.body).toContain('75%');
  });

  it('handles zero total gracefully', () => {
    const p = buildRsvpMilestonePayload({ confirmed: 0, total: 0 });
    expect(p.title).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// buildCheckinPayload
// ---------------------------------------------------------------------------

describe('buildCheckinPayload', () => {
  it('includes guest name in title', () => {
    const p = buildCheckinPayload({ firstName: 'Gina', lastName: 'Hill' });
    expect(p.title).toContain('Gina');
  });

  it('includes table name in body when provided', () => {
    const p = buildCheckinPayload({ firstName: 'Hank', tableName: 'VIP' });
    expect(p.body).toContain('VIP');
  });

  it('sets check-in tag', () => {
    expect(buildCheckinPayload({}).tag).toBe(PUSH_TAGS.CHECKIN);
  });

  it('sets url to #checkin', () => {
    expect(buildCheckinPayload({}).url).toBe('#checkin');
  });
});

// ---------------------------------------------------------------------------
// buildCheckinMilestonePayload
// ---------------------------------------------------------------------------

describe('buildCheckinMilestonePayload', () => {
  it('includes percentage in title', () => {
    const p = buildCheckinMilestonePayload({ checkedIn: 50, total: 100 });
    expect(p.title).toContain('50%');
  });

  it('includes both counts in body', () => {
    const p = buildCheckinMilestonePayload({ checkedIn: 30, total: 60 });
    expect(p.body).toContain('30');
    expect(p.body).toContain('60');
  });
});

// ---------------------------------------------------------------------------
// buildVendorDuePayload
// ---------------------------------------------------------------------------

describe('buildVendorDuePayload', () => {
  it('includes vendor name in title', () => {
    const p = buildVendorDuePayload({ name: 'Photographer', dueDate: '2026-05-01' });
    expect(p.title).toContain('Photographer');
  });

  it('includes due date in body', () => {
    const p = buildVendorDuePayload({ name: 'Caterer', dueDate: '2026-04-30' });
    expect(p.body).toContain('2026-04-30');
  });

  it('includes amount in body when provided', () => {
    const p = buildVendorDuePayload({ name: 'DJ', dueDate: '2026-05-01', amount: 5000 });
    expect(p.body).toContain('5,000');
  });

  it('sets vendor tag', () => {
    expect(buildVendorDuePayload({ name: 'X', dueDate: 'd' }).tag).toBe(PUSH_TAGS.VENDOR);
  });
});

// ---------------------------------------------------------------------------
// buildBudgetAlertPayload
// ---------------------------------------------------------------------------

describe('buildBudgetAlertPayload', () => {
  it('includes category in title', () => {
    const p = buildBudgetAlertPayload({ category: 'Flowers', spent: 8000, budget: 10000 });
    expect(p.title).toContain('Flowers');
  });

  it('includes percentage in body', () => {
    const p = buildBudgetAlertPayload({ category: 'Food', spent: 6000, budget: 10000 });
    expect(p.body).toContain('60%');
  });

  it('sets budget tag', () => {
    expect(buildBudgetAlertPayload({ category: 'X', spent: 0, budget: 100 }).tag).toBe(PUSH_TAGS.BUDGET);
  });
});

// ---------------------------------------------------------------------------
// buildRsvpDeadlinePayload
// ---------------------------------------------------------------------------

describe('buildRsvpDeadlinePayload', () => {
  it('shows days left in title', () => {
    const p = buildRsvpDeadlinePayload({ daysLeft: 3, pending: 12 });
    expect(p.title).toContain('3');
  });

  it('shows pending count in body', () => {
    const p = buildRsvpDeadlinePayload({ daysLeft: 5, pending: 20 });
    expect(p.body).toContain('20');
  });

  it('uses singular for 1 day', () => {
    const p = buildRsvpDeadlinePayload({ daysLeft: 1, pending: 5 });
    expect(p.title).toContain('1 day');
    expect(p.title).not.toContain('days');
  });
});

// ---------------------------------------------------------------------------
// buildReminderPayload
// ---------------------------------------------------------------------------

describe('buildReminderPayload', () => {
  it('uses provided title', () => {
    const p = buildReminderPayload({ title: "Don't forget the flowers" });
    expect(p.title).toBe("Don't forget the flowers");
  });

  it('defaults url to #dashboard', () => {
    const p = buildReminderPayload({ title: 'Test' });
    expect(p.url).toBe('#dashboard');
  });

  it('uses provided url', () => {
    const p = buildReminderPayload({ title: 'Test', url: '#vendors' });
    expect(p.url).toBe('#vendors');
  });
});

// ---------------------------------------------------------------------------
// validatePushPayload
// ---------------------------------------------------------------------------

describe('validatePushPayload', () => {
  it('returns empty array for valid payload', () => {
    expect(validatePushPayload({ title: 'Hello' })).toEqual([]);
  });

  it('returns error for null payload', () => {
    expect(validatePushPayload(null).length).toBeGreaterThan(0);
  });

  it('returns error for missing title', () => {
    expect(validatePushPayload({ body: 'test' }).length).toBeGreaterThan(0);
  });

  it('returns error for empty title string', () => {
    expect(validatePushPayload({ title: '   ' }).length).toBeGreaterThan(0);
  });

  it('returns error for non-string body', () => {
    expect(validatePushPayload({ title: 'T', body: 42 }).length).toBeGreaterThan(0);
  });

  it('accepts valid payload with all fields', () => {
    const p = buildRsvpConfirmedPayload({ firstName: 'Test' });
    expect(validatePushPayload(p)).toEqual([]);
  });
});
