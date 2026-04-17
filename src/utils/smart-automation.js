/**
 * src/utils/smart-automation.js — Smart automation helpers (Phase 10.4)
 *
 * Pure functions — no side effects, no DOM, no imports from sections.
 * Used by analytics, WhatsApp, and the day-of playbook.
 *
 * Exports:
 *   smartFollowUp(guests)         → Follow-up candidates sorted by priority
 *   buildDayOfPlaybook(timeline, vendors) → Ordered day-of checklist steps
 *   scoreSeatingCandidate(guest, table, tableGuests) → Fit score 0–100
 */

// ── Types (JSDoc) ─────────────────────────────────────────────────────────

/**
 * @typedef {object} Guest
 * @property {string} id
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} phone
 * @property {string} email
 * @property {string} status   pending|confirmed|declined|maybe
 * @property {string} side     groom|bride|mutual
 * @property {string} group    family|friends|work|other
 * @property {string} meal     regular|vegetarian|vegan|gluten_free|kosher
 * @property {string|null} tableId
 * @property {boolean} sent
 * @property {string|null} rsvpDate
 * @property {boolean} checkedIn
 * @property {number} count
 * @property {string|null} [createdAt]
 * @property {string|null} [updatedAt]
 * @property {boolean} [vip]
 */

/**
 * @typedef {object} FollowUpCandidate
 * @property {Guest} guest
 * @property {string} reason     Why flagged for follow-up
 * @property {'high'|'medium'|'low'} priority
 * @property {number} daysSinceSent  Days since invitation was sent
 */

/**
 * @typedef {object} TimelineItem
 * @property {string} id
 * @property {string} title
 * @property {string} time        ISO string or HH:MM
 * @property {string} [category]  e.g. "ceremony"|"reception"|"prep"
 * @property {string} [vendorId]
 * @property {string} [notes]
 */

/**
 * @typedef {object} Vendor
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {string} [phone]
 * @property {string} [notes]
 * @property {string} [updatedAt]
 */

/**
 * @typedef {object} PlaybookStep
 * @property {string} time       HH:MM (approx)
 * @property {string} title
 * @property {string} description
 * @property {'critical'|'important'|'optional'} priority
 * @property {string} [vendorName]
 * @property {string} [vendorPhone]
 */

/**
 * @typedef {object} Table
 * @property {string} id
 * @property {string} name
 * @property {number} capacity
 * @property {string} [shape]
 */

// ── Smart Follow-up ────────────────────────────────────────────────────────

/**
 * Find guests who need follow-up on their RSVP.
 * Returns candidates sorted by priority (high → low) then by days waiting.
 *
 * Algorithm:
 *   1. Pending + invitation sent > 7 days ago → high priority
 *   2. Pending + invitation sent 3–7 days ago → medium priority
 *   3. Pending + invitation NOT sent → low (remind to send invite first)
 *   4. "Maybe" responses older than 5 days → medium priority
 *   5. VIP guests with any pending status → elevated to high
 *
 * @param {Guest[]} guests
 * @returns {FollowUpCandidate[]}
 */
export function smartFollowUp(guests) {
  const now = Date.now();
  /** @type {FollowUpCandidate[]} */
  const candidates = [];

  for (const g of guests) {
    if (g.status === "confirmed" || g.status === "declined" || g.checkedIn) continue;

    const sentDate = g.rsvpDate ? new Date(g.rsvpDate).getTime() : null;
    const daysSinceSent = sentDate ? Math.floor((now - sentDate) / 86_400_000) : -1;

    if (g.status === "pending") {
      if (!g.sent) {
        candidates.push({
          guest: g,
          reason: "invitation_not_sent",
          priority: "low",
          daysSinceSent: 0,
        });
      } else if (daysSinceSent >= 7) {
        candidates.push({
          guest: g,
          reason: "no_response_7_days",
          priority: g.vip ? "high" : "high",
          daysSinceSent,
        });
      } else if (daysSinceSent >= 3) {
        candidates.push({
          guest: g,
          reason: "no_response_3_days",
          priority: g.vip ? "high" : "medium",
          daysSinceSent,
        });
      }
    } else if (g.status === "maybe") {
      const daysWaiting = sentDate ? Math.floor((now - sentDate) / 86_400_000) : 0;
      if (daysWaiting >= 5) {
        candidates.push({
          guest: g,
          reason: "maybe_response_needs_confirmation",
          priority: g.vip ? "high" : "medium",
          daysSinceSent: daysWaiting,
        });
      }
    }
  }

  // Sort: priority order then days waiting descending
  const ORDER = { high: 0, medium: 1, low: 2 };
  return candidates.sort((a, b) => {
    const pDiff = ORDER[a.priority] - ORDER[b.priority];
    return pDiff !== 0 ? pDiff : b.daysSinceSent - a.daysSinceSent;
  });
}

