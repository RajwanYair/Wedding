/**
 * src/utils/trigger-automation.js — S648 Event-based trigger automation
 *
 * Pure helpers for defining automation triggers (e.g., RSVP confirmed →
 * send WhatsApp, payment received → email receipt), evaluating conditions,
 * and logging executions.
 *
 * @module trigger-automation
 * @owner automation
 */

let _triggerCounter = 0;
let _logCounter = 0;

/** Reset counters (for tests). */
export function resetCounters() {
  _triggerCounter = 0;
  _logCounter = 0;
}

/**
 * @typedef {object} Trigger
 * @property {string} id
 * @property {string} event - e.g. "rsvp.confirmed", "payment.received"
 * @property {Record<string, unknown>} [conditions]
 * @property {string} action - e.g. "whatsapp.send", "email.send", "webhook.fire"
 * @property {Record<string, unknown>} [actionParams]
 * @property {boolean} enabled
 * @property {string} createdAt
 */

/**
 * @typedef {object} ExecutionLog
 * @property {string} id
 * @property {string} triggerId
 * @property {string} event
 * @property {"success"|"skipped"|"error"} result
 * @property {string} [error]
 * @property {string} executedAt
 */

/**
 * Create a new trigger rule.
 *
 * @param {string} event
 * @param {string} action
 * @param {Record<string, unknown>} [conditions]
 * @param {Record<string, unknown>} [actionParams]
 * @returns {Trigger}
 */
export function createTrigger(event, action, conditions, actionParams) {
  _triggerCounter++;
  return {
    id: `trig_${_triggerCounter}`,
    event: String(event ?? ""),
    conditions: conditions ?? {},
    action: String(action ?? ""),
    actionParams: actionParams ?? {},
    enabled: true,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Toggle trigger enabled state.
 *
 * @param {Trigger} trigger
 * @returns {Trigger}
 */
export function toggleTrigger(trigger) {
  if (!trigger) return trigger;
  return { ...trigger, enabled: !trigger.enabled };
}

/**
 * Evaluate whether a trigger's conditions match the event payload.
 *
 * @param {Trigger} trigger
 * @param {Record<string, unknown>} payload
 * @returns {boolean}
 */
export function evaluateConditions(trigger, payload) {
  if (!trigger || !trigger.conditions) return true;
  const conditions = trigger.conditions;
  for (const key of Object.keys(conditions)) {
    if (payload?.[key] !== conditions[key]) return false;
  }
  return true;
}

/**
 * Find all triggers that match a given event name.
 *
 * @param {Trigger[]} triggers
 * @param {string} eventName
 * @returns {Trigger[]}
 */
export function findMatchingTriggers(triggers, eventName) {
  if (!Array.isArray(triggers)) return [];
  return triggers.filter((t) => t.enabled && t.event === eventName);
}

/**
 * Execute matching triggers against a payload, returning execution logs.
 * This is a pure evaluation — actual side effects are handled externally.
 *
 * @param {Trigger[]} triggers
 * @param {string} eventName
 * @param {Record<string, unknown>} payload
 * @returns {ExecutionLog[]}
 */
export function executeTriggers(triggers, eventName, payload) {
  const matching = findMatchingTriggers(triggers, eventName);
  const logs = [];

  for (const trigger of matching) {
    _logCounter++;
    if (evaluateConditions(trigger, payload)) {
      logs.push({
        id: `exec_${_logCounter}`,
        triggerId: trigger.id,
        event: eventName,
        result: "success",
        executedAt: new Date().toISOString(),
      });
    } else {
      logs.push({
        id: `exec_${_logCounter}`,
        triggerId: trigger.id,
        event: eventName,
        result: "skipped",
        executedAt: new Date().toISOString(),
      });
    }
  }

  return logs;
}

/**
 * Create an error execution log entry.
 *
 * @param {string} triggerId
 * @param {string} eventName
 * @param {string} errorMessage
 * @returns {ExecutionLog}
 */
export function createErrorLog(triggerId, eventName, errorMessage) {
  _logCounter++;
  return {
    id: `exec_${_logCounter}`,
    triggerId,
    event: eventName,
    result: "error",
    error: errorMessage,
    executedAt: new Date().toISOString(),
  };
}

/**
 * Summarize execution logs.
 *
 * @param {ExecutionLog[]} logs
 * @returns {{ total: number, success: number, skipped: number, errors: number }}
 */
export function executionSummary(logs) {
  if (!Array.isArray(logs)) return { total: 0, success: 0, skipped: 0, errors: 0 };
  let success = 0;
  let skipped = 0;
  let errors = 0;
  for (const log of logs) {
    if (log.result === "success") success++;
    else if (log.result === "skipped") skipped++;
    else if (log.result === "error") errors++;
  }
  return { total: logs.length, success, skipped, errors };
}

/**
 * Group triggers by event name.
 *
 * @param {Trigger[]} triggers
 * @returns {Record<string, Trigger[]>}
 */
export function groupByEvent(triggers) {
  if (!Array.isArray(triggers)) return {};
  /** @type {Record<string, Trigger[]>} */
  const groups = {};
  for (const t of triggers) {
    const key = t.event ?? "unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }
  return groups;
}
