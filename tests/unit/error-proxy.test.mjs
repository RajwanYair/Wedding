/**
 * tests/unit/error-proxy.test.mjs — Sprint 156 GlitchTip error proxy
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  parseDsn,
  buildErrorPayload,
  captureProxyError as captureError,
  installErrorProxy,
  isErrorProxyActive,
} from "../../src/services/observability.js";

// Polyfill globalThis event methods for Node
if (!globalThis.addEventListener) {
  const _listeners = new Map();
  globalThis.addEventListener = (type, fn) => {
    if (!_listeners.has(type)) _listeners.set(type, new Set());
    _listeners.get(type).add(fn);
  };
  globalThis.removeEventListener = (type, fn) => {
    _listeners.get(type)?.delete(fn);
  };
}

describe("Error Proxy (Sprint 156)", () => {
  describe("parseDsn", () => {
    it("parses a valid DSN", () => {
      const result = parseDsn("https://abc123@glitchtip.example.com/1");
      expect(result).not.toBeNull();
      expect(result.key).toBe("abc123");
      expect(result.host).toBe("glitchtip.example.com");
      expect(result.projectId).toBe("1");
      expect(result.storeUrl).toContain("/api/1/store/");
      expect(result.storeUrl).toContain("sentry_key=abc123");
    });

    it("returns null for empty string", () => {
      expect(parseDsn("")).toBeNull();
    });

    it("returns null for invalid URL", () => {
      expect(parseDsn("not-a-url")).toBeNull();
    });

    it("returns null for missing project ID", () => {
      expect(parseDsn("https://key@host.com/")).toBeNull();
    });
  });

  describe("buildErrorPayload", () => {
    it("builds a minimal payload", () => {
      const error = new Error("test error");
      const payload = buildErrorPayload(error);
      expect(payload.platform).toBe("javascript");
      expect(payload.level).toBe("error");
      expect(payload.exception.values[0].type).toBe("Error");
      expect(payload.exception.values[0].value).toBe("test error");
    });

    it("includes custom tags", () => {
      const error = new Error("tagged");
      const payload = buildErrorPayload(error, { tags: { section: "dashboard" } });
      expect(payload.tags.section).toBe("dashboard");
    });

    it("includes extra context", () => {
      const error = new Error("extra");
      const payload = buildErrorPayload(error, { extra: { userId: "123" } });
      expect(payload.extra.userId).toBe("123");
    });

    it("generates a UUID event_id", () => {
      const payload = buildErrorPayload(new Error("uuid"));
      expect(payload.event_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
  });

  describe("captureError", () => {
    it("returns false when no DSN configured", async () => {
      const result = await captureError(new Error("no dsn"));
      expect(result).toBe(false);
    });
  });

  describe("installErrorProxy", () => {
    it("returns teardown for invalid DSN (no-op)", () => {
      const { teardown } = installErrorProxy("");
      expect(typeof teardown).toBe("function");
      expect(isErrorProxyActive()).toBe(false);
    });

    it("installs for valid DSN and tears down", () => {
      const { teardown } = installErrorProxy("https://key@host.com/1");
      expect(isErrorProxyActive()).toBe(true);
      teardown();
      expect(isErrorProxyActive()).toBe(false);
    });

    it("is idempotent when called twice before teardown", () => {
      const first = installErrorProxy("https://key@host.com/2");
      expect(isErrorProxyActive()).toBe(true);
      const second = installErrorProxy("https://key@host.com/3");
      // Second call should be no-op since already installed
      expect(isErrorProxyActive()).toBe(true);
      first.teardown();
      expect(isErrorProxyActive()).toBe(false);
    });
  });
});
