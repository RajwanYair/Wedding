// tests/unit/plugin-sandbox.test.mjs — S630 plugin sandbox
import { describe, it, expect } from "vitest";
import {
  nextMessageId,
  createSandbox,
  hasPermission,
  buildInvokeMessage,
  buildResponseMessage,
  buildErrorMessage,
  terminateSandbox,
} from "../../src/utils/plugin-sandbox.js";

const validManifest = {
  id: "com.acme.test",
  name: "Test Plugin",
  version: "1.0.0",
  entry: "index.js",
  permissions: ["guests:read", "vendors:read"],
};

describe("plugin-sandbox", () => {
  describe("nextMessageId", () => {
    it("returns unique IDs", () => {
      const a = nextMessageId();
      const b = nextMessageId();
      expect(a).not.toBe(b);
      expect(a).toMatch(/^msg_/);
    });
  });

  describe("createSandbox", () => {
    it("creates sandbox from valid manifest", () => {
      const { ok, instance } = createSandbox(validManifest);
      expect(ok).toBe(true);
      expect(instance.pluginId).toBe("com.acme.test");
      expect(instance.state).toBe("idle");
      expect(instance.grants.has("guests:read")).toBe(true);
    });
    it("rejects null manifest", () => {
      const { ok, error } = createSandbox(null);
      expect(ok).toBe(false);
      expect(error).toMatch(/manifest/);
    });
    it("rejects disallowed scopes", () => {
      const m = { ...validManifest, permissions: ["guests:read", "admin:nuke"] };
      const { ok, error } = createSandbox(m);
      expect(ok).toBe(false);
      expect(error).toContain("admin:nuke");
    });
    it("rejects missing permissions array", () => {
      const m = { ...validManifest, permissions: undefined };
      expect(createSandbox(m).ok).toBe(false);
    });
  });

  describe("hasPermission", () => {
    it("grants read permission for list methods", () => {
      const { instance } = createSandbox(validManifest);
      expect(hasPermission(instance, "guests.list")).toBe(true);
      expect(hasPermission(instance, "guests.get")).toBe(true);
    });
    it("denies write permission when only read granted", () => {
      const { instance } = createSandbox(validManifest);
      expect(hasPermission(instance, "guests.add")).toBe(false);
    });
    it("denies unscoped namespaces", () => {
      const { instance } = createSandbox(validManifest);
      expect(hasPermission(instance, "settings.update")).toBe(false);
    });
    it("handles null instance", () => {
      expect(hasPermission(null, "guests.list")).toBe(false);
    });
    it("handles empty method", () => {
      const { instance } = createSandbox(validManifest);
      expect(hasPermission(instance, "")).toBe(false);
    });
  });

  describe("message builders", () => {
    it("buildInvokeMessage creates invoke envelope", () => {
      const msg = buildInvokeMessage("guests.list", { limit: 10 });
      expect(msg.type).toBe("invoke");
      expect(msg.method).toBe("guests.list");
      expect(msg.payload).toEqual({ limit: 10 });
    });
    it("buildResponseMessage creates response", () => {
      const msg = buildResponseMessage("id123", [1, 2, 3]);
      expect(msg.type).toBe("response");
      expect(msg.id).toBe("id123");
    });
    it("buildErrorMessage creates error", () => {
      const msg = buildErrorMessage("id456", "permission denied");
      expect(msg.type).toBe("error");
      expect(msg.payload).toBe("permission denied");
    });
  });

  describe("terminateSandbox", () => {
    it("sets state to terminated", () => {
      const { instance } = createSandbox(validManifest);
      const term = terminateSandbox(instance);
      expect(term.state).toBe("terminated");
      expect(instance.state).toBe("idle"); // immutable
    });
    it("handles null", () => {
      expect(terminateSandbox(null)).toBeNull();
    });
  });
});
