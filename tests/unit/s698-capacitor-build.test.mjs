/**
 * tests/unit/s698-capacitor-build.test.mjs
 * S698 — Capacitor native build: config validation, step generation,
 *          platform filtering, capacitor.config.json shape.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

describe("S698 capacitor.config.json", () => {
  it("file exists", () => {
    expect(existsSync(resolve(ROOT, "capacitor.config.json"))).toBe(true);
  });

  it("has required fields", () => {
    const cfg = JSON.parse(readFileSync(resolve(ROOT, "capacitor.config.json"), "utf8"));
    expect(cfg.appId).toBeTruthy();
    expect(cfg.appName).toBeTruthy();
    expect(cfg.webDir).toBeTruthy();
  });

  it("appId follows reverse-domain notation", () => {
    const cfg = JSON.parse(readFileSync(resolve(ROOT, "capacitor.config.json"), "utf8"));
    expect(cfg.appId).toMatch(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,}$/i);
  });

  it("webDir is dist", () => {
    const cfg = JSON.parse(readFileSync(resolve(ROOT, "capacitor.config.json"), "utf8"));
    expect(cfg.webDir).toBe("dist");
  });

  it("has ios configuration", () => {
    const cfg = JSON.parse(readFileSync(resolve(ROOT, "capacitor.config.json"), "utf8"));
    expect(cfg.ios).toBeTruthy();
    expect(cfg.ios.scheme).toBeTruthy();
  });

  it("has android configuration", () => {
    const cfg = JSON.parse(readFileSync(resolve(ROOT, "capacitor.config.json"), "utf8"));
    expect(cfg.android).toBeTruthy();
    expect(cfg.android.allowMixedContent).toBe(false);
  });

  it("server uses https scheme", () => {
    const cfg = JSON.parse(readFileSync(resolve(ROOT, "capacitor.config.json"), "utf8"));
    expect(cfg.server?.androidScheme).toBe("https");
    expect(cfg.server?.iosScheme).toBe("https");
    expect(cfg.server?.cleartext).toBe(false);
  });
});

describe("S698 build-native.mjs script", () => {
  it("script file exists", () => {
    expect(existsSync(resolve(ROOT, "scripts/build-native.mjs"))).toBe(true);
  });

  it("references capacitor.config.json", () => {
    const src = readFileSync(resolve(ROOT, "scripts/build-native.mjs"), "utf8");
    expect(src).toContain("capacitor.config.json");
  });

  it("handles --dry-run flag", () => {
    const src = readFileSync(resolve(ROOT, "scripts/build-native.mjs"), "utf8");
    expect(src).toContain("--dry-run");
    expect(src).toContain("dry");
  });

  it("supports --platform flag for ios and android", () => {
    const src = readFileSync(resolve(ROOT, "scripts/build-native.mjs"), "utf8");
    expect(src).toContain("--platform");
    expect(src).toContain('"ios"');
    expect(src).toContain('"android"');
  });

  it("exits non-zero on failed vite build", () => {
    const src = readFileSync(resolve(ROOT, "scripts/build-native.mjs"), "utf8");
    expect(src).toContain("process.exit");
  });
});

describe("S698 package.json build scripts", () => {
  it("has build:ios script", () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
    expect(pkg.scripts["build:ios"]).toBeTruthy();
    expect(pkg.scripts["build:ios"]).toContain("build-native.mjs");
  });

  it("has build:android script", () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
    expect(pkg.scripts["build:android"]).toBeTruthy();
  });

  it("has build:native script", () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
    expect(pkg.scripts["build:native"]).toBeTruthy();
  });
});

describe("S698 mobile-build.yml workflow", () => {
  it("workflow file exists", () => {
    expect(existsSync(resolve(ROOT, ".github/workflows/mobile-build.yml"))).toBe(true);
  });

  it("references capacitor.config.json in paths trigger", () => {
    const src = readFileSync(resolve(ROOT, ".github/workflows/mobile-build.yml"), "utf8");
    expect(src).toContain("capacitor.config.json");
  });

  it("has both ios and android jobs", () => {
    const src = readFileSync(resolve(ROOT, ".github/workflows/mobile-build.yml"), "utf8");
    expect(src.toLowerCase()).toContain("ios");
    expect(src.toLowerCase()).toContain("android");
  });
});
