/**
 * @owner edge
 * Provider router — selects an adapter based on the request body's
 * `provider` field.  Real adapters live in `./providers.js` (S565);
 * the `echo` adapter remains for tests.
 *
 * @typedef {{ model: string, messages: unknown, apiKey: string }} ProxyRequest
 * @typedef {{ text: string, model: string, provider: string }} ProxyResponse
 */

import { ADAPTERS as PROVIDER_ADAPTERS } from "./providers.js";

/**
 * @param {string} provider
 * @param {ProxyRequest} req
 * @returns {Promise<ProxyResponse>}
 */
export async function route(provider, req) {
  const adapter = ADAPTERS[provider];
  if (!adapter) {
    throw new Error(`unsupported_provider:${provider}`);
  }
  return adapter(req);
}

/**
 * Echo provider — returns the last user message verbatim.  Useful for
 * smoke tests that don't need network.
 * @type {(r: ProxyRequest) => Promise<ProxyResponse>}
 */
async function echoAdapter(req) {
  const last = Array.isArray(req.messages)
    ? /** @type {Array<{role?: string, content?: string}>} */ (req.messages)
        .filter((m) => m && m.role === "user")
        .at(-1)
    : null;
  return {
    provider: "echo",
    model: req.model,
    text: last?.content ?? "",
  };
}

/** @type {Record<string, (r: ProxyRequest) => Promise<ProxyResponse>>} */
const ADAPTERS = {
  echo: echoAdapter,
  ...PROVIDER_ADAPTERS,
};

/** @returns {string[]} */
export function listProviders() {
  return Object.keys(ADAPTERS);
}

/**
 * Test-only: register an adapter at runtime.  Not used in production code.
 * @param {string} name
 * @param {(r: ProxyRequest) => Promise<ProxyResponse>} fn
 */
export function _registerAdapter(name, fn) {
  ADAPTERS[name] = fn;
}
