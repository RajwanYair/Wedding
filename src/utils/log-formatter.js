/**
 * src/utils/log-formatter.js — Structured log formatting (Sprint 209)
 *
 * Formats log entries into consistent objects and serialization formats.
 * Does NOT do the actual logging—callers use console.* or a transport.
 *
 * Zero dependencies.
 */

/** @typedef {"debug"|"info"|"warn"|"error"|"fatal"} LogLevel */

/**
 * Numeric severity for comparison.
 * @type {Record<LogLevel, number>}
 */
export const LEVEL_SEVERITY = {
  debug: 10,
  info:  20,
  warn:  30,
  error: 40,
  fatal: 50,
};

/**
 * @typedef {{ level: LogLevel, message: string, timestamp: string, context?: Record<string, unknown>, error?: { message: string, stack?: string }}} LogEntry
 */

/**
 * Create a structured log entry.
 *
 * @param {LogLevel} level
 * @param {string}   message
 * @param {Record<string, unknown>} [context]
 * @param {Error} [err]
 * @returns {LogEntry}
 */
export function createEntry(level, message, context, err) {
  /** @type {LogEntry} */
  const entry = {
    level,
    message: String(message),
    timestamp: new Date().toISOString(),
  };
  if (context && Object.keys(context).length) entry.context = context;
  if (err instanceof Error) {
    entry.error = { message: err.message };
    if (err.stack) entry.error.stack = err.stack;
  }
  return entry;
}

/**
 * Format a log entry as a single-line human-readable string.
 * @param {LogEntry} entry
 * @returns {string}
 */
export function formatHuman(entry) {
  const level = entry.level.toUpperCase().padEnd(5);
  const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
  const errPart = entry.error ? ` | Error: ${entry.error.message}` : "";
  return `[${entry.timestamp}] ${level} ${entry.message}${ctx}${errPart}`;
}

/**
 * Format a log entry as a compact JSON string (ndjson-compatible).
 * @param {LogEntry} entry
 * @returns {string}
 */
export function formatJSON(entry) {
  return JSON.stringify(entry);
}

/**
 * Filter a log entry by minimum level.
 * @param {LogEntry} entry
 * @param {LogLevel} minLevel
 * @returns {boolean}
 */
export function meetsLevel(entry, minLevel) {
  return (LEVEL_SEVERITY[entry.level] ?? 0) >= (LEVEL_SEVERITY[minLevel] ?? 0);
}

/**
 * Redact sensitive key values from a context object.
 * Values for matching keys are replaced with "***".
 *
 * @param {Record<string, unknown>} context
 * @param {string[]} [sensitiveKeys]
 * @returns {Record<string, unknown>}
 */
export function redactContext(context, sensitiveKeys = ["password", "token", "secret", "apiKey"]) {
  const result = { ...context };
  for (const key of Object.keys(result)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      result[key] = "***";
    }
  }
  return result;
}

/**
 * Convenience factories.
 */
export const log = {
  /** @param {string} msg @param {Record<string, unknown>} [ctx] */
  debug: (msg, ctx) => createEntry("debug", msg, ctx),
  /** @param {string} msg @param {Record<string, unknown>} [ctx] */
  info:  (msg, ctx) => createEntry("info",  msg, ctx),
  /** @param {string} msg @param {Record<string, unknown>} [ctx] */
  warn:  (msg, ctx) => createEntry("warn",  msg, ctx),
  /** @param {string} msg @param {Record<string, unknown>} [ctx] @param {Error} [err] */
  error: (msg, ctx, err) => createEntry("error", msg, ctx, err),
  /** @param {string} msg @param {Record<string, unknown>} [ctx] @param {Error} [err] */
  fatal: (msg, ctx, err) => createEntry("fatal", msg, ctx, err),
};
