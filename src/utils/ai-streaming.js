/**
 * src/utils/ai-streaming.js — S653 SSE streaming + multi-provider helpers
 *
 * Pure helpers for parsing Server-Sent Events (SSE) streams,
 * estimating token counts, managing abort signals, and normalizing
 * multi-provider streaming responses.
 *
 * @module ai-streaming
 * @owner ai
 */

/**
 * @typedef {object} StreamChunk
 * @property {string} text
 * @property {boolean} done
 * @property {string} [provider]
 * @property {number} [tokenCount]
 */

/**
 * Parse a single SSE data line into a chunk.
 * Handles `data: [DONE]` and `data: {...}` formats.
 *
 * @param {string} line
 * @returns {StreamChunk|null}
 */
export function parseSseLine(line) {
  if (!line || typeof line !== "string") return null;
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;

  const payload = trimmed.slice(5).trim();
  if (payload === "[DONE]") return { text: "", done: true };

  try {
    const obj = JSON.parse(payload);
    const text = obj.choices?.[0]?.delta?.content
      ?? obj.delta?.text
      ?? obj.candidates?.[0]?.content?.parts?.[0]?.text
      ?? obj.message?.content
      ?? "";
    return { text, done: false };
  } catch {
    return { text: payload, done: false };
  }
}

/**
 * Parse a full SSE response body into an array of chunks.
 *
 * @param {string} body
 * @returns {StreamChunk[]}
 */
export function parseSseBody(body) {
  if (!body || typeof body !== "string") return [];
  return body
    .split(/\r?\n/)
    .map(parseSseLine)
    .filter((c) => c !== null);
}

/**
 * Concatenate text from all chunks.
 *
 * @param {StreamChunk[]} chunks
 * @returns {string}
 */
export function concatChunks(chunks) {
  if (!Array.isArray(chunks)) return "";
  return chunks.map((c) => c.text).join("");
}

/**
 * Estimate token count for a string (rough: ~4 chars per token for English).
 *
 * @param {string} text
 * @returns {number}
 */
export function estimateTokens(text) {
  if (!text || typeof text !== "string") return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Check if a token count exceeds the provider's limit.
 *
 * @param {number} tokenCount
 * @param {string} provider - "openai"|"anthropic"|"gemini"|"ollama"
 * @returns {boolean}
 */
export function exceedsTokenLimit(tokenCount, provider) {
  const limits = { openai: 128000, anthropic: 200000, gemini: 1000000, ollama: 32000 };
  const limit = limits[provider] ?? 32000;
  return tokenCount > limit;
}

/**
 * Create an abort controller wrapper with timeout.
 *
 * @param {number} timeoutMs
 * @returns {{ signal: AbortSignal, abort: () => void, timeoutMs: number }}
 */
export function createAbortable(timeoutMs) {
  const controller = new AbortController();
  const ms = typeof timeoutMs === "number" && timeoutMs > 0 ? timeoutMs : 30000;
  return { signal: controller.signal, abort: () => controller.abort(), timeoutMs: ms };
}

/**
 * Normalize a provider-specific streaming response format.
 *
 * @param {Record<string, unknown>} raw
 * @param {"openai"|"anthropic"|"gemini"|"ollama"} provider
 * @returns {StreamChunk}
 */
export function normalizeChunk(raw, provider) {
  if (!raw || typeof raw !== "object") return { text: "", done: false, provider };

  switch (provider) {
    case "openai":
      return {
        text: String(raw.choices?.[0]?.delta?.content ?? ""),
        done: raw.choices?.[0]?.finish_reason === "stop",
        provider,
      };
    case "anthropic":
      return {
        text: String(raw.delta?.text ?? ""),
        done: raw.type === "message_stop",
        provider,
      };
    case "gemini":
      return {
        text: String(raw.candidates?.[0]?.content?.parts?.[0]?.text ?? ""),
        done: raw.candidates?.[0]?.finishReason === "STOP",
        provider,
      };
    case "ollama":
      return {
        text: String(raw.message?.content ?? ""),
        done: raw.done === true,
        provider,
      };
    default:
      return { text: "", done: false, provider };
  }
}

/**
 * Build streaming request headers for a provider.
 *
 * @param {"openai"|"anthropic"|"gemini"|"ollama"} provider
 * @param {string} apiKey
 * @returns {Record<string, string>}
 */
export function buildStreamHeaders(provider, apiKey) {
  const headers = { "content-type": "application/json" };
  switch (provider) {
    case "openai":
      headers["authorization"] = `Bearer ${apiKey}`;
      break;
    case "anthropic":
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      break;
    case "gemini":
      headers["x-goog-api-key"] = apiKey;
      break;
    case "ollama":
      if (apiKey) headers["authorization"] = `Bearer ${apiKey}`;
      break;
  }
  return headers;
}

/**
 * Summarize streaming session.
 *
 * @param {StreamChunk[]} chunks
 * @returns {{ totalChunks: number, totalText: string, estimatedTokens: number, done: boolean }}
 */
export function streamSummary(chunks) {
  if (!Array.isArray(chunks)) return { totalChunks: 0, totalText: "", estimatedTokens: 0, done: false };
  const totalText = concatChunks(chunks);
  return {
    totalChunks: chunks.length,
    totalText,
    estimatedTokens: estimateTokens(totalText),
    done: chunks.some((c) => c.done),
  };
}
