import { describe, it, expect } from "vitest";
import {
  parseSseLine,
  parseSseBody,
  concatChunks,
  estimateTokens,
  exceedsTokenLimit,
  createAbortable,
  normalizeChunk,
  buildStreamHeaders,
  streamSummary,
} from "../../src/utils/ai-streaming.js";

describe("ai-streaming", () => {
  describe("parseSseLine", () => {
    it("parses OpenAI-style data line", () => {
      const line = 'data: {"choices":[{"delta":{"content":"Hello"}}]}';
      const chunk = parseSseLine(line);
      expect(chunk.text).toBe("Hello");
      expect(chunk.done).toBe(false);
    });

    it("parses [DONE] signal", () => {
      const chunk = parseSseLine("data: [DONE]");
      expect(chunk.done).toBe(true);
    });

    it("returns null for non-data lines", () => {
      expect(parseSseLine("event: message")).toBeNull();
      expect(parseSseLine("")).toBeNull();
      expect(parseSseLine(null)).toBeNull();
    });

    it("handles Anthropic delta format", () => {
      const line = 'data: {"delta":{"text":"World"}}';
      expect(parseSseLine(line).text).toBe("World");
    });

    it("falls back to raw payload for non-JSON", () => {
      expect(parseSseLine("data: plain text").text).toBe("plain text");
    });
  });

  describe("parseSseBody", () => {
    it("parses multi-line SSE body", () => {
      const body = 'data: {"choices":[{"delta":{"content":"A"}}]}\ndata: {"choices":[{"delta":{"content":"B"}}]}\ndata: [DONE]';
      const chunks = parseSseBody(body);
      expect(chunks).toHaveLength(3);
      expect(chunks[0].text).toBe("A");
      expect(chunks[2].done).toBe(true);
    });

    it("returns empty for null input", () => {
      expect(parseSseBody(null)).toEqual([]);
    });
  });

  describe("concatChunks", () => {
    it("concatenates text from chunks", () => {
      const chunks = [{ text: "Hello" }, { text: " " }, { text: "World" }];
      expect(concatChunks(chunks)).toBe("Hello World");
    });

    it("returns empty for non-array", () => {
      expect(concatChunks(null)).toBe("");
    });
  });

  describe("estimateTokens", () => {
    it("estimates tokens at ~4 chars per token", () => {
      expect(estimateTokens("Hello World!")).toBe(3);
    });

    it("returns 0 for empty input", () => {
      expect(estimateTokens("")).toBe(0);
      expect(estimateTokens(null)).toBe(0);
    });
  });

  describe("exceedsTokenLimit", () => {
    it("returns false within limits", () => {
      expect(exceedsTokenLimit(1000, "openai")).toBe(false);
    });

    it("returns true exceeding limits", () => {
      expect(exceedsTokenLimit(200001, "anthropic")).toBe(true);
    });

    it("uses default for unknown provider", () => {
      expect(exceedsTokenLimit(33000, "unknown")).toBe(true);
    });
  });

  describe("createAbortable", () => {
    it("creates an abort controller with timeout", () => {
      const ab = createAbortable(5000);
      expect(ab.signal).toBeTruthy();
      expect(ab.timeoutMs).toBe(5000);
      expect(typeof ab.abort).toBe("function");
    });

    it("defaults to 30s for invalid timeout", () => {
      expect(createAbortable(-1).timeoutMs).toBe(30000);
      expect(createAbortable(0).timeoutMs).toBe(30000);
    });
  });

  describe("normalizeChunk", () => {
    it("normalizes OpenAI chunk", () => {
      const raw = { choices: [{ delta: { content: "Hi" }, finish_reason: null }] };
      const chunk = normalizeChunk(raw, "openai");
      expect(chunk.text).toBe("Hi");
      expect(chunk.done).toBe(false);
      expect(chunk.provider).toBe("openai");
    });

    it("normalizes Anthropic chunk", () => {
      const raw = { delta: { text: "Bonjour" }, type: "content_block_delta" };
      expect(normalizeChunk(raw, "anthropic").text).toBe("Bonjour");
    });

    it("normalizes Gemini chunk", () => {
      const raw = { candidates: [{ content: { parts: [{ text: "Shalom" }] }, finishReason: "STOP" }] };
      const chunk = normalizeChunk(raw, "gemini");
      expect(chunk.text).toBe("Shalom");
      expect(chunk.done).toBe(true);
    });

    it("normalizes Ollama chunk", () => {
      const raw = { message: { content: "Local" }, done: true };
      const chunk = normalizeChunk(raw, "ollama");
      expect(chunk.text).toBe("Local");
      expect(chunk.done).toBe(true);
    });

    it("handles null input", () => {
      expect(normalizeChunk(null, "openai").text).toBe("");
    });
  });

  describe("buildStreamHeaders", () => {
    it("builds OpenAI headers with Bearer token", () => {
      const h = buildStreamHeaders("openai", "sk-test");
      expect(h["authorization"]).toBe("Bearer sk-test");
    });

    it("builds Anthropic headers with x-api-key", () => {
      const h = buildStreamHeaders("anthropic", "ant-key");
      expect(h["x-api-key"]).toBe("ant-key");
      expect(h["anthropic-version"]).toBe("2023-06-01");
    });

    it("builds Gemini headers", () => {
      const h = buildStreamHeaders("gemini", "gem-key");
      expect(h["x-goog-api-key"]).toBe("gem-key");
    });
  });

  describe("streamSummary", () => {
    it("summarizes streaming session", () => {
      const chunks = [
        { text: "Hello ", done: false },
        { text: "World", done: false },
        { text: "", done: true },
      ];
      const summary = streamSummary(chunks);
      expect(summary.totalChunks).toBe(3);
      expect(summary.totalText).toBe("Hello World");
      expect(summary.done).toBe(true);
      expect(summary.estimatedTokens).toBeGreaterThan(0);
    });

    it("returns defaults for non-array", () => {
      expect(streamSummary(null)).toEqual({ totalChunks: 0, totalText: "", estimatedTokens: 0, done: false });
    });
  });
});
