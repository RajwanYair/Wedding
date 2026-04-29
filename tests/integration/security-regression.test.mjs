/**
 * tests/integration/security-regression.test.mjs — Sprint 89
 *
 * Integration-style security regression tests covering:
 *   - Auth claims extraction and role checks
 *   - Rate limiter blocking behaviour
 *   - GDPR erasure column list completeness
 *   - Audit pipeline high-severity elevation
 *   - Crypto roundtrip fidelity
 *   - Session guard inactivity timeout
 */

import { describe, it, expect, vi } from "vitest";
import { decodeJwtPayload, hasRole, isTokenExpired } from "../../src/services/auth.js";
import { createRateLimiter } from "../../src/services/rate-limiter.js";
import { PII_COLUMNS } from "../../src/services/privacy.js";
import { createAuditPipeline } from "../../src/services/audit.js";
import { generateKey, encryptField, decryptField, createSessionGuard } from "../../src/services/security.js";
import { REQUIRED_RLS_TABLES } from "../../src/services/db-diagnostics.js";

// ── Build a fake JWT ──────────────────────────────────────────────────────

function fakeJwt(payload) {
  const enc = (obj) => btoa(JSON.stringify(obj))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return `${enc({ alg: "HS256" })}.${enc(payload)}.sig`;
}

// ── Auth claims ──────────────────────────────────────────────────────────

describe("Security: auth claims", () => {
  it("extracts sub and email claims from JWT", () => {
    const s = { access_token: fakeJwt({ sub: "u1", email: "a@b.com" }) };
    const claims = decodeJwtPayload(s.access_token);
    expect(claims.sub).toBe("u1");
    expect(claims.email).toBe("a@b.com");
  });

  it("non-admin cannot impersonate admin role", () => {
    const s = { access_token: fakeJwt({ role: "user" }) };
    expect(hasRole(s, "admin")).toBe(false);
  });

  it("expired token is detected", () => {
    const s = { access_token: fakeJwt({ exp: Math.floor(Date.now() / 1000) - 1 }) };
    expect(isTokenExpired(s)).toBe(true);
  });

  it("valid future token is not expired", () => {
    const s = { access_token: fakeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 }) };
    expect(isTokenExpired(s)).toBe(false);
  });
});

// ── Rate limiter ─────────────────────────────────────────────────────────

describe("Security: rate limiter", () => {
  it("blocks after limit is exceeded", () => {
    const rl = createRateLimiter({ limit: 3, windowMs: 60_000 });
    rl.consume("u1"); rl.consume("u1"); rl.consume("u1");
    expect(rl.consume("u1").allowed).toBe(false);
  });

  it("different keys have independent limits", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000 });
    rl.consume("user-a");
    expect(rl.consume("user-b").allowed).toBe(true);
  });

  it("reset restores full quota", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000 });
    rl.consume();
    rl.reset();
    expect(rl.consume().allowed).toBe(true);
  });
});

// ── GDPR erasure ─────────────────────────────────────────────────────────

describe("Security: GDPR erasure PII_COLUMNS", () => {
  const REQUIRED_PII = ["phone", "email", "first_name", "last_name"];
  for (const col of REQUIRED_PII) {
    it(`PII_COLUMNS includes ${col}`, () => {
      expect(PII_COLUMNS).toContain(col);
    });
  }

  it("PII_COLUMNS does not include safe columns", () => {
    expect(PII_COLUMNS).not.toContain("status");
    expect(PII_COLUMNS).not.toContain("table_id");
    expect(PII_COLUMNS).not.toContain("id");
  });
});

// ── RLS audit ─────────────────────────────────────────────────────────────

describe("Security: RLS required tables", () => {
  it("guests and events are required", () => {
    expect(REQUIRED_RLS_TABLES).toContain("guests");
    expect(REQUIRED_RLS_TABLES).toContain("events");
  });

  it("rsvp_log is required", () => {
    expect(REQUIRED_RLS_TABLES).toContain("rsvp_log");
  });
});

// ── Audit pipeline ────────────────────────────────────────────────────────

describe("Security: audit pipeline severity elevation", () => {
  it("guest.delete is elevated to high", async () => {
    const rows = [];
    const supabase = {
      from: () => ({ insert: (b) => { rows.push(...b); return Promise.resolve({ error: null }); } }),
    };
    const p = createAuditPipeline(supabase, { flushMs: 60_000 });
    p.log({ action: "guest.delete", severity: "low" });
    await p.flush();
    expect(rows[0].severity).toBeOneOf(["high", "critical"]);
    p.destroy();
  });

  it("regular action keeps low severity", async () => {
    const rows = [];
    const supabase = {
      from: () => ({ insert: (b) => { rows.push(...b); return Promise.resolve({ error: null }); } }),
    };
    const p = createAuditPipeline(supabase, { flushMs: 60_000 });
    p.log({ action: "guest.view", severity: "low" });
    await p.flush();
    expect(rows[0].severity).toBe("low");
    p.destroy();
  });
});

// ── Crypto ───────────────────────────────────────────────────────────────

describe("Security: AES-GCM encryption roundtrip", () => {
  it("encrypts and decrypts a phone number correctly", async () => {
    const key = await generateKey();
    const phone = "+972541234567";
    const ct = await encryptField(key, phone);
    expect(ct).not.toBe(phone);
    expect(await decryptField(key, ct)).toBe(phone);
  });

  it("ciphertext is unique each call (random IV)", async () => {
    const key = await generateKey();
    const c1 = await encryptField(key, "data");
    const c2 = await encryptField(key, "data");
    expect(c1).not.toBe(c2);
  });
});

// ── Session guard ─────────────────────────────────────────────────────────

describe("Security: session guard", () => {
  it("fires onTimeout after inactivity", async () => {
    const onTimeout = vi.fn();
    const guard = createSessionGuard({ timeoutMs: 30, onTimeout });
    await vi.waitFor(() => expect(onTimeout).toHaveBeenCalled(), { timeout: 200 });
    guard.destroy();
  });

  it("does not fire after destroy", async () => {
    const onTimeout = vi.fn();
    const guard = createSessionGuard({ timeoutMs: 30, onTimeout });
    guard.destroy();
    await new Promise((r) => setTimeout(r, 60));
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
