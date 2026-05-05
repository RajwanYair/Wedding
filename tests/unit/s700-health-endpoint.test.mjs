/**
 * tests/unit/s700-health-endpoint.test.mjs
 * S700 — UptimeRobot + /health endpoint: health.json shape,
 *         _headers cache control, worker /health route, README badge.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

describe("S700 public/health.json", () => {
  it("file exists", () => {
    expect(existsSync(resolve(ROOT, "public/health.json"))).toBe(true);
  });

  it("is valid JSON", () => {
    const raw = readFileSync(resolve(ROOT, "public/health.json"), "utf8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("has status: ok", () => {
    const json = JSON.parse(readFileSync(resolve(ROOT, "public/health.json"), "utf8"));
    expect(json.status).toBe("ok");
  });

  it("has version field matching package.json", () => {
    const json = JSON.parse(readFileSync(resolve(ROOT, "public/health.json"), "utf8"));
    const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
    expect(json.version).toBe(pkg.version);
  });

  it("has app field", () => {
    const json = JSON.parse(readFileSync(resolve(ROOT, "public/health.json"), "utf8"));
    expect(json.app).toBeTruthy();
  });
});

describe("S700 _headers health.json cache", () => {
  it("health.json has no-cache directive", () => {
    const headers = readFileSync(resolve(ROOT, "public/_headers"), "utf8");
    expect(headers).toContain("/health.json");
    expect(headers).toContain("no-cache, no-store, must-revalidate");
  });

  it("health.json has JSON content-type", () => {
    const headers = readFileSync(resolve(ROOT, "public/_headers"), "utf8");
    expect(headers).toContain("application/json");
  });
});

describe("S700 CF Worker /health route", () => {
  it("worker/index.js has /health route", () => {
    const src = readFileSync(resolve(ROOT, "worker/index.js"), "utf8");
    expect(src).toContain("/health");
  });

  it("worker /health returns ok: true", () => {
    const src = readFileSync(resolve(ROOT, "worker/index.js"), "utf8");
    expect(src).toContain("ok");
    expect(src).toContain("ts");
  });
});

describe("S700 uptime.md monitors", () => {
  it("uptime.md exists", () => {
    expect(existsSync(resolve(ROOT, "docs/operations/uptime.md"))).toBe(true);
  });

  it("documents health.json monitor", () => {
    const doc = readFileSync(resolve(ROOT, "docs/operations/uptime.md"), "utf8");
    expect(doc).toContain("health.json");
  });

  it("documents CF Worker health monitor", () => {
    const doc = readFileSync(resolve(ROOT, "docs/operations/uptime.md"), "utf8");
    expect(doc).toContain("api.wedding.rajwanyair.com/health");
  });

  it("has at least 6 monitors in the table", () => {
    const doc = readFileSync(resolve(ROOT, "docs/operations/uptime.md"), "utf8");
    const rows = doc.match(/^\| \d+/gm);
    expect((rows?.length ?? 0)).toBeGreaterThanOrEqual(6);
  });
});

describe("S700 README uptime badge", () => {
  it("README has uptime badge", () => {
    const readme = readFileSync(resolve(ROOT, "README.md"), "utf8");
    expect(readme.toLowerCase()).toContain("uptime");
  });
});
