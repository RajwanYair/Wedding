/**
 * @vitest-environment happy-dom
 */
/* global ReadableStream */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { saveAiSettings, streamAi } from "../../src/utils/ai-client.js";


const realFetch = globalThis.fetch;

/** @param {string[]} chunks */
function sseStream(chunks) {
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(new TextEncoder().encode(chunks[i++]));
    },
  });
}

describe("streamAi (S566)", () => {
  beforeEach(() => {
    localStorage.clear();
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("yields decoded SSE chunks from the proxy", async () => {
    saveAiSettings({
      enabled: true,
      provider: "openai",
      apiKey: "k",
      model: "gpt-4o-mini",
      proxyUrl: "https://proxy.example.com",
    });
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: sseStream([
        'data: {"text":"hello "}\n',
        'data: {"text":"world"}\n',
        "data: [DONE]\n",
      ]),
    });
    const out = [];
    for await (const t of streamAi("hi")) out.push(t);
    expect(out.join("")).toBe("hello world");
    const url = globalThis.fetch.mock.calls[0][0];
    expect(url).toBe("https://proxy.example.com/ai/chat?stream=1");
  });

  it("rejects when AI is not enabled", async () => {
    saveAiSettings({ enabled: false });
    await expect(async () => {
      for await (const chunk of streamAi("hi")) {
        void chunk;
      }
    }).rejects.toThrow(/not enabled/);
  });

  it("preserves proxyUrl through saveAiSettings round-trip", () => {
    saveAiSettings({
      enabled: true,
      provider: "anthropic",
      apiKey: "a",
      model: "claude",
      proxyUrl: "https://x.y",
    });
    const raw = JSON.parse(localStorage.getItem("wedding_v1_ai_settings") ?? "{}");
    expect(raw.proxyUrl).toBe("https://x.y");
  });
});
