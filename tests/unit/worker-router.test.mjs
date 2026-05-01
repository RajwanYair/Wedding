import { describe, it, expect } from "vitest";
import { route, listProviders, _registerAdapter } from "../../worker/router.js";

describe("worker router", () => {
  it("lists default providers", () => {
    const providers = listProviders();
    expect(providers).toContain("echo");
  });

  it("echo adapter returns last user message", async () => {
    const out = await route("echo", {
      model: "test-model",
      messages: [
        { role: "system", content: "ignored" },
        { role: "user", content: "hello" },
        { role: "assistant", content: "ignored too" },
        { role: "user", content: "second" },
      ],
      apiKey: "key",
    });
    expect(out).toEqual({ provider: "echo", model: "test-model", text: "second" });
  });

  it("rejects unknown providers", async () => {
    await expect(route("nope", { model: "m", messages: [], apiKey: "k" })).rejects.toThrow(
      /unsupported_provider/,
    );
  });

  it("supports registering adapters at runtime", async () => {
    _registerAdapter("static", async () => ({
      provider: "static",
      model: "m",
      text: "ok",
    }));
    const out = await route("static", { model: "m", messages: [], apiKey: "k" });
    expect(out.text).toBe("ok");
  });
});
