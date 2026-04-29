/**
 * tests/unit/plugin-manifest.test.mjs — S133 plugin.json validator.
 */
import { describe, it, expect } from "vitest";
import {
  validatePluginManifest,
  manifestSchemaInfo,
} from "../../src/services/export.js";

const VALID = {
  id: "rsvp-extras",
  name: "RSVP Extras",
  version: "1.2.0",
  entry: "index.js",
  author: "Yair",
  homepage: "https://example.com",
  hooks: ["rsvp.submitted", "guest.created"],
  permissions: ["guests:read", "messages:send"],
};

describe("S133 — plugin-manifest", () => {
  it("accepts a fully-valid manifest", () => {
    const r = validatePluginManifest(VALID);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("rejects non-object input", () => {
    expect(validatePluginManifest(null).ok).toBe(false);
    expect(validatePluginManifest("nope").ok).toBe(false);
  });

  it("requires id matching slug regex", () => {
    const r = validatePluginManifest({ ...VALID, id: "BAD ID!" });
    expect(r.errors).toContain("invalid_id");
  });

  it("requires semver version + .js entry", () => {
    const r = validatePluginManifest({ ...VALID, version: "v1", entry: "index.ts" });
    expect(r.errors).toContain("invalid_version");
    expect(r.errors).toContain("invalid_entry");
  });

  it("rejects unknown permission strings as hard errors", () => {
    const r = validatePluginManifest({
      ...VALID,
      permissions: ["guests:read", "filesystem:rw"],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.startsWith("unknown_permission:"))).toBe(true);
  });

  it("warns (but does not reject) on unknown hooks", () => {
    const r = validatePluginManifest({ ...VALID, hooks: ["unknown.thing"] });
    expect(r.ok).toBe(true);
    expect(r.warnings).toEqual(["unknown_hook:unknown.thing"]);
  });

  it("requires hooks/permissions to be arrays", () => {
    const r = validatePluginManifest({ ...VALID, hooks: "x", permissions: 42 });
    expect(r.errors).toContain("hooks_must_be_array");
    expect(r.errors).toContain("permissions_must_be_array");
  });

  it("manifestSchemaInfo lists hooks and perms", () => {
    const info = manifestSchemaInfo();
    expect(info.hooks).toContain("rsvp.submitted");
    expect(info.permissions).toContain("guests:read");
  });
});