/**
 * Summarize follow-up counts by priority.
 * @param {FollowUpCandidate[]} candidates
 * @returns {{ high: number, medium: number, low: number, total: number }}
 */
export function summarizeFollowUp(candidates) {
  const counts = { high: 0, medium: 0, low: 0 };
  for (const c of candidates) counts[c.priority]++;
  return { ...counts, total: candidates.length };
}

// ── Day-of Playbook ────────────────────────────────────────────────────────

/**
 * Build a day-of playbook checklist from timeline items and vendor contacts.
 * Items are ordered chronologically; vendor due-time items use their scheduled time.
 * Adds automatic buffer steps (30 min before ceremony for greeting, etc.).
 *
 * @param {TimelineItem[]} timeline
 * @param {Vendor[]} vendors
 * @returns {PlaybookStep[]}
 */
export function buildDayOfPlaybook(timeline, vendors) {
  /** @type {PlaybookStep[]} */
  const steps = [];

  /** @type {Map<string, Vendor>} */
  const vendorMap = new Map(vendors.map((v) => [v.id, v]));

  // ── From timeline items ──────────────────────────────────────────────

  for (const item of timeline) {
    const time = _normalizeTime(item.time);
    const vendor = item.vendorId ? vendorMap.get(item.vendorId) : null;

    steps.push({
      time,
      title: item.title,
      description: item.notes ?? "",
      priority: _classifyPriority(item),
      vendorName: vendor?.name,
      vendorPhone: vendor?.phone,
    });

    // Add pre-event buffer step for critical milestones
    if (_isCriticalMilestone(item)) {
      const bufferTime = _subtractMinutes(time, 30);
      steps.push({
        time: bufferTime,
        title: `הכנה: ${item.title}`,
        description: `30 דק' לפני: ${item.title}`,
        priority: "important",
        vendorName: vendor?.name,
        vendorPhone: vendor?.phone,
      });
    }
  }

  // ── Automatically insert vendor check-in steps ───────────────────────

  for (const vendor of vendors) {
    if (!vendor.phone) continue;
    const category = (vendor.category ?? "").toLowerCase();
    const checkTime = _vendorCheckTime(category);
    if (!checkTime) continue;
    // Avoid duplicate if already in timeline
    const alreadyPresent = steps.some(
      (s) => s.vendorName === vendor.name && _timeDiff(s.time, checkTime) < 30,
    );
    if (!alreadyPresent) {
      steps.push({
        time: checkTime,
        title: `אישור: ${vendor.name}`,
        description: `צלצל לאשר הגעה: ${vendor.phone}`,
        priority: "important",
        vendorName: vendor.name,
        vendorPhone: vendor.phone,
      });
    }
  }

  // ── Sort chronologically ─────────────────────────────────────────────

  return steps.sort((a, b) => _compareTime(a.time, b.time));
}

// ── Seating Fit Score ─────────────────────────────────────────────────────

/**
 * Score how well a guest fits at a table given current seated guests.
 * Returns a score from 0–100 (higher = better fit).
 *
 * Scoring:
 *   +30  If same side (groom/bride/mutual)
 *   +20  If same group (family/friends/work/other)
 *   +20  If same meal preference (reduces kitchen complexity)
 *   +15  If table has available capacity for full guest party
 *   +15  If no accessibility conflict (accessible table for accessible guest)
 *
 * @param {Guest} guest
 * @param {Table} table
 * @param {Guest[]} tableGuests   Guests already seated at this table
 * @returns {number}              0–100 fit score
 */
