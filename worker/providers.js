/**
 * @owner edge
 * Provider adapters for the AI edge proxy.  Each adapter accepts a
 * normalised `ProxyRequest` ({ model, messages, apiKey, ollamaOrigin?, timeoutMs? })
 * and returns a normalised `ProxyResponse` ({ provider, model, text }).
 *
 * S684: Ollama URL is now configurable via `OLLAMA_ORIGIN` env var.
 *
 * @typedef {{ model: string, messages: Array<{role: string, content: string}>, apiKey: string, ollamaOrigin?: string, timeoutMs?: number }} ProxyRequest
 * @typedef {{ provider: string, model: string, text: string }} ProxyResponse
 */

const ENDPOINTS = {
  openai: "https://api.openai.com/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
  gemini: "https://generativelanguage.googleapis.com/v1beta/models",
};

/**
 * Create an AbortSignal that times out after `ms` milliseconds (or 30s default).
 * @param {number} [ms]
 * @returns {AbortSignal}
 */
function _timeout(ms = 30_000) {
  return AbortSignal.timeout(ms);
}

/**
 * @param {ProxyRequest} req
 * @returns {Promise<ProxyResponse>}
 */
export async function openaiAdapter(req) {
  const r = await fetch(ENDPOINTS.openai, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${req.apiKey}`,
    },
    body: JSON.stringify({
      model: req.model,
      messages: req.messages,
    }),
    signal: _timeout(req.timeoutMs),
  });
  if (!r.ok) throw new Error(`openai_${r.status}`);
  /** @type {{choices?: Array<{message?: {content?: string}}>}} */
  const data = await r.json();
  return {
    provider: "openai",
    model: req.model,
    text: data.choices?.[0]?.message?.content ?? "",
  };
}

/**
 * @param {ProxyRequest} req
 * @returns {Promise<ProxyResponse>}
 */
export async function anthropicAdapter(req) {
  // Anthropic Messages API requires `system` to be a top-level field.
  const system = req.messages.find((m) => m.role === "system")?.content ?? "";
  const messages = req.messages.filter((m) => m.role !== "system");
  const r = await fetch(ENDPOINTS.anthropic, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": req.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: req.model,
      max_tokens: 1024,
      system,
      messages,
    }),
    signal: _timeout(req.timeoutMs),
  });
  if (!r.ok) throw new Error(`anthropic_${r.status}`);
  /** @type {{content?: Array<{type?: string, text?: string}>}} */
  const data = await r.json();
  const text = (data.content ?? [])
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("");
  return { provider: "anthropic", model: req.model, text };
}

/**
 * @param {ProxyRequest} req
 * @returns {Promise<ProxyResponse>}
 */
export async function geminiAdapter(req) {
  const url = `${ENDPOINTS.gemini}/${encodeURIComponent(req.model)}:generateContent?key=${encodeURIComponent(req.apiKey)}`;
  // Strip system role — Gemini uses a separate systemInstruction field
  const contents = req.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  const system = req.messages.find((m) => m.role === "system")?.content;
  const body = system ? { contents, systemInstruction: { parts: [{ text: system }] } } : { contents };
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: _timeout(req.timeoutMs),
  });
  if (!r.ok) throw new Error(`gemini_${r.status}`);
  /** @type {{candidates?: Array<{content?: {parts?: Array<{text?: string}>}}>}} */
  const data = await r.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return {
    provider: "gemini",
    model: req.model,
    text: parts.map((p) => p.text ?? "").join(""),
  };
}

/**
 * @param {ProxyRequest} req
 * @returns {Promise<ProxyResponse>}
 */
export async function ollamaAdapter(req) {
  // Ollama exposes an OpenAI-compatible endpoint.  apiKey is ignored.
  // S684: OLLAMA_ORIGIN is passed via req.ollamaOrigin (from Worker env).
  const origin = (req.ollamaOrigin ?? "http://localhost:11434").replace(/\/$/, "");
  const url = `${origin}/v1/chat/completions`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: req.model, messages: req.messages }),
    signal: _timeout(req.timeoutMs),
  });
  if (!r.ok) throw new Error(`ollama_${r.status}`);
  /** @type {{choices?: Array<{message?: {content?: string}}>}} */
  const data = await r.json();
  return {
    provider: "ollama",
    model: req.model,
    text: data.choices?.[0]?.message?.content ?? "",
  };
}

/** @type {Record<string, (r: ProxyRequest) => Promise<ProxyResponse>>} */
export const ADAPTERS = {
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  gemini: geminiAdapter,
  ollama: ollamaAdapter,
};
