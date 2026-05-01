/**
 * @owner edge
 * Provider adapters for the AI edge proxy.  Each adapter accepts a
 * normalised `ProxyRequest` ({ model, messages, apiKey }) and returns a
 * normalised `ProxyResponse` ({ provider, model, text }).
 *
 * Streaming lands in S566; this module does request/response only.
 *
 * @typedef {{ model: string, messages: Array<{role: string, content: string}>, apiKey: string }} ProxyRequest
 * @typedef {{ provider: string, model: string, text: string }} ProxyResponse
 */

const ENDPOINTS = {
  openai: "https://api.openai.com/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
  gemini: "https://generativelanguage.googleapis.com/v1beta/models",
  ollama: "http://localhost:11434/v1/chat/completions",
};

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
  const contents = req.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents }),
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
  const r = await fetch(ENDPOINTS.ollama, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: req.model, messages: req.messages }),
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
