/**
 * src/utils/rsvp-reminder.js — S458: RSVP follow-up reminder scheduler.
 *
 * Computes recommended reminder dates and target guest lists based on event
 * date and current RSVP status. Pure functions (no side effects). UI/handlers
 * are responsible for actually dispatching messages via the existing WABA
 * pipeline.
 * @owner shared
 */

/**
 * @typedef {{
 *   id: string,
 *   name?: string,
 *   phone?: string,
 *   status?: "pending" | "confirmed" | "declined" | string,
 * }} GuestLite
 */

/**
 * @typedef {object} ReminderWave
 * @property {1 | 2 | 3} wave
 * @property {string} sendOn         ISO date "YYYY-MM-DD"
 * @property {number} daysBefore
 * @property {GuestLite[]} targets   Pending guests at evaluation time.
 */

const DEFAULT_WAVES = /** @type {const} */ ([
  { wave: 1, daysBefore: 30 },
  { wave: 2, daysBefore: 14 },
  { wave: 3, daysBefore: 3 },
]);

/**
 * @param {string|Date|number} input
 * @returns {Date|null}
 */
function _toDate(input) {
  if (input instanceof Date) return Number.isFinite(input.getTime()) ? input : null;
  const t = typeof input === "string" || typeof input === "number" ? new Date(input) : null;
  return t && Number.isFinite(t.getTime()) ? t : null;
}

/**
 * @param {Date} d
 * @returns {string} `YYYY-MM-DD`
 */
function _isoDate(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Build the default 3-wave reminder plan for an event.
 *
 * @param {string|Date} eventDate
 * @param {GuestLite[]} guests
 * @returns {ReminderWave[]}
 */
export function planReminders(eventDate, guests) {
  const event = _toDate(eventDate);
  if (!event) return [];
  const pending = (Array.isArray(guests) ? guests : []).filter(
    (g) => (g.status ?? "pending") === "pending" && g.phone,
  );
  return DEFAULT_WAVES.map(({ wave, daysBefore }) => {
    const send = new Date(event.getTime() - daysBefore * 24 * 60 * 60 * 1000);
    return {
      wave,
      daysBefore,
      sendOn: _isoDate(send),
      targets: pending.slice(),
    };
  });
}

/**
 * Return the next reminder wave that is due as of `today`. A wave is due when
 * `sendOn <= today` AND there exist pending targets. Returns `null` once all
 * waves have passed.
 *
 * @param {string|Date} eventDate
 * @param {GuestLite[]} guests
 * @param {string|Date} [today=new Date()]
 * @returns {ReminderWave|null}
 */
export function nextDueWave(eventDate, guests, today = new Date()) {
  const now = _toDate(today);
  if (!now) return null;
  const todayIso = _isoDate(now);
  const event = _toDate(eventDate);
  if (!event || now > event) return null;

  const waves = planReminders(eventDate, guests);
  for (const w of waves) {
    if (w.sendOn <= todayIso && w.targets.length > 0) return w;
  }
  return null;
}

/**
 * @param {string|Date} eventDate
 * @param {string|Date} [today=new Date()]
 * @returns {number} Whole days between today and the event (negative if past).
 */
export function daysUntilEvent(eventDate, today = new Date()) {
  const event = _toDate(eventDate);
  const now = _toDate(today);
  if (!event || !now) return Number.NaN;
  const ms = event.getTime() - now.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}
