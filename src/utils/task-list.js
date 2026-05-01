/**
 * Pre-wedding checklist task helpers — pure functions over a task array.
 *
 * @typedef {object} ChecklistTask
 * @property {string} id
 * @property {string} title
 * @property {boolean} [done]
 * @property {string} [doneAt]      ISO timestamp.
 * @property {number} [daysBefore]  How many days before the event the task
 *                                  is due (e.g. 30 = "1 month before").
 * @property {string} [category]
 * @owner shared
 */

const MS_PER_DAY = 86_400_000;

/**
 * Append a task; throws if the id is missing/non-string or already taken.
 *
 * @param {ReadonlyArray<ChecklistTask>} tasks
 * @param {ChecklistTask} task
 * @returns {ChecklistTask[]}
 */
export function addTask(tasks, task) {
  if (!task || typeof task.id !== "string" || task.id.length === 0) {
    throw new TypeError("task.id must be a non-empty string");
  }
  if (typeof task.title !== "string" || task.title.length === 0) {
    throw new TypeError("task.title must be a non-empty string");
  }
  if (tasks.some((t) => t.id === task.id)) {
    throw new RangeError(`duplicate task id: ${task.id}`);
  }
  return [...tasks, { done: false, ...task }];
}

/**
 * Mark a task as done.
 *
 * @param {ReadonlyArray<ChecklistTask>} tasks
 * @param {string} id
 * @param {string} [doneAt=new Date().toISOString()]
 * @returns {ChecklistTask[]}
 */
export function completeTask(tasks, id, doneAt) {
  const stamp = doneAt ?? new Date().toISOString();
  return tasks.map((t) =>
    t.id === id ? { ...t, done: true, doneAt: stamp } : t,
  );
}

/**
 * Compute days remaining between `now` and `eventISO`. Negative when the
 * event has passed. Returns NaN for malformed dates.
 *
 * @param {string} eventISO
 * @param {number} [now=Date.now()]
 * @returns {number}
 */
export function daysUntil(eventISO, now = Date.now()) {
  const t = Date.parse(eventISO);
  if (!Number.isFinite(t)) return Number.NaN;
  return Math.ceil((t - now) / MS_PER_DAY);
}

/**
 * Filter to only the not-yet-done tasks.
 *
 * @param {ReadonlyArray<ChecklistTask>} tasks
 * @returns {ChecklistTask[]}
 */
export function pendingTasks(tasks) {
  return tasks.filter((t) => !t.done);
}

/**
 * Group pending tasks by due window relative to `daysRemaining`.
 *
 * @param {ReadonlyArray<ChecklistTask>} tasks
 * @param {number} daysRemaining
 * @returns {{
 *   overdue: ChecklistTask[],
 *   dueThisWeek: ChecklistTask[],
 *   dueThisMonth: ChecklistTask[],
 *   later: ChecklistTask[],
 * }}
 */
export function groupByDueWindow(tasks, daysRemaining) {
  const groups = { overdue: [], dueThisWeek: [], dueThisMonth: [], later: [] };
  for (const t of pendingTasks(tasks)) {
    const due = typeof t.daysBefore === "number" ? t.daysBefore : Infinity;
    const slack = due - daysRemaining;
    if (slack < 0) groups.overdue.push(t);
    else if (slack <= 7) groups.dueThisWeek.push(t);
    else if (slack <= 30) groups.dueThisMonth.push(t);
    else groups.later.push(t);
  }
  return groups;
}

/**
 * Completion ratio in 0..1.
 *
 * @param {ReadonlyArray<ChecklistTask>} tasks
 * @returns {number}
 */
export function progress(tasks) {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.done).length;
  return done / tasks.length;
}
