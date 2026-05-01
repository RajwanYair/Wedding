// @ts-check
/** tests/unit/plugin-runtime-manifest.test.mjs — S599 */
import { describe, it, expect } from "vitest";
import {
  listScopes,
  validateManifest,
  hasScope,
  buildCsp,
} from "../../src/utils/plugin-manifest.js";

describe("S599 plugin-runtime manifest", () => {
  it("listScopes is non-empty and includes net:fetch", () => {
    expect(listScopes().length).toBeGreaterThan(5);
    expect(listScopes()).toContain("net:fetch");
  });

  it("validateManifest accepts a clean manifest", () => {
    expect(
      validateManifest({
        id: "com.acme.checkin",
        name: "Acme Check-in",
        version: "1.0.0",
        entry: "./index.js",
        permissions: ["guests:read", "ui:section"],
      }),
    ).toEqual([]);
  });

  it("validateManifest rejects bad id / bad version / unknown perm", () => {
    const errs = validateManifest({
      id: "BAD",
      name: "x",
      version: "1.0",
      entry: "./e.js",
      permissions: /** @type {any} */ (["nope"]),
    });
    expect(errs.some((e) => e.includes("id"))).toBe(true);
    expect(errs.some((e) => e.includes("version"))).toBe(true);
    expect(errs.some((e) => e.includes("unknown permission"))).toBe(true);
  });

  it("validateManifest rejects absolute / parent / URL entry", () => {
    for (const entry of ["/etc/passwd", "../escape.js", "https://evil.tld/x.js"]) {
      const errs = validateManifest({
        id: "com.a.b",
        name: "x",
        version: "1.0.0",
        entry,
        permissions: [],
      });
      expect(errs.some((e) => e.includes("entry"))).toBe(true);
    }
  });

  it("hasScope checks declared permissions", () => {
    const m = { permissions: /** @type {const} */ (["guests:read"]) };
    expect(hasScope(m, "guests:read")).toBe(true);
    expect(hasScope(m, "guests:write")).toBe(false);
  });

  it("buildCsp adds https: to connect-src only with net:fetch", () => {
    expect(buildCsp({ permissions: [] })["connect-src"]).toEqual(["'self'"]);
    const csp2 = buildCsp({ permissions: ["net:fetch"] });
    expect(csp2["connect-src"]).toEqual(["'self'", "https:"]);
    expect(csp2["default-src"]).toEqual(["'none'"]);
  });
});
