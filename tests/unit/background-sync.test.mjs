/**
 * tests/unit/background-sync.test.mjs — Unit tests for src/services/background-sync.js (S89)
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, afterEach } from "vitest";

import {
  BACKGROUND_SYNC_TAG,
  isBackgroundSyncSupported,
  registerBackgroundSync,
  ensureBackgroundFlush,
} from "../../src/services/platform-ops.js";

describe("background-sync (S89)", () => {
  afterEach(() => {
    // @ts-ignore — test cleanup
    delete globalThis.SyncManager;
    if (globalThis.window) {
      // @ts-ignore
      delete window.SyncManager;
    }
    if (globalThis.navigator) {
      try {
        // @ts-ignore
        delete navigator.serviceWorker;
      } catch {
        /* property may not be configurable */
      }
    }
  });

  it("BACKGROUND_SYNC_TAG matches SW expected tag", () => {
    expect(BACKGROUND_SYNC_TAG).toBe("write-sync");
  });

  it("isBackgroundSyncSupported returns false without SyncManager", () => {
    expect(isBackgroundSyncSupported()).toBe(false);
  });

  it("registerBackgroundSync returns false when unsupported", async () => {
    const result = await registerBackgroundSync();
    expect(result).toBe(false);
  });

  it("registerBackgroundSync returns true when SW.sync is available", async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    // @ts-ignore — stub
    window.SyncManager = function () {};
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        ready: Promise.resolve({ sync: { register } }),
      },
    });
    const ok = await registerBackgroundSync();
    expect(ok).toBe(true);
    expect(register).toHaveBeenCalledWith("write-sync");
  });

  it("ensureBackgroundFlush falls back to online listener when unsupported", async () => {
    const onTrigger = vi.fn();
    const result = await ensureBackgroundFlush(onTrigger);
    expect(result).toBe("fallback");
    window.dispatchEvent(new Event("online"));
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });
});
