/**
 * src/utils/error-recovery.js
 * Error classification, retry logic, and recovery helpers — pure data, no DOM.
 *
 * @module error-recovery
 */

// ── Constants ──────────────────────────────────────────────────────────────

/** Error class identifiers used by classifyError(). */
export const ERROR_CLASSES = Object.freeze({
  NETWORK: "network",
  AUTH: "auth",
  QUOTA: "quota",
  NOT_FOUND: "not_found",
  VALIDATION: "validation",
  TIMEOUT: "timeout",
  RATE_LIMIT: "rate_limit",
  SERVER: "server",
  UNKNOWN: "unknown",
});

/** Retry strategy presets. */
export const RETRY_STRATEGIES = Object.freeze({
  NONE: "none",
  FIXED: "fixed",
  EXPONENTIAL: "exponential",
  JITTER: "jitter",
});

// ── Classification ─────────────────────────────────────────────────────────

/**
 * Classifies an error into one of the ERROR_CLASSES values.
 * Accepts Error objects, objects with a `status`/`code` property, or strings.
 * @param {Error|object|string|null} err
 * @returns {string} One of ERROR_CLASSES values.
 */
export function classifyError(err) {
  if (!err) return ERROR_CLASSES.UNKNOWN;

  const message = (typeof err === "string" ? err : err.message ?? "").toLowerCase();
  const status = typeof err === "object" ? (err.status ?? err.statusCode ?? err.code ?? 0) : 0;

  if (isNetworkError(err)) return ERROR_CLASSES.NETWORK;
  if (isAuthError(err)) return ERROR_CLASSES.AUTH;
  if (isQuotaError(err)) return ERROR_CLASSES.QUOTA;
  if (isNotFoundError(err)) return ERROR_CLASSES.NOT_FOUND;
  if (isRateLimitError(err)) return ERROR_CLASSES.RATE_LIMIT;
  if (isTimeoutError(err)) return ERROR_CLASSES.TIMEOUT;

  if (status >= 500 && status < 600) return ERROR_CLASSES.SERVER;
  if (message.includes("valid") || message.includes("invalid") || message.includes("schema")) {
    return ERROR_CLASSES.VALIDATION;
  }

  return ERROR_CLASSES.UNKNOWN;
}

/**
 * Returns true for network-related errors (offline, CORS, fetch failure).
 * @param {Error|object|string} err
 * @returns {boolean}
 */
export function isNetworkError(err) {
  if (!err) return false;
  const message = (typeof err === "string" ? err : err.message ?? "").toLowerCase();
  const name = typeof err === "object" ? (err.name ?? "").toLowerCase() : "";
  return (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("offline") ||
    message.includes("connection") ||
    name === "networkerror" ||
    name === "typeerror" && message.includes("failed to fetch")
  );
}

/**
 * Returns true for authentication / authorisation errors.
 * @param {Error|object} err
 * @returns {boolean}
 */
export function isAuthError(err) {
  if (!err) return false;
  const message = (typeof err === "string" ? err : err.message ?? "").toLowerCase();
  const status = typeof err === "object" ? (err.status ?? err.statusCode ?? 0) : 0;
  return status === 401 || status === 403 || message.includes("unauthorized") || message.includes("forbidden") || message.includes("not authenticated");
}

/**
 * Returns true for storage quota exceeded errors.
 * @param {Error|object} err
 * @returns {boolean}
 */
export function isQuotaError(err) {
  if (!err) return false;
  const message = (typeof err === "string" ? err : err.message ?? "").toLowerCase();
  const name = typeof err === "object" ? (err.name ?? "") : "";
  return name === "QuotaExceededError" || message.includes("quota") || message.includes("storage full") || message.includes("no space");
}

/**
 * Returns true for 404 / not-found errors.
 * @param {Error|object} err
 * @returns {boolean}
 */
export function isNotFoundError(err) {
  if (!err) return false;
  const status = typeof err === "object" ? (err.status ?? err.statusCode ?? 0) : 0;
  const message = (typeof err === "string" ? err : err.message ?? "").toLowerCase();
  return status === 404 || message.includes("not found") || message.includes("does not exist");
}

/**
 * Returns true for rate-limit (429) errors.
 * @param {Error|object} err
 * @returns {boolean}
 */
