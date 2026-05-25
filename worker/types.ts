/**
 * @owner edge
 * Shared types for the AI edge proxy.  Imported by `router.js` and
 * `providers.js` via JSDoc `import("./types.js")` typedefs.  Compiled
 * via `worker/tsconfig.json` with `noEmit: true` — no runtime code.
 */

/** A single chat turn. */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Normalised request shape passed to every adapter. */
export interface ProxyRequest {
  model: string;
  messages: ChatMessage[];
  apiKey: string;
}

/** Normalised response shape returned by every adapter. */
export interface ProxyResponse {
  provider: string;
  model: string;
  text: string;
}

/** Adapter signature: takes a normalised request, returns a normalised response. */
export type Adapter = (req: ProxyRequest) => Promise<ProxyResponse>;

/** Cloudflare Worker environment bindings (declared in wrangler.toml). */
export interface WorkerEnv {
  ALLOWED_ORIGINS?: string;
  /** Base URL of the self-hosted Ollama instance (no trailing slash). */
  OLLAMA_ORIGIN?: string;
  /** Per-request timeout in milliseconds (default: 30000). */
  REQUEST_TIMEOUT_MS?: string;
}