export function scoreSeatingCandidate(guest, table, tableGuests) {
  let score = 0;

  // Capacity check: ensure table can fit this guest + companions
  const seated = tableGuests.reduce((sum, g) => sum + (g.count ?? 1), 0);
  const needed = guest.count ?? 1;
  if (seated + needed > (table.capacity ?? 8)) return 0; // No fit

  score += 15; // Capacity OK

  // Side parity (30 pts) — most important social grouping
  const sideMatch = tableGuests.filter((g) => g.side === guest.side).length;
  if (sideMatch > 0 || tableGuests.length === 0) score += 30;

  // Group parity (20 pts)
  const groupMatch = tableGuests.filter((g) => g.group === guest.group).length;
  if (groupMatch > 0 || tableGuests.length === 0) score += 20;

  // Meal parity (20 pts — reduces kitchen grouping complexity)
  const mealMatch = tableGuests.filter((g) => g.meal === guest.meal).length;
  if (mealMatch > 0 || tableGuests.length === 0) score += 20;

  // Accessibility parity (15 pts)
  const guestNeedsAccessibility = Boolean(guest.accessibility);
  const tableIsAccessible = tableGuests.some((g) => g.accessibility);
  if (!guestNeedsAccessibility || tableIsAccessible || tableGuests.length === 0) score += 15;

  return Math.min(100, score);
}

// ── Internal helpers ──────────────────────────────────────────────────────

/**
 * @param {string} rawTime
 * @returns {string} "HH:MM"
 */
function _normalizeTime(rawTime) {
  if (!rawTime) return "00:00";
  // Already HH:MM
  if (/^\d{1,2}:\d{2}$/.test(rawTime)) return rawTime.padStart(5, "0");
  // ISO 8601
  try {
    const d = new Date(rawTime);
    if (!isNaN(d.getTime())) {
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
  } catch {}
  return rawTime.slice(0, 5);
}

/**
 * @param {string} time  "HH:MM"
 * @param {number} mins
 * @returns {string}  "HH:MM"
 */
function _subtractMinutes(time, mins) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m - mins;
  const clamped = Math.max(0, total);
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

/**
 * @param {string} a  "HH:MM"
 * @param {string} b  "HH:MM"
 * @returns {number}  abs diff in minutes
 */
function _timeDiff(a, b) {
  const toMins = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  return Math.abs(toMins(a) - toMins(b));
}

/**
 * @param {string} a  "HH:MM"
 * @param {string} b  "HH:MM"
 * @returns {number}  negative if a < b
 */
function _compareTime(a, b) {
  const toMins = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  return toMins(a) - toMins(b);
}

/**
 * @param {TimelineItem} item
 * @returns {'critical'|'important'|'optional'}
 */
function _classifyPriority(item) {
  const cat = (item.category ?? "").toLowerCase();
  const title = (item.title ?? "").toLowerCase();
  if (cat === "ceremony" || title.includes("טקס") || title.includes("ceremony")) return "critical";
  if (cat === "reception" || title.includes("קבלת פנים")) return "critical";
  if (cat === "prep" || title.includes("הכנה")) return "important";
  return "optional";
}

/**
 * @param {TimelineItem} item
 * @returns {boolean}
 */
function _isCriticalMilestone(item) {
  return _classifyPriority(item) === "critical";
}

/**
 * Return suggested check-in time (HH:MM) for vendor category.
 * Returns null if no automatic check-in is needed.
 * @param {string} category
 * @returns {string | null}
 */
function _vendorCheckTime(category) {
  /** @type {Record<string, string>} */
  const CATEGORY_TIMES = {
    catering: "10:00",
    צילום: "14:00",
    photography: "14:00",
    dj: "16:00",
    band: "16:00",
    florist: "13:00",
    תפאורה: "13:00",
    makeup: "09:00",
    hair: "09:00",
  };
  for (const [key, time] of Object.entries(CATEGORY_TIMES)) {
    if (category.includes(key)) return time;
  }
  return null;
}
