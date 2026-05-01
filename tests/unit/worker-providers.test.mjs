import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  openaiAdapter,
  anthropicAdapter,
  geminiAdapter,
  ollamaAdapter,
  ADAPTERS,
} from "../../worker/providers.js";

const realFetch = globalThis.fetch;

/**
 * @param {unknown} body
 * @param {number} [status]
 */
function ok(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe("worker providers", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("openaiAdapter parses chat-completions response", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      ok({ choices: [{ message: { content: "hi" } }] }),
    );
    const out = await openaiAdapter({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hello" }],
      apiKey: "sk-test",
    });
    expect(out).toEqual({ provider: "openai", model: "gpt-4o-mini", text: "hi" });
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toMatch(/openai\.com/);
    expect(init.headers.authorization).toBe("Bearer sk-test");
  });

  it("anthropicAdapter splits system message into top-level field", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      ok({ content: [{ type: "text", text: "ok" }] }),
    );
    const out = await anthropicAdapter({
      model: "claude-3-haiku",
      messages: [
        { role: "system", content: "be brief" },
        { role: "user", content: "hi" },
      ],
      apiKey: "sk-ant",
    });
    expect(out.text).toBe("ok");
    const init = globalThis.fetch.mock.calls[0][1];
    const body = JSON.parse(init.body);
    expect(body.system).toBe("be brief");
    expect(body.messages).toHaveLength(1);
    expect(init.headers["x-api-key"]).toBe("sk-ant");
  });

  it("geminiAdapter maps assistant→model role and joins parts", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      ok({ candidates: [{ content: { parts: [{ text: "a" }, { text: "b" }] } }] }),
    );
    const out = await geminiAdapter({
      model: "gemini-1.5-flash",
      messages: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "ignored" },
      ],
      apiKey: "key",
    });
    expect(out.text).toBe("ab");
    const url = globalThis.fetch.mock.calls[0][0];
    expect(url).toMatch(/key=key/);
    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    expect(body.contents[1].role).toBe("model");
  });

  it("ollamaAdapter ignores apiKey", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      ok({ choices: [{ message: { content: "local" } }] }),
    );
    const out = await ollamaAdapter({
      model: "llama3",
      messages: [{ role: "user", content: "hi" }],
      apiKey: "",
    });
    expect(out.text).toBe("local");
  });

  it("adapters throw on non-2xx", async () => {
    globalThis.fetch.mockResolvedValueOnce(ok({}, 401));
    await expect(
      openaiAdapter({ model: "m", messages: [], apiKey: "k" }),
    ).rejects.toThrow(/openai_401/);
  });

  it("registry exposes all four providers", () => {
    expect(Object.keys(ADAPTERS).sort()).toEqual([
      "anthropic",
      "gemini",
      "ollama",
      "openai",
    ]);
  });
});
