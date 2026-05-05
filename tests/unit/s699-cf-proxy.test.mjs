/**
 * tests/unit/s699-cf-proxy.test.mjs
 * S699 — CF proxy + DNS + custom domain: wrangler config,
 *         CSP headers, env config, docs presence.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

describe("S699 wrangler.toml", () => {
  const tomlPath = resolve(ROOT, "worker/wrangler.toml");
  let src;
  it("file exists", () => {
    expect(existsSync(tomlPath)).toBe(true);
    src = readFileSync(tomlPath, "utf8");
  });

  it("has production environment block", () => {
    const toml = readFileSync(tomlPath, "utf8");
    expect(toml).toContain("[env.production]");
  });

  it("production environment has allowed origins", () => {
    const toml = readFileSync(tomlPath, "utf8");
    expect(toml).toContain("ALLOWED_ORIGINS");
  });

  it("production environment references custom domain", () => {
    const toml = readFileSync(tomlPath, "utf8");
    expect(toml).toContain("wedding.rajwanyair.com");
  });

  it("has route pattern for api.wedding.rajwanyair.com", () => {
    const toml = readFileSync(tomlPath, "utf8");
    expect(toml).toContain("api.wedding.rajwanyair.com");
  });

  it("has zone_name for custom route", () => {
    const toml = readFileSync(tomlPath, "utf8");
    expect(toml).toContain("zone_name");
  });

  it("has staging environment block", () => {
    const toml = readFileSync(tomlPath, "utf8");
    expect(toml).toContain("[env.staging]");
  });

  it("includes github.io in allowed origins for staging", () => {
    const toml = readFileSync(tomlPath, "utf8");
    expect(toml).toContain("rajwanyair.github.io");
  });
});

describe("S699 _headers CSP", () => {
  it("file exists", () => {
    expect(existsSync(resolve(ROOT, "public/_headers"))).toBe(true);
  });

  it("allows api.wedding.rajwanyair.com in connect-src", () => {
    const headers = readFileSync(resolve(ROOT, "public/_headers"), "utf8");
    expect(headers).toContain("api.wedding.rajwanyair.com");
  });

  it("allows workers.dev in connect-src for staging", () => {
    const headers = readFileSync(resolve(ROOT, "public/_headers"), "utf8");
    expect(headers).toContain("*.workers.dev");
  });

  it("still includes supabase in connect-src", () => {
    const headers = readFileSync(resolve(ROOT, "public/_headers"), "utf8");
    expect(headers).toContain("*.supabase.co");
  });

  it("preserves strict HSTS header", () => {
    const headers = readFileSync(resolve(ROOT, "public/_headers"), "utf8");
    expect(headers).toContain("Strict-Transport-Security");
    expect(headers).toContain("max-age=63072000");
  });
});

describe("S699 cf-proxy-setup docs", () => {
  it("setup guide exists", () => {
    expect(existsSync(resolve(ROOT, "docs/operations/cf-proxy-setup.md"))).toBe(true);
  });

  it("covers DNS records section", () => {
    const doc = readFileSync(resolve(ROOT, "docs/operations/cf-proxy-setup.md"), "utf8");
    expect(doc).toContain("DNS");
  });

  it("covers wrangler deploy command", () => {
    const doc = readFileSync(resolve(ROOT, "docs/operations/cf-proxy-setup.md"), "utf8");
    expect(doc).toContain("wrangler deploy");
  });

  it("references production environment", () => {
    const doc = readFileSync(resolve(ROOT, "docs/operations/cf-proxy-setup.md"), "utf8");
    expect(doc).toContain("production");
  });

  it("covers rollback instructions", () => {
    const doc = readFileSync(resolve(ROOT, "docs/operations/cf-proxy-setup.md"), "utf8");
    expect(doc.toLowerCase()).toContain("rollback");
  });

  it("references wrangler.toml file", () => {
    const doc = readFileSync(resolve(ROOT, "docs/operations/cf-proxy-setup.md"), "utf8");
    expect(doc).toContain("wrangler.toml");
  });
});
