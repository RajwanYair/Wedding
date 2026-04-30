/**
 * tests/unit/oauth-providers.test.mjs — Unit tests for src/services/auth.js (S94, updated S388)
 * @vitest-environment happy-dom
 */
import { describe, it, expect, afterEach } from "vitest";

import {
  detectInstalledSdks,
  preferredTransport,
} from "../../src/services/auth.js";

describe("oauth-providers (S94)", () => {
  afterEach(() => {
    // @ts-ignore — cleanup
    delete window.google;
    // @ts-ignore — cleanup
    delete window.AppleID;
  });

  it("detectInstalledSdks always returns google:false (S388 — Supabase Auth only)", () => {
    // Even if window.google is present, S388 migration always returns false
    // @ts-ignore — stub
    window.google = { accounts: { id: { prompt: () => {} } } };
    expect(detectInstalledSdks().google).toBe(false);
  });

  it("detectInstalledSdks always returns apple:false (S389 — Supabase Auth only)", () => {
    // Even if window.AppleID is present, S389 migration always returns false
    // @ts-ignore — stub
    window.AppleID = { auth: { signIn: () => {} } };
    expect(detectInstalledSdks().apple).toBe(false);
  });

  it("preferredTransport always returns 'supabase' for Google (S388 — GIS SDK removed)", () => {
    // @ts-ignore — stub (SDK presence must not change the transport)
    window.google = { accounts: { id: { prompt: () => {} } } };
    expect(preferredTransport("google")).toBe("supabase");
  });

  it("preferredTransport always returns 'supabase' for Apple (S389 — AppleID SDK removed)", () => {
    // @ts-ignore — stub (SDK presence must not change the transport)
    window.AppleID = { auth: { signIn: () => {} } };
    expect(preferredTransport("apple")).toBe("supabase");
  });

  it("preferredTransport always returns 'supabase' for both providers", () => {
    expect(preferredTransport("apple")).toBe("supabase");
    expect(preferredTransport("google")).toBe("supabase");
  });
});
