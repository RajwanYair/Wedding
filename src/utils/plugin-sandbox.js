/**
 * src/utils/plugin-sandbox.js — S630 Plugin sandbox runtime
 *
 * Provides a MessageChannel-based sandbox model for running untrusted
 * plugin code. In production this will use a Web Worker or sandboxed
 * iframe; this module provides the protocol layer — message envelope
 * creation, permission checking, and response handling.
 *
 * @module plugin-sandbox
 * @owner platform
 */

import { listScopes } from "./plugin-manifest.js";

/**
 * @typedef {import('./plugin-manifest.js').PluginScope} PluginScope
 * @typedef {import('./plugin-manifest.js').PluginManifest} PluginManifest
 */

/**
 * @typedef {object} SandboxMessage
 * @property {string}  type       // "invoke" | "response" | "event" | "error"
 * @property {string}  id         // correlation ID
 * @property {string}  method     // API method name (e.g. "guests:read")
 * @property {unknown=} payload
 */

/**
 * @typedef {object} SandboxInstance
 * @property {string}  pluginId
 * @property {ReadonlySet<PluginScope>} grants
 * @property {"idle"|"running"|"terminated"} state
 * @property {string}  createdAt
 */

let _counter = 0;

/**
 * Generate a correlation ID for sandbox messages.
 *
 * @returns {string}
 */
export function nextMessageId() {
  return `msg_${(++_counter).toString(36)}_${Date.now().toString(36)}`;
}

/**
 * Create a sandbox instance descriptor from a validated manifest.
 *
 * @param {PluginManifest} manifest
 * @returns {{ ok: boolean, instance?: SandboxInstance, error?: string }}
 */
export function createSandbox(manifest) {
  if (!manifest?.id) return { ok: false, error: "manifest with id is required" };
  if (!Array.isArray(manifest.permissions)) {
    return { ok: false, error: "manifest.permissions must be an array" };
  }
  const allowed = new Set(listScopes());
  const invalid = manifest.permissions.filter((p) => !allowed.has(p));
  if (invalid.length > 0) {
    return { ok: false, error: `disallowed scopes: ${invalid.join(", ")}` };
  }
  return {
    ok: true,
    instance: {
      pluginId: manifest.id,
      grants: new Set(manifest.permissions),
      state: "idle",
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * Check whether a sandbox instance has permission for a given method.
 *
 * @param {SandboxInstance} instance
 * @param {string} method
 * @returns {boolean}
 */
export function hasPermission(instance, method) {
  if (!instance?.grants) return false;
  // Method maps to scope: "guests.list" → "guests:read", "guests.add" → "guests:write"
  const [ns, action] = method.split(".");
  if (!ns) return false;
  const scope = action === "list" || action === "get" || action === "count"
    ? `${ns}:read`
    : `${ns}:write`;
  return instance.grants.has(/** @type {PluginScope} */ (scope));
}

/**
 * Build an invoke message envelope.
 *
 * @param {string} method
 * @param {unknown} [payload]
 * @returns {SandboxMessage}
 */
export function buildInvokeMessage(method, payload) {
  return { type: "invoke", id: nextMessageId(), method, payload };
}

/**
 * Build a response message envelope.
 *
 * @param {string} correlationId
 * @param {unknown} payload
 * @returns {SandboxMessage}
 */
export function buildResponseMessage(correlationId, payload) {
  return { type: "response", id: correlationId, method: "", payload };
}

/**
 * Build an error message envelope.
 *
 * @param {string} correlationId
 * @param {string} errorText
 * @returns {SandboxMessage}
 */
export function buildErrorMessage(correlationId, errorText) {
  return { type: "error", id: correlationId, method: "", payload: errorText };
}

/**
 * Terminate a sandbox instance (set state to terminated).
 *
 * @param {SandboxInstance} instance
 * @returns {SandboxInstance}
 */
export function terminateSandbox(instance) {
  if (!instance) return instance;
  return { ...instance, state: "terminated" };
}
