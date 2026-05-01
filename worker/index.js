/**
 * @owner edge
 * Cloudflare Worker — AI edge proxy (S564 scaffold).
 *
 * Receives `POST /ai/chat` with `{ provider, model, messages }` and routes
 * to the configured provider via the adapters in `./providers/`.  This
 * scaffold ships only the router; adapters land in S565 and streaming
 * + BYO-key UI lands in S566.
 *
 * Deployment: `wrangler deploy` (config in `worker/wrangler.toml`).
 * The Worker is OPTIONAL — the app falls back to direct provider calls
 * when no proxy URL is configured (see `src/utils/ai-client.js`).
 *
 * Security: the Worker NEVER stores keys.  It accepts the user's BYO
 * key via the `Authorization: Bearer <key>` header, forwards it once,
 * and discards.  Rate limiting is delegated to Cloudflare's built-in
 * Bot Fight Mode.
 */

import { route } from "./router.js";

export default {
  /**
   * @param {Request} request
   * @param {Record<string, string>} env
   * @returns {Promise<Response>}
   */
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight.
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(env, request),
      });
    }

    if (url.pathname === "/health") {
      return json({ ok: true, ts: Date.now() }, env, request);
    }

    if (url.pathname !== "/ai/chat" || request.method !== "POST") {
      return json({ error: "not_found" }, env, request, 404);
    }

    /** @type {{provider?: string, model?: string, messages?: unknown}} */
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid_json" }, env, request, 400);
    }

    const provider = String(body.provider ?? "");
    const model = String(body.model ?? "");
    const messages = Array.isArray(body.messages) ? body.messages : null;
    if (!provider || !model || !messages) {
      return json({ error: "missing_fields" }, env, request, 400);
    }

    const auth = request.headers.get("authorization") ?? "";
    if (!/^Bearer\s+\S+/i.test(auth)) {
      return json({ error: "missing_auth" }, env, request, 401);
    }

    try {
      const result = await route(provider, {
        model,
        messages,
        apiKey: auth.replace(/^Bearer\s+/i, ""),
      });
      // Streaming branch: emit a single SSE event with the full text.
      // True provider-side streaming lives behind each adapter (S566+).
      if (url.searchParams.get("stream") === "1") {
        const sse = `data: ${JSON.stringify({ text: result.text })}

data: [DONE]

`;
        return new Response(sse, {
          status: 200,
          headers: {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache",
            ...corsHeaders(env, request),
          },
        });
      }
      return json(result, env, request);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "proxy_error";
      return json({ error: msg }, env, request, 502);
    }
  },
};

/**
 * @param {Record<string, string>} env
 * @param {Request} request
 * @returns {Record<string, string>}
 */
function corsHeaders(env, request) {
  const origin = request.headers.get("origin") ?? "";
  const allow = (env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim());
  const allowOrigin = allow.includes(origin) ? origin : allow[0] ?? "*";
  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

/**
 * @param {unknown} body
 * @param {Record<string, string>} env
 * @param {Request} request
 * @param {number} [status]
 * @returns {Response}
 */
function json(body, env, request, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(env, request),
    },
  });
}
