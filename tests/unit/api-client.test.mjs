/**
 * tests/unit/api-client.test.mjs — Sprint 142
 */

import { describe, it, expect, vi } from "vitest";
import { createApiClient } from "../../src/utils/api-client.js";

function makeFetch(status = 200, body = {}) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

describe("createApiClient", () => {
  it("performs GET request", async () => {
    const fetchMock = makeFetch(200, { ok: true });
    const client = createApiClient({ baseUrl: "https://api.test", fetchImpl: fetchMock });
    const res = await client.get("/guests");
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/guests",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("injects Authorization header when getToken provided", async () => {
    const fetchMock = makeFetch(200);
    const client = createApiClient({
      baseUrl: "https://api.test",
      getToken: () => "my-token",
      fetchImpl: fetchMock,
    });
    await client.get("/protected");
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.get("Authorization")).toBe("Bearer my-token");
  });

  it("performs POST with JSON body", async () => {
    const fetchMock = makeFetch(201);
    const client = createApiClient({ baseUrl: "https://api.test", fetchImpl: fetchMock });
    await client.post("/guests", { name: "Alice" });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ name: "Alice" }));
  });

  it("retries on network error", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce({ ok: true, status: 200 });
    const client = createApiClient({
      baseUrl: "https://api.test",
      retries: 1,
      retryDelay: 0,
      fetchImpl: fetchMock,
    });
    const res = await client.get("/retry");
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting retries", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("down"));
    const client = createApiClient({
      baseUrl: "https://api.test",
      retries: 1,
      retryDelay: 0,
      fetchImpl: fetchMock,
    });
    await expect(client.get("/fail")).rejects.toThrow("down");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry on AbortError (timeout)", async () => {
    const abortErr = Object.assign(new Error("abort"), { name: "AbortError" });
    const fetchMock = vi.fn().mockRejectedValue(abortErr);
    const client = createApiClient({
      baseUrl: "https://api.test",
      retries: 2,
      timeout: 0, // disable real timeout; error is thrown by mock
      fetchImpl: fetchMock,
    });
    await expect(client.get("/timeout")).rejects.toThrow("abort");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
