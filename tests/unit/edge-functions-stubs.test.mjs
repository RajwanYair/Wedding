/**
 * tests/unit/edge-functions-stubs.test.mjs — File-presence checks for new
 * Supabase Edge Functions added in S95.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const FNS = resolve(HERE, "../../supabase/functions");

describe("edge function stubs (S95)", () => {
  it("gdpr-erasure entry point exists and serves POST", () => {
    const path = resolve(FNS, "gdpr-erasure/index.ts");
    expect(existsSync(path)).toBe(true);
    const src = readFileSync(path, "utf8");
    expect(src).toMatch(/Deno\.serve/);
    expect(src).toMatch(/admin_users/);
  });

  it("rsvp-webhook validates HMAC signature", () => {
    const path = resolve(FNS, "rsvp-webhook/index.ts");
    expect(existsSync(path)).toBe(true);
    const src = readFileSync(path, "utf8");
    expect(src).toMatch(/X-Wedding-Signature/);
    expect(src).toMatch(/HMAC/);
    expect(src).toMatch(/RSVP_WEBHOOK_SECRET/);
  });

  it("whatsapp-send and push-dispatcher functions are still present", () => {
    expect(existsSync(resolve(FNS, "whatsapp-send/index.ts"))).toBe(true);
    expect(existsSync(resolve(FNS, "push-dispatcher/index.ts"))).toBe(true);
  });
});
