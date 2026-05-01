/**
 * src/utils/ai-client.js — S449: BYO-key AI client utility
 *
 * Supports OpenAI-compatible endpoints (OpenAI, Anthropic via proxy, Ollama local).
 * All keys stored in localStorage; never sent to any first-party server.
 *
 * Exports:
 *   saveAiSettings(opts)     → void  (persists to localStorage)
 *   askAi(prompt, opts?)     → Promise<string>  (calls the API, returns text)
 *   testAiConnection()       → Promise<{ ok: boolean, message: string }>
 */

const STORAGE_KEY = "wedding_v1_ai_settings";

/** @typedef {{ provider: string, apiKey: string, model: string, enabled: boolean }} AiSettings */

const PROVIDER_ENDPOINTS = {
  openai: "https://api.openai.com/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
  ollama: "http://localhost:11434/v1/chat/completions",
};

const DEFAULT_MODELS = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-haiku-20240307",
  ollama: "llama3",
};

/**
 * Return persisted AI settings (or safe defaults).
 * @returns {AiSettings}
 */
function getAiSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        provider: parsed.provider ?? "openai",
        apiKey: parsed.apiKey ?? "",
        model: parsed.model ?? "",
        enabled: parsed.enabled ?? false,
      };
    }
  } catch {
    /* storage disabled or corrupt */
  }
  return { provider: "openai", apiKey: "", model: "", enabled: false };
}

/**
 * Persist AI settings to localStorage.
 * @param {Partial<AiSettings>} opts
 */
export function saveAiSettings(opts) {
  const current = getAiSettings();
  const next = {
    provider: opts.provider ?? current.provider,
    apiKey: opts.apiKey ?? current.apiKey,
    model: opts.model ?? current.model,
    enabled: opts.enabled ?? current.enabled,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage disabled */
  }
}

/**
 * Build the fetch request body for the given provider.
 * @param {string} provider
 * @param {string} model
 * @param {string} prompt
 * @param {string} [system]
 * @returns {string}
 */
function _buildBody(provider, model, prompt, system) {
  if (provider === "anthropic") {
    return JSON.stringify({
      model,
      max_tokens: 1024,
      system: system ?? "You are a helpful wedding planning assistant.",
      messages: [{ role: "user", content: prompt }],
    });
  }
  // OpenAI-compatible (openai + ollama)
  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });
  return JSON.stringify({ model, messages, max_tokens: 1024 });
}

/**
 * Build fetch headers for the given provider.
 * @param {string} provider
 * @param {string} apiKey
 * @returns {Record<string, string>}
 */
function _buildHeaders(provider, apiKey) {
  /** @type {Record<string, string>} */
  const headers = { "Content-Type": "application/json" };
  if (provider === "anthropic") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
}

/**
 * Extract the response text from an OpenAI-compatible or Anthropic response body.
 * @param {string} provider
 * @param {unknown} json
 * @returns {string}
 */
function _extractText(provider, json) {
  if (!json || typeof json !== "object") return "";
  const j = /** @type {any} */ (json);
  if (provider === "anthropic") {
    return j?.content?.[0]?.text ?? "";
  }
  return j?.choices?.[0]?.message?.content ?? "";
}

/**
 * Send a prompt to the configured AI provider and return the response text.
 * @param {string} prompt
 * @param {{ system?: string }} [opts]
 * @returns {Promise<string>}
 */
export async function askAi(prompt, opts = {}) {
  const { provider, apiKey, model, enabled } = getAiSettings();
  if (!enabled) throw new Error("AI assistant is not enabled.");
  const endpoint = PROVIDER_ENDPOINTS[provider] ?? PROVIDER_ENDPOINTS.openai;
  const resolvedModel = model || DEFAULT_MODELS[provider] || "gpt-4o-mini";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: _buildHeaders(provider, apiKey),
    body: _buildBody(provider, resolvedModel, prompt, opts.system),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => String(res.status));
    throw new Error(`AI error ${res.status}: ${errText.slice(0, 200)}`);
  }
  const json = await res.json();
  return _extractText(provider, json);
}

/**
 * Test the current AI connection with a minimal prompt.
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
export async function testAiConnection() {
  const { apiKey, enabled } = getAiSettings();
  if (!enabled || !apiKey) {
    return { ok: false, message: "no_key" };
  }
  try {
    await askAi("Reply with the single word: ok", {});
    return { ok: true, message: "ok" };
  } catch (err) {
    const msg = err instanceof Error ? err.message.slice(0, 100) : String(err);
    return { ok: false, message: msg };
  }
}
