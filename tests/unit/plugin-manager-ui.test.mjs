/**
 * tests/unit/plugin-manager-ui.test.mjs — Sprint 141 plugin install/list UI
 */

import { describe, it, expect } from "vitest";
import {
  validatePluginManifest,
  manifestSchemaInfo,
} from "../../src/services/export.js";

describe("PluginManagerUI (Sprint 141)", () => {
  const validManifest = {
    id: "my-plugin",
    name: "My Plugin",
    version: "1.0.0",
    entry: "index.js",
    hooks: ["guest.created"],
    permissions: ["guests:read"],
  };

  describe("validatePluginManifest", () => {
    it("validates a correct manifest", () => {
      const result = validatePluginManifest(validManifest);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects non-object input", () => {
      const result = validatePluginManifest("string");
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("not_object");
    });

    it("rejects invalid id", () => {
      const result = validatePluginManifest({ ...validManifest, id: "A!" });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("invalid_id");
    });

    it("rejects missing name", () => {
      const result = validatePluginManifest({ ...validManifest, name: "" });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("missing_name");
    });

    it("rejects invalid version", () => {
      const result = validatePluginManifest({ ...validManifest, version: "abc" });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("invalid_version");
    });

    it("accepts semver with pre-release", () => {
      const result = validatePluginManifest({ ...validManifest, version: "1.0.0-beta.1" });
      expect(result.ok).toBe(true);
    });

    it("rejects non-JS entry", () => {
      const result = validatePluginManifest({ ...validManifest, entry: "main.py" });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("invalid_entry");
    });

    it("warns on unknown hooks", () => {
      const result = validatePluginManifest({ ...validManifest, hooks: ["custom.hook"] });
      expect(result.ok).toBe(true);
      expect(result.warnings).toContain("unknown_hook:custom.hook");
    });

    it("rejects unknown permissions", () => {
      const result = validatePluginManifest({ ...validManifest, permissions: ["admin:all"] });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("unknown_permission:admin:all");
    });

    it("rejects non-array hooks", () => {
      const result = validatePluginManifest({ ...validManifest, hooks: "not-array" });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("hooks_must_be_array");
    });
  });

  describe("manifestSchemaInfo", () => {
    it("returns known hooks and permissions", () => {
      const info = manifestSchemaInfo();
      expect(info.hooks).toContain("guest.created");
      expect(info.hooks).toContain("rsvp.submitted");
      expect(info.permissions).toContain("guests:read");
      expect(info.permissions).toContain("storage:write");
    });
  });
});
