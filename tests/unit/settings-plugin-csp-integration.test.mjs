/**
 * S608 smoke test — strict plugin manifest validator + CSP wiring.
 *
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { getPluginCsp, pluginHasScope } from "../../src/sections/settings.js";

const SECTION = readFileSync("src/sections/settings.js", "utf8");

describe("S608 plugin manifest validator panel", () => {
  it("imports strict validators from utils/plugin-manifest.js", () => {
    expect(SECTION).toMatch(/from\s+"\.\.\/utils\/plugin-manifest\.js"/);
    expect(SECTION).toMatch(/validateManifest\s+as\s+_strictValidateManifest/);
    expect(SECTION).toMatch(/buildCsp\s+as\s+_buildPluginCsp/);
  });

  it("getPluginCsp returns required directives for declared scopes", () => {
    const csp = getPluginCsp({ permissions: ["net:fetch"] });
    expect(csp["script-src"]).toContain("'self'");
    expect(csp["connect-src"]).toContain("https:");
  });

  it("pluginHasScope detects declared scope", () => {
    expect(pluginHasScope({ permissions: ["guests:read"] }, "guests:read")).toBe(true);
    expect(pluginHasScope({ permissions: [] }, "guests:read")).toBe(false);
  });

  it("renderPluginList renders CSP line", () => {
    expect(SECTION).toMatch(/plugin_csp_label/);
    expect(SECTION).toMatch(/_buildPluginCsp/);
  });
});
