/**
 * tests/unit/share-service.test.mjs — Sprint 132 (merged into share.js in S86)
 */

import { describe, it, expect, vi } from "vitest";
import {
  isNativeShareSupported,
  shareWithFallback as share,
  buildShareUrl,
} from "../../src/services/export.js";

describe("isNativeShareSupported", () => {
  it("returns boolean", () => {
    expect(typeof isNativeShareSupported()).toBe("boolean");
  });
});

describe("share — native", () => {
  it("returns native success when nativeShare resolves", async () => {
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    const result = await share({ title: "Wedding", url: "https://example.com" }, { nativeShare });
    expect(result.method).toBe("native");
    expect(result.success).toBe(true);
  });

  it("returns AbortError when user cancels", async () => {
    const abort = Object.assign(new Error("Aborted"), { name: "AbortError" });
    const nativeShare = vi.fn().mockRejectedValue(abort);
    const result = await share({ url: "https://example.com" }, { nativeShare });
    expect(result.method).toBe("native");
    expect(result.success).toBe(false);
    expect(result.error).toBe("AbortError");
  });
});

describe("share — clipboard fallback", () => {
  it("uses clipboard when native share not available", async () => {
    const clipboardWrite = vi.fn().mockResolvedValue(undefined);
    const result = await share(
      { title: "Invite", url: "https://example.com" },
      { nativeShare: null, clipboardWrite },
    );
    expect(result.method).toBe("clipboard");
    expect(result.success).toBe(true);
    expect(clipboardWrite).toHaveBeenCalledOnce();
  });

  it("returns none when neither API available", async () => {
    const result = await share({ url: "https://example.com" }, { nativeShare: null, clipboardWrite: null });
    expect(result.method).toBe("none");
    expect(result.success).toBe(false);
  });

  it("falls through to clipboard when native share throws non-abort error", async () => {
    const nativeShare = vi.fn().mockRejectedValue(new Error("NotSupportedError"));
    const clipboardWrite = vi.fn().mockResolvedValue(undefined);
    const result = await share({ url: "https://example.com" }, { nativeShare, clipboardWrite });
    expect(result.method).toBe("clipboard");
    expect(result.success).toBe(true);
  });
});

describe("buildShareUrl", () => {
  it("returns base url when no eventId", () => {
    expect(buildShareUrl("https://example.com/rsvp")).toBe("https://example.com/rsvp");
  });

  it("appends event param when eventId provided", () => {
    const url = buildShareUrl("https://example.com/rsvp", { eventId: "evt_1" });
    expect(url).toContain("event=evt_1");
  });
});