export function isRateLimitError(err) {
  if (!err) return false;
  const status = typeof err === "object" ? (err.status ?? err.statusCode ?? 0) : 0;
  const message = (typeof err === "string" ? err : err.message ?? "").toLowerCase();
  return status === 429 || message.includes("rate limit") || message.includes("too many requests");
}

/**
 * Returns true for timeout errors.
 * @param {Error|object} err
 * @returns {boolean}
 */
export function isTimeoutError(err) {
  if (!err) return false;
  const message = (typeof err === "string" ? err : err.message ?? "").toLowerCase();
  const name = typeof err === "object" ? (err.name ?? "") : "";
  return name === "AbortError" || message.includes("timeout") || message.includes("timed out") || message.includes("aborted");
}

/**
 * Returns true when an error class is retryable.
 * @param {string} errorClass - One of ERROR_CLASSES values.
 * @returns {boolean}
 */
export function isRetryable(errorClass) {
  return [
    ERROR_CLASSES.NETWORK,
    ERROR_CLASSES.TIMEOUT,
    ERROR_CLASSES.RATE_LIMIT,
    ERROR_CLASSES.SERVER,
  ].includes(errorClass);
}

// ── Retry delay calculation ────────────────────────────────────────────────

/**
 * Calculates the delay in ms before the next retry attempt.
 * @param {number} attempt - 1-indexed attempt number.
 * @param {{ strategy?: string, baseMs?: number, maxMs?: number }} [opts]
 * @returns {number} Delay in milliseconds.
 */
export function getRetryDelay(attempt, {
  strategy = RETRY_STRATEGIES.EXPONENTIAL,
  baseMs = 500,
  maxMs = 30_000,
} = {}) {
  if (attempt < 1) return 0;

  let delay;
  switch (strategy) {
    case RETRY_STRATEGIES.NONE:
      return 0;
    case RETRY_STRATEGIES.FIXED:
      delay = baseMs;
      break;
    case RETRY_STRATEGIES.EXPONENTIAL:
      delay = baseMs * (2 ** (attempt - 1));
      break;
    case RETRY_STRATEGIES.JITTER:
      // Exponential with ±25% random jitter (deterministic-ish for tests: use fixed 0.5)
      delay = baseMs * (2 ** (attempt - 1)) * 0.75 + (baseMs * (2 ** (attempt - 1)) * 0.5) * 0.5;
      break;
    default:
      delay = baseMs;
  }

  return Math.min(delay, maxMs);
}

// ── Error report builder ───────────────────────────────────────────────────

/**
 * Builds a plain error report object suitable for logging / telemetry.
 * @param {Error|object|string} err
 * @param {{ context?: string, attempt?: number, userId?: string }} [meta]
 * @returns {{ message: string, errorClass: string, stack?: string, context: string, attempt: number, timestamp: string, retryable: boolean }}
 */
export function buildErrorReport(err, { context = "unknown", attempt = 1, userId } = {}) {
  const message = typeof err === "string" ? err : (err?.message ?? "Unknown error");
  const stack = typeof err === "object" && err?.stack ? err.stack : undefined;
  const errorClass = classifyError(err);

  const report = {
    message,
    errorClass,
    context,
    attempt,
    timestamp: new Date().toISOString(),
    retryable: isRetryable(errorClass),
  };

  if (stack) report.stack = stack;
  if (userId) report.userId = userId;

  return report;
}

// ── Wrappers ───────────────────────────────────────────────────────────────

/**
 * Wraps a promise with a timeout. Rejects with an AbortError if it takes longer than `ms`.
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @returns {Promise<T>}
 */
export function withTimeout(promise, ms) {
  const timer = new Promise((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      const e = new Error(`Operation timed out after ${ms}ms`);
      e.name = "AbortError";
      reject(e);
    }, ms);
  });
  return Promise.race([promise, timer]);
}

/**
 * Executes `fn`, returning its result or `fallbackValue` on any error.
 * @template T
 * @param {() => T | Promise<T>} fn
 * @param {T} fallbackValue
 * @returns {Promise<T>}
 */
export async function withFallback(fn, fallbackValue) {
  try {
    return await fn();
  } catch {
    return fallbackValue;
  }
}
