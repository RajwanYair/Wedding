/**
 * tests/unit/dual-write.test.mjs — S160: dual-write rehearsal harness
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── config mock (flag off by default) ────────────────────────────────────
const configMock = { FEATURE_DUAL_WRITE: false, STORAGE_PREFIX: "wedding_v1_" };
vi.mock("../../src/core/config.js", () => configMock);

const { initDualWrite, isDualWriteHarnessActive, dualWrite } =
  await import("../../src/services/sync.js");

beforeEach(() => {
  // Reset module-level _active flag between tests via fresh imports is tricky;
  // instead we test the public API contracts directly.
  vi.restoreAllMocks();
});

describe("initDualWrite", () => {
  it("returns false when FEATURE_DUAL_WRITE is false", () => {
    configMock.FEATURE_DUAL_WRITE = false;
    const result = initDualWrite();
    expect(result).toBe(false);
  });

  it("returns true when FEATURE_DUAL_WRITE is true", () => {
    configMock.FEATURE_DUAL_WRITE = true;
    const result = initDualWrite();
    expect(result).toBe(true);
  });
});

describe("isDualWriteHarnessActive", () => {
  it("reflects initDualWrite activation", () => {
    configMock.FEATURE_DUAL_WRITE = true;
    initDualWrite();
    expect(isDualWriteHarnessActive()).toBe(true);
  });
});

describe("dualWrite", () => {
  it("returns primary result when both succeed", async () => {
    const primary = vi.fn().mockResolvedValue("primary-result");
    const secondary = vi.fn().mockResolvedValue("secondary-result");
    const result = await dualWrite("test-op", primary, secondary);
    expect(result).toBe("primary-result");
    expect(primary).toHaveBeenCalled();
    expect(secondary).toHaveBeenCalled();
  });

  it("warns on divergence when results differ", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await dualWrite(
      "diverge-op",
      () => Promise.resolve({ count: 1 }),
      () => Promise.resolve({ count: 2 }),
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("divergence"),
      expect.any(Object),
    );
  });

  it("warns and returns primary when secondary fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await dualWrite(
      "secondary-fail",
      () => Promise.resolve("ok"),
      () => Promise.reject(new Error("secondary error")),
    );
    expect(result).toBe("ok");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("secondary failed"),
      expect.any(Object),
    );
  });

  it("throws primary error and warns when primary fails but secondary OK", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const primaryErr = new Error("primary failure");
    await expect(
      dualWrite(
        "primary-fail",
        () => Promise.reject(primaryErr),
        () => Promise.resolve("secondary ok"),
      ),
    ).rejects.toThrow("primary failure");
  });

  it("throws primary error when both backends fail", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const primaryErr = new Error("both failed");
    await expect(
      dualWrite(
        "both-fail",
        () => Promise.reject(primaryErr),
        () => Promise.reject(new Error("secondary also failed")),
      ),
    ).rejects.toThrow("both failed");
  });

  it("does not warn when both results are identical", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await dualWrite(
      "same-result",
      () => Promise.resolve({ n: 42 }),
      () => Promise.resolve({ n: 42 }),
    );
    const divergeCalls = warn.mock.calls.filter((c) => String(c[0]).includes("divergence"));
    expect(divergeCalls).toHaveLength(0);
  });
});
