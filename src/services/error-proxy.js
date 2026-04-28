/**
 * src/services/error-proxy.js — S156 GlitchTip / Sentry-compatible error reporting.
 *
 * Lightweight edge proxy that sends unhandled errors and rejections to a
 * self-hosted GlitchTip (or Sentry-compatible) endpoint. Activated only when
 * the `ERROR_DSN` env var is set. Opt-in, zero overhead when disabled.
 *
 * No external SDK — uses the raw Sentry envelope/store API directly.
 */

/** @type {string} */
let _dsn = "";
/** @type {URL | null} */
let _endpoint = null;
/** @type {boolean} */
let _installed = false;

/**
 * Parse a Sentry-compatible DSN string.
 * Format: `https://<key>@<host>/<projectId>`
 *
 * @param {string} dsn
 * @returns {{ key: string, host: string, projectId: string, storeUrl: string } | null}
 */
export function parseDsn(dsn) {
  if (!dsn || typeof dsn !== "string") return null;
  try {
    const url = new URL(dsn);
    const key = url.username;
    const host = url.host;
    const projectId = url.pathname.replace(/^\/+/, "");
    if (!key || !host || !projectId) return null;
    const storeUrl = `${url.protocol}//${host}/api/${projectId}/store/?sentry_key=${key}&sentry_version=7`;
    return { key, host, projectId, storeUrl };
  } catch {
    return null;
  }
}

/**
 * Build a minimal Sentry-compatible error envelope payload.
 *
 * @param {Error} error
 * @param {{ tags?: Record<string, string>, extra?: Record<string, unknown> }} [context]
 * @returns {object}
 */
export function buildErrorPayload(error, context = {}) {
  return {
    event_id: _uuid4(),
    timestamp: new Date().toISOString(),
    platform: "javascript",
    level: "error",
    logger: "wedding-manager",
    exception: {
      values: [
        {
          type: error.name || "Error",
          value: error.message || "Unknown error",
          stacktrace: error.stack
            ? { frames: _parseStack(error.stack) }
            : undefined,
        },
      ],
    },
    tags: context.tags ?? {},
    extra: context.extra ?? {},
    request: {
      url: globalThis.location?.href ?? "",
      headers: {
        "User-Agent": globalThis.navigator?.userAgent ?? "",
      },
    },
  };
}

/**
 * Send an error to the configured DSN endpoint.
 * No-op if DSN is not configured.
 *
 * @param {Error} error
 * @param {{ tags?: Record<string, string>, extra?: Record<string, unknown> }} [context]
 * @returns {Promise<boolean>}
 */
export async function captureError(error, context = {}) {
  if (!_endpoint) return false;
  try {
    const payload = buildErrorPayload(error, context);
    const resp = await fetch(_endpoint.href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    return resp.ok;
  } catch {
    return false;
  }
}

/**
 * Install global error + unhandledrejection listeners.
 * Call once at app boot. No-op if DSN is empty or already installed.
 *
 * @param {string} dsn — Sentry/GlitchTip DSN string
 * @returns {{ teardown: () => void }}
 */
export function installErrorProxy(dsn) {
  if (_installed) return { teardown: _noop };
  const parsed = parseDsn(dsn);
  if (!parsed) return { teardown: _noop };

  _dsn = dsn;
  _endpoint = new URL(parsed.storeUrl);
  _installed = true;

  const onError = (/** @type {ErrorEvent} */ e) => {
    if (e.error instanceof Error) captureError(e.error);
  };
  const onRejection = (/** @type {PromiseRejectionEvent} */ e) => {
    const err = e.reason instanceof Error ? e.reason : new Error(String(e.reason));
    captureError(err);
  };

  globalThis.addEventListener("error", onError);
  globalThis.addEventListener("unhandledrejection", onRejection);

  return {
    teardown() {
      globalThis.removeEventListener("error", onError);
      globalThis.removeEventListener("unhandledrejection", onRejection);
      _installed = false;
      _dsn = "";
      _endpoint = null;
    },
  };
}

/**
 * Check if error proxy is active.
 * @returns {boolean}
 */
export function isErrorProxyActive() {
  return _installed && _endpoint !== null;
}

// ── Internal helpers ────────────────────────────────────────────────────

function _noop() {}

function _uuid4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Parse a JS stack trace into Sentry-compatible frames.
 * @param {string} stack
 * @returns {Array<{ filename: string, lineno?: number, colno?: number, function?: string }>}
 */
function _parseStack(stack) {
  return stack
    .split("\n")
    .slice(1)
    .map((line) => {
      const match = line.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/);
      if (match) {
        return {
          function: match[1],
          filename: match[2],
          lineno: Number(match[3]),
          colno: Number(match[4]),
        };
      }
      const simpleMatch = line.match(/at\s+(.+):(\d+):(\d+)/);
      if (simpleMatch) {
        return {
          filename: simpleMatch[1],
          lineno: Number(simpleMatch[2]),
          colno: Number(simpleMatch[3]),
        };
      }
      return { filename: line.trim() };
    })
    .reverse(); // Sentry expects innermost frame first
}
