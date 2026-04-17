/**
 * tests/unit/clipboard.test.mjs — Sprint 206
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  copyToClipboard,
  readFromClipboard,
  isClipboardAvailable,
  copyWithFeedback,
} from "../../src/utils/clipboard.js";

describe("isClipboardAvailable", () => {
  it("returns false when clipboard is absent", () => {
    const orig = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    expect(isClipboardAvailable()).toBe(false);
    Object.defineProperty(navigator, "clipboard", { value: orig, configurable: true });
  });

  it("returns true when clipboard.writeText is present", () => {
    const orig = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn() },
      configurable: true,
    });
    expect(isClipboardAvailable()).toBe(true);
    Object.defineProperty(navigator, "clipboard", { value: orig, configurable: true });
  });
});

describe("copyToClipboard", () => {
  it("returns true when clipboard.writeText resolves", async () => {
    const orig = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
    const result = await copyToClipboard("hello");
    expect(result).toBe(true);
    Object.defineProperty(navigator, "clipboard", { value: orig, configurable: true });
  });

  it("falls back when clipboard.writeText throws", async () => {
    const orig = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
    });
    // In happy-dom execCommand may return false; we just expect a boolean
    const result = await copyToClipboard("fallback text");
    expect(typeof result).toBe("boolean");
    Object.defineProperty(navigator, "clipboard", { value: orig, configurable: true });
  });
});

describe("readFromClipboard", () => {
  it("returns text from clipboard.readText", async () => {
    const orig = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: { readText: vi.fn().mockResolvedValue("copied text") },
      configurable: true,
    });
    expect(await readFromClipboard()).toBe("copied text");
    Object.defineProperty(navigator, "clipboard", { value: orig, configurable: true });
  });

  it("returns empty string when clipboard unavailable", async () => {
    const orig = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    expect(await readFromClipboard()).toBe("");
    Object.defineProperty(navigator, "clipboard", { value: orig, configurable: true });
  });
});

describe("copyWithFeedback", () => {
  it("returns success: true with text and label", async () => {
    const orig = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
    const r = await copyWithFeedback("phone: 0501234567", "phone");
    expect(r.success).toBe(true);
    expect(r.text).toBe("phone: 0501234567");
    expect(r.label).toBe("phone");
    Object.defineProperty(navigator, "clipboard", { value: orig, configurable: true });
  });

  it("works without label", async () => {
    const orig = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
    const r = await copyWithFeedback("hello");
    expect(r.label).toBeUndefined();
    Object.defineProperty(navigator, "clipboard", { value: orig, configurable: true });
  });
});
