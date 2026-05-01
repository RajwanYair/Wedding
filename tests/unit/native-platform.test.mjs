import { describe, it, expect, afterEach } from "vitest";
import { isNative, isIOS, isAndroid, isWeb, platform } from "../../src/native/platform.js";

describe("native/platform", () => {
  afterEach(() => {
    delete globalThis.Capacitor;
  });

  it("defaults to web when Capacitor is missing", () => {
    expect(isNative()).toBe(false);
    expect(isWeb()).toBe(true);
    expect(platform()).toBe("web");
    expect(isIOS()).toBe(false);
    expect(isAndroid()).toBe(false);
  });

  it("detects ios native shell", () => {
    globalThis.Capacitor = { isNativePlatform: () => true, getPlatform: () => "ios" };
    expect(isNative()).toBe(true);
    expect(isIOS()).toBe(true);
    expect(platform()).toBe("ios");
  });

  it("detects android native shell", () => {
    globalThis.Capacitor = { isNativePlatform: () => true, getPlatform: () => "android" };
    expect(isAndroid()).toBe(true);
    expect(platform()).toBe("android");
  });
});
