/**
 * Event timeline — order ceremony schedule items, validate gaps + overlaps,
 * compute total duration.
 *
 * Pure functions. Times are minutes-from-start (integers) to avoid timezone
 * surprises during planning; convert to clock times at render time.
 *
 * @typedef {object} TimelineItem
 * @property {string} id
 * @property {string} title
 * @property {number} startMinute   Minutes from event start.
 * @property {number} duration      Minutes; must be > 0.
 * @property {string} [location]
 *
 * @typedef {object} TimelineConflict
 * @property {string} aId
 * @property {string} bId
 * @property {"overlap" | "duplicate-id"} kind
 * @owner shared
 */

/**
 * Sort items by start time, then duration (shorter first), then id.
 *
 * @param {ReadonlyArray<TimelineItem>} items
 * @returns {TimelineItem[]}
 */
export function sortItems(items) {
  return [...items].sort((a, b) => {
    if (a.startMinute !== b.startMinute) return a.startMinute - b.startMinute;
    if (a.duration !== b.duration) return a.duration - b.duration;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Detect overlaps and duplicate ids in an item set.
 *
 * @param {ReadonlyArray<TimelineItem>} items
 * @returns {TimelineConflict[]}
 */
export function findConflicts(items) {
  /** @type {TimelineConflict[]} */
  const out = [];
  const sorted = sortItems(items);

  // Duplicate ids
  const seen = new Map();
  for (const it of items) {
    if (seen.has(it.id)) {
      out.push({ aId: seen.get(it.id), bId: it.id, kind: "duplicate-id" });
    } else {
      seen.set(it.id, it.id);
    }
  }

  // Overlaps (sorted)
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const prevEnd = prev.startMinute + prev.duration;
    if (cur.startMinute < prevEnd) {
      out.push({ aId: prev.id, bId: cur.id, kind: "overlap" });
    }
  }
  return out;
}

/**
 * Total span from earliest start to latest end (minutes). 0 if empty.
 *
 * @param {ReadonlyArray<TimelineItem>} items
 * @returns {number}
 */
export function totalSpan(items) {
  if (items.length === 0) return 0;
  let earliest = Infinity;
  let latest = -Infinity;
  for (const it of items) {
    if (it.startMinute < earliest) earliest = it.startMinute;
    const end = it.startMinute + it.duration;
    if (end > latest) latest = end;
  }
  return latest - earliest;
}

/**
 * Insert an item, automatically pushing later items if a collision occurs.
 *
 * @param {ReadonlyArray<TimelineItem>} items
 * @param {TimelineItem} newItem
 * @returns {TimelineItem[]}
 */
export function insertWithShift(items, newItem) {
  if (!newItem || typeof newItem.id !== "string") {
    throw new TypeError("newItem requires an id");
  }
  if (!(Number.isFinite(newItem.duration) && newItem.duration > 0)) {
    throw new RangeError("duration must be > 0");
  }
  const sorted = sortItems(items);
  const result = [];
  let cursor = newItem.startMinute + newItem.duration;
  let inserted = false;
  for (const it of sorted) {
    if (!inserted && it.startMinute >= newItem.startMinute) {
      result.push(newItem);
      inserted = true;
    }
    if (inserted && it.startMinute < cursor) {
      const shifted = { ...it, startMinute: cursor };
      result.push(shifted);
      cursor = shifted.startMinute + shifted.duration;
    } else {
      result.push(it);
      cursor = Math.max(cursor, it.startMinute + it.duration);
    }
  }
  if (!inserted) result.push(newItem);
  return result;
}
