/**
 * tests/unit/oauth-providers.test.mjs — Unit tests for src/services/auth.js (S94)
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

  it("detectInstalledSdks detects Google when window.google.accounts.id.prompt is a function", () => {
    // @ts-ignore — stub
    window.google = { accounts: { id: { prompt: () => {} } } };
    expect(detectInstalledSdks().google).toBe(true);
  });

  it("detectInstalledSdks detects Apple when window.AppleID.auth.signIn is a function", () => {
    // @ts-ignore — stub
    window.AppleID = { auth: { signIn: () => {} } };
    expect(detectInstalledSdks().apple).toBe(true);
  });

  it("preferredTransport returns 'sdk' for Google when GIS is loaded", () => {
    // @ts-ignore — stub
    window.google = { accounts: { id: { prompt: () => {} } } };
    expect(preferredTransport("google")).toBe("sdk");
  });

  it("preferredTransport falls back to 'supabase' when SDK is missing", () => {
    expect(preferredTransport("apple")).toBe("supabase");
    expect(preferredTransport("google")).toBe("supabase");
  });
});
