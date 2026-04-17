/**
 * src/utils/api-client.js — Sprint 142
 *
 * Request factory: auth header injection, retry with exponential backoff, timeout.
 * No fetch polyfill needed (targets modern browsers + Node 21+ for tests).
 */

export { createApiClient };

/**
 * @typedef {{
 *   baseUrl: string,
 *   getToken?: () => string | null | Promise<string | null>,
 *   timeout?: number,
 *   retries?: number,
 *   retryDelay?: number,
 *   fetchImpl?: typeof fetch,
 * }} ApiClientOptions
 */

/**
 * Create a configured API client instance.
 * @param {ApiClientOptions} opts
 */
function createApiClient({
  baseUrl,
  getToken,
  timeout = 10_000,
  retries = 2,
  retryDelay = 300,
  fetchImpl = globalThis.fetch,
} = {}) {
  /**
   * Perform a request with retry + timeout.
   * @param {string} path
   * @param {RequestInit} [init]
   * @returns {Promise<Response>}
   */
  async function request(path, init = {}) {
    const url  = baseUrl ? `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}` : path;
    const token = getToken ? await getToken() : null;

    const headers = new Headers(init.headers ?? {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
      headers.set("Content-Type", "application/json");
    }

    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = timeout > 0
        ? setTimeout(() => controller.abort(), timeout)
        : null;

      try {
        const res = await fetchImpl(url, {
          ...init,
          headers,
          signal: controller.signal,
        });
        if (timer) clearTimeout(timer);
        return res;
      } catch (err) {
        if (timer) clearTimeout(timer);
        lastError = err;
        if (err?.name === "AbortError") break; // timeout / manual abort — don't retry
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, retryDelay * 2 ** attempt));
        }
      }
    }
    throw lastError;
  }

  return {
    get:    (path, init)        => request(path, { ...init, method: "GET" }),
    post:   (path, body, init)  => request(path, { ...init, method: "POST",  body: JSON.stringify(body) }),
    put:    (path, body, init)  => request(path, { ...init, method: "PUT",   body: JSON.stringify(body) }),
    patch:  (path, body, init)  => request(path, { ...init, method: "PATCH", body: JSON.stringify(body) }),
    delete: (path, init)        => request(path, { ...init, method: "DELETE" }),
    request,
  };
}
