/**
 * tests/unit/seating-ai.test.mjs — Sprint 44: AI seating suggestion engine
 */

import { describe, it, expect } from 'vitest';
import {
  groupByAffinity,
  buildCapacityMap,
  findBestTable,
  suggestSeating,
  scoreSeatingPlan,
  diffSeatingPlans,
} from '../../src/utils/seating-ai.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const tables = [
  { id: 't1', name: 'Table 1', capacity: 4 },
  { id: 't2', name: 'Table 2', capacity: 4 },
  { id: 't3', name: 'Table 3', capacity: 2 },
];

const guests = [
  { id: 'g1', side: 'bride', group: 'family' },
  { id: 'g2', side: 'bride', group: 'family' },
  { id: 'g3', side: 'bride', group: 'family' },
  { id: 'g4', side: 'groom', group: 'friends' },
  { id: 'g5', side: 'groom', group: 'friends' },
  { id: 'g6', side: 'groom', group: 'work' },
];

// ---------------------------------------------------------------------------
// groupByAffinity
// ---------------------------------------------------------------------------

describe('groupByAffinity', () => {
  it('groups guests by side:group key', () => {
    const map = groupByAffinity(guests);
    expect(map.has('bride:family')).toBe(true);
    expect(map.get('bride:family')?.length).toBe(3);
    expect(map.get('groom:friends')?.length).toBe(2);
    expect(map.get('groom:work')?.length).toBe(1);
  });

  it('falls back to "misc" for guests with no side or group', () => {
    const map = groupByAffinity([{ id: 'x' }]);
    expect(map.has('misc')).toBe(true);
  });

  it('uses side alone when group is absent', () => {
    const map = groupByAffinity([{ id: 'y', side: 'bride' }]);
    expect(map.has('bride')).toBe(true);
  });

  it('returns empty map for empty guest list', () => {
    expect(groupByAffinity([]).size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildCapacityMap
// ---------------------------------------------------------------------------

describe('buildCapacityMap', () => {
  it('maps tableId to capacity', () => {
    const map = buildCapacityMap(tables);
    expect(map.get('t1')).toBe(4);
    expect(map.get('t3')).toBe(2);
  });

  it('defaults capacity to 0 when missing', () => {
    const map = buildCapacityMap([{ id: 'noCapacity' }]);
    expect(map.get('noCapacity')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// findBestTable
// ---------------------------------------------------------------------------

describe('findBestTable', () => {
  it('returns table with most remaining capacity that fits size', () => {
    const map = new Map([['t1', 4], ['t2', 6], ['t3', 2]]);
    expect(findBestTable(map, 4)).toBe('t2'); // t2 has most space and fits 4
  });

  it('returns null when no table fits', () => {
    const map = new Map([['t1', 1], ['t2', 2]]);
    expect(findBestTable(map, 5)).toBeNull();
  });

  it('ignores tables that do not have enough room', () => {
    const map = new Map([['t1', 3], ['t2', 1]]);
    expect(findBestTable(map, 3)).toBe('t1');
  });
});

// ---------------------------------------------------------------------------
// suggestSeating
// ---------------------------------------------------------------------------

describe('suggestSeating', () => {
  it('places all guests when tables have enough capacity', () => {
    const plan = suggestSeating(guests, tables);
    expect(plan.assignments.length).toBe(guests.length);
    expect(plan.unplaced.length).toBe(0);
  });

  it('keeps same-group guests on the same table', () => {
    const plan = suggestSeating(guests, tables);
    const brideFamilyTables = plan.assignments
      .filter(a => ['g1', 'g2', 'g3'].includes(a.guestId))
      .map(a => a.tableId);
    const uniqueTables = new Set(brideFamilyTables);
    expect(uniqueTables.size).toBe(1); // all on same table
  });

  it('reports unplaced guests when tables are full', () => {
    const tinyTables = [{ id: 'tiny', capacity: 1 }];
    const plan = suggestSeating(guests, tinyTables);
    // Only 1 guest can fit; rest must be unplaced
    expect(plan.assignments.length).toBe(1);
    expect(plan.unplaced.length).toBe(guests.length - 1);
  });

  it('returns empty plan for empty guest list', () => {
    const plan = suggestSeating([], tables);
    expect(plan.assignments.length).toBe(0);
    expect(plan.unplaced.length).toBe(0);
  });

  it('returns unplaced = all guests for empty table list', () => {
    const plan = suggestSeating(guests, []);
    expect(plan.unplaced.length).toBe(guests.length);
  });

  it('each assignment references a valid tableId', () => {
    const plan = suggestSeating(guests, tables);
    const tableIds = new Set(tables.map(t => t.id));
    for (const a of plan.assignments) {
      expect(tableIds.has(a.tableId)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// scoreSeatingPlan
// ---------------------------------------------------------------------------

describe('scoreSeatingPlan', () => {
  it('returns score 100 for empty guest list', () => {
    const plan = { assignments: [], unplaced: [], conflicts: [] };
    expect(scoreSeatingPlan(plan, []).score).toBe(100);
  });

  it('returns score > 50 when all guests are placed', () => {
    const plan = suggestSeating(guests, tables);
    const { score } = scoreSeatingPlan(plan, guests);
    expect(score).toBeGreaterThan(50);
  });

  it('returns lower score when guests are unplaced', () => {
    const tinyTables = [{ id: 'tiny', capacity: 1 }];
    const plan = suggestSeating(guests, tinyTables);
    const { score } = scoreSeatingPlan(plan, guests);
    expect(score).toBeLessThan(50);
  });

  it('returns placementRate and cohesionRate as fractions', () => {
    const plan = suggestSeating(guests, tables);
    const result = scoreSeatingPlan(plan, guests);
    expect(result.placementRate).toBeGreaterThan(0);
    expect(result.placementRate).toBeLessThanOrEqual(1);
    expect(result.cohesionRate).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// diffSeatingPlans
// ---------------------------------------------------------------------------

describe('diffSeatingPlans', () => {
  it('identifies newly placed guests', () => {
    const plan = suggestSeating([{ id: 'new1', side: 'bride' }], [{ id: 't1', capacity: 4 }]);
    const diff = diffSeatingPlans({}, plan);
    expect(diff.newlyPlaced).toContain('new1');
  });

  it('identifies moved guests', () => {
    const existing = { g1: 't2' };
    const plan = { assignments: [{ guestId: 'g1', tableId: 't1' }], unplaced: [], conflicts: [] };
    const diff = diffSeatingPlans(existing, plan);
    expect(diff.moved).toContain('g1');
  });

  it('identifies newly unplaced guests', () => {
    const existing = { g1: 't1' };
    const plan = { assignments: [], unplaced: ['g1'], conflicts: [] };
    const diff = diffSeatingPlans(existing, plan);
    expect(diff.newlyUnplaced).toContain('g1');
  });

  it('returns empty arrays when plans match', () => {
    const existing = { g1: 't1' };
    const plan = { assignments: [{ guestId: 'g1', tableId: 't1' }], unplaced: [], conflicts: [] };
    const diff = diffSeatingPlans(existing, plan);
    expect(diff.moved.length).toBe(0);
    expect(diff.newlyPlaced.length).toBe(0);
    expect(diff.newlyUnplaced.length).toBe(0);
  });
});
