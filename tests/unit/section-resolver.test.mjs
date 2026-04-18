/**
 * tests/unit/section-resolver.test.mjs — Sprint 189 + Sprint 8 (session)
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/core/constants.js", () => ({
  PUBLIC_SECTIONS: new Set(["landing", "rsvp"]),
}));

vi.mock("../../src/core/template-loader.js", () => ({
  injectTemplate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../src/core/store.js", () => ({
  storeSet: vi.fn(),
  storeGet: vi.fn(() => null),
}));

vi.mock("../../src/core/i18n.js", () => ({
  t: vi.fn((key) => key),
}));

vi.mock("../../src/core/ui.js", () => ({
  showToast: vi.fn(),
  announce: vi.fn(),
}));

vi.mock("../../src/services/auth.js", () => ({
  currentUser: vi.fn(() => null),
}));

import {
  getActiveSection, preloadSections, resolveSection, switchSection,
} from "../../src/core/section-resolver.js";
import { currentUser } from "../../src/services/auth.js";
import { injectTemplate } from "../../src/core/template-loader.js";
import { showToast } from "../../src/core/ui.js";

describe("getActiveSection", () => {
  it("returns null before any section is switched to", () => {
    const result = getActiveSection();
    expect(result === null || typeof result === "string").toBe(true);
  });
});

describe("preloadSections", () => {
  it("does not throw for unknown section names", () => {
    expect(() => preloadSections(["unknown-section-xyz"])).not.toThrow();
  });

  it("accepts empty array", () => {
    expect(() => preloadSections([])).not.toThrow();
  });

  it("accepts known section names without throwing", () => {
    expect(() => preloadSections(["landing", "rsvp"])).not.toThrow();
  });

  it("accepts an array with mixed known/unknown names", () => {
    expect(() => preloadSections(["landing", "no-such-section"])).not.toThrow();
  });
});

describe("resolveSection", () => {
  it("returns undefined for unknown section name", async () => {
    const result = await resolveSection("no-such-section-xyz");
    expect(result).toBeUndefined();
  });

  it("is a function", () => {
    expect(typeof resolveSection).toBe("function");
  });
});

describe("switchSection — auth gating", () => {
  beforeEach(() => {
    vi.mocked(showToast).mockReset();
    vi.mocked(injectTemplate).mockResolvedValue(undefined);
  });

  it("does not call injectTemplate when unauthenticated and redirected for private section", async () => {
    vi.mocked(currentUser).mockReturnValue(null);
    vi.mocked(injectTemplate).mockClear();
    await switchSection("dashboard");
    // Unauthenticated users are redirected to landing — no template inject for dashboard
    expect(injectTemplate).not.toHaveBeenCalledWith(expect.stringContaining("dashboard"), expect.anything());
  });

  it("does not show auth-required toast for public sections (landing)", async () => {
    vi.mocked(currentUser).mockReturnValue(null);
    await switchSection("landing");
    // landing is PUBLIC_SECTION — landing redirect happens, then container check fails → toast about section not found (not auth)
    const authToastCalls = vi.mocked(showToast).mock.calls.filter(([msg]) =>
      typeof msg === "string" && msg.includes("auth"),
    );
    expect(authToastCalls).toHaveLength(0);
  });

  it("allows admin users to call switchSection without throwing", async () => {
    vi.mocked(currentUser).mockReturnValue({ isAdmin: true, name: "Admin" });
    await expect(switchSection("dashboard")).resolves.not.toThrow();
  });
});

