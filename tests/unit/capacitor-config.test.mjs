/**
 * tests/unit/capacitor-config.test.mjs — S136 Capacitor config builder.
 */
import { describe, it, expect } from "vitest";
import {
  buildCapacitorConfig,
  validateCapacitorConfig,
  CAPACITOR_PLATFORMS,
} from "../../src/utils/capacitor-config.js";

describe("S136 — capacitor-config", () => {
  it("builds a minimal valid config", () => {
    const { ok, config, errors } = buildCapacitorConfig({
      appId: "com.example.wedding",
      appName: "Wedding Manager",
    });
    expect(ok).toBe(true);
    expect(errors).toHaveLength(0);
    expect(config.appId).toBe("com.example.wedding");
    expect(config.appName).toBe("Wedding Manager");
    expect(config.webDir).toBe("dist");
  });

  it("rejects missing appId", () => {
    const { ok, errors } = buildCapacitorConfig({ appId: "", appName: "Test" });
    expect(ok).toBe(false);
    expect(errors.some((e) => /appId/.test(e))).toBe(true);
  });

  it("rejects malformed appId (not reverse-domain)", () => {
    const { ok, errors } = buildCapacitorConfig({ appId: "wedding", appName: "Test" });
    expect(ok).toBe(false);
    expect(errors.some((e) => /reverse-domain/.test(e))).toBe(true);
  });

  it("includes iOS block when provided", () => {
    const { ok, config } = buildCapacitorConfig({
      appId: "com.example.wedding",
      appName: "Wedding",
      ios: { scheme: "weddingapp", backgroundColor: "#ffffff", allowsLinkPreview: false },
    });
    expect(ok).toBe(true);
    expect(config.ios).toMatchObject({ scheme: "weddingapp", backgroundColor: "#ffffff", allowsLinkPreview: false });
  });

  it("includes Android block and plugin config", () => {
    const { ok, config } = buildCapacitorConfig({
      appId: "com.example.wedding",
      appName: "Wedding",
      android: { allowMixedContent: false, webContentsDebuggingEnabled: false },
      plugins: {
        SplashScreen: { launchShowDuration: 2000, backgroundColor: "#7c3aed" },
        Haptics: { sound: true, vibration: true },
      },
    });
    expect(ok).toBe(true);
    expect(config.android.allowMixedContent).toBe(false);
    expect(config.plugins.SplashScreen.launchShowDuration).toBe(2000);
    expect(config.plugins.Haptics.vibration).toBe(true);
  });

  it("CAPACITOR_PLATFORMS has expected values", () => {
    expect(CAPACITOR_PLATFORMS).toContain("ios");
    expect(CAPACITOR_PLATFORMS).toContain("android");
    expect(CAPACITOR_PLATFORMS).toContain("web");
  });

  it("validateCapacitorConfig rejects non-object input", () => {
    expect(validateCapacitorConfig(null).ok).toBe(false);
    expect(validateCapacitorConfig("string").ok).toBe(false);
  });

  it("validateCapacitorConfig accepts a valid raw object", () => {
    const { ok } = validateCapacitorConfig({ appId: "il.co.example.wedding", appName: "חתונה" });
    expect(ok).toBe(true);
  });
});
