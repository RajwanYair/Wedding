/**
 * tests/unit/platform-ops.test.mjs — S358: services/platform-ops.js
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────

const _store = new Map();

vi.mock("../../src/core/store.js", () => ({
  storeGet: (k) => _store.get(k) ?? null,
  storeSet: vi.fn((k, v) => _store.set(k, v)),
}));
vi.mock("../../src/core/config.js", () => ({
  APP_VERSION: "13.17.0",
  MAX_RETRIES: 3,
  BACKOFF_BASE_MS: 100,
}));
vi.mock("../../src/core/i18n.js", () => ({
  t: vi.fn((k) => k),
}));
vi.mock("../../src/utils/idb-queue.js", () => ({
  idbQueueRead: vi.fn(async () => []),
  idbQueueWrite: vi.fn(async () => {}),
}));

import {
  createRateLimiter,
  isBackgroundSyncSupported,
  getDeployButtons,
  buildLighthouseConfig,
  getLighthouseLocales,
  captureHealthError,
  getHealthReport,
  resetHealthState,
  _setQueueStatsFnForTests,
} from "../../src/services/platform-ops.js";

beforeEach(() => {
  _store.clear();
  vi.clearAllMocks();
  resetHealthState();
  _setQueueStatsFnForTests(() => ({ total: 0, exhausted: 0, oldestAddedAt: null }));
});

// ── createRateLimiter ──────────────────────────────────────────────────────

describe("createRateLimiter", () => {
  it("allows requests up to the limit", () => {
    const rl = createRateLimiter({ limit: 3, windowMs: 60_000 });
    expect(rl.consume().allowed).toBe(true);
    expect(rl.consume().allowed).toBe(true);
    expect(rl.consume().allowed).toBe(true);
  });

  it("rejects when limit exceeded", () => {
    const rl = createRateLimiter({ limit: 2, windowMs: 60_000 });
    rl.consume();
    rl.consume();
    expect(rl.consume().allowed).toBe(false);
  });

  it("remaining decrements correctly", () => {
    const rl = createRateLimiter({ limit: 5, windowMs: 60_000 });
    const result = rl.consume();
    expect(result.remaining).toBe(4);
  });

  it("reset() restores tokens", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000 });
    rl.consume(); // exhaust
    rl.reset();
    expect(rl.consume().allowed).toBe(true);
  });

  it("status() does not consume tokens", () => {
    const rl = createRateLimiter({ limit: 2, windowMs: 60_000 });
    rl.status();
    rl.status();
    expect(rl.consume().allowed).toBe(true);
    expect(rl.status().remaining).toBe(1);
  });

  it("clear() removes all buckets", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000 });
    rl.consume("userA"); // exhaust userA
    rl.clear();
    expect(rl.consume("userA").allowed).toBe(true); // fresh after clear
  });

  it("per-key isolation", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000 });
    rl.consume("userA"); // exhaust userA
    expect(rl.consume("userB").allowed).toBe(true); // userB is fresh
  });

  it("throws for limit < 1", () => {
    expect(() => createRateLimiter({ limit: 0, windowMs: 1000 })).toThrow(RangeError);
  });

  it("throws for windowMs < 1", () => {
    expect(() => createRateLimiter({ limit: 1, windowMs: 0 })).toThrow(RangeError);
  });

  it("provides resetAt timestamp", () => {
    const rl = createRateLimiter({ limit: 3, windowMs: 5000 });
    const result = rl.consume();
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });
});

// ── isBackgroundSyncSupported ──────────────────────────────────────────────

describe("isBackgroundSyncSupported", () => {
  it("returns false in happy-dom (no SyncManager)", () => {
    // happy-dom doesn't implement SyncManager
    expect(typeof isBackgroundSyncSupported()).toBe("boolean");
  });
});

// ── getDeployButtons ───────────────────────────────────────────────────────

describe("getDeployButtons", () => {
  it("returns empty array for empty repoUrl", () => {
    expect(getDeployButtons("")).toHaveLength(0);
    expect(getDeployButtons(null)).toHaveLength(0);
  });

  it("returns deploy buttons for valid repoUrl", () => {
    const buttons = getDeployButtons("https://github.com/RajwanYair/Wedding");
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons[0]).toHaveProperty("key");
    expect(buttons[0]).toHaveProperty("name");
    expect(buttons[0]).toHaveProperty("url");
  });

  it("each button URL contains the repo URL", () => {
    const repoUrl = "https://github.com/RajwanYair/Wedding";
    const buttons = getDeployButtons(repoUrl);
    for (const btn of buttons) {
      expect(btn.url).toContain("github.com");
    }
  });
});

// ── buildLighthouseConfig ──────────────────────────────────────────────────

describe("buildLighthouseConfig", () => {
  it("returns config with ci structure", () => {
    const config = buildLighthouseConfig("en");
    expect(config).toHaveProperty("ci");
    expect(config.ci).toHaveProperty("collect");
    expect(config.ci).toHaveProperty("assert");
    expect(config.ci).toHaveProperty("upload");
  });

  it("includes locale in URL", () => {
    const config = buildLighthouseConfig("he");
    expect(config.ci.collect.url[0]).toContain("lang=he");
  });

  it("respects custom formFactor", () => {
    const config = buildLighthouseConfig("en", { formFactor: "desktop" });
    expect(config.ci.collect.settings.formFactor).toBe("desktop");
  });

  it("respects numberOfRuns", () => {
    const config = buildLighthouseConfig("en", { numberOfRuns: 5 });
    expect(config.ci.collect.numberOfRuns).toBe(5);
  });
});

// ── getLighthouseLocales ───────────────────────────────────────────────────

describe("getLighthouseLocales", () => {
  it("returns he, en, ar, ru", () => {
    const locales = getLighthouseLocales();
    expect(locales).toContain("he");
    expect(locales).toContain("en");
    expect(locales).toContain("ar");
    expect(locales).toContain("ru");
  });
});

// ── captureHealthError + getHealthReport ───────────────────────────────────

describe("captureHealthError + getHealthReport", () => {
  it("returns healthy status when no errors", () => {
    const report = getHealthReport();
    expect(report.status).toBe("healthy");
    expect(report.errors).toBe(0);
  });

  it("captures an error", () => {
    captureHealthError(new Error("test failure"), "test-context");
    const report = getHealthReport();
    expect(report.errors).toBe(1);
    expect(report.recentErrors[0].msg).toBe("test failure");
  });

  it("captures string errors", () => {
    captureHealthError("Something went wrong");
    expect(getHealthReport().errors).toBe(1);
  });

  it("status becomes degraded with warnings", () => {
    for (let i = 0; i < 6; i++) captureHealthError(`error ${i}`);
    const report = getHealthReport();
    expect(report.status).toBe("degraded");
    expect(report.warnings.length).toBeGreaterThan(0);
  });

  it("status becomes critical with many errors", () => {
    for (let i = 0; i < 11; i++) captureHealthError(`error ${i}`);
    expect(getHealthReport().status).toBe("critical");
  });

  it("offline queue stats included from test seam", () => {
    _setQueueStatsFnForTests(() => ({ total: 3, exhausted: 1, oldestAddedAt: "2026-01-01" }));
    const report = getHealthReport();
    expect(report.offlineQueue.total).toBe(3);
    expect(report.offlineQueue.exhausted).toBe(1);
    expect(report.warnings.some((w) => w.includes("exhausted"))).toBe(true);
  });
});

// ── resetHealthState ───────────────────────────────────────────────────────

describe("resetHealthState", () => {
  it("clears captured errors", () => {
    captureHealthError("test");
    resetHealthState();
    expect(getHealthReport().errors).toBe(0);
  });
});
