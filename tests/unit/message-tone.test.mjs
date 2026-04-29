/**
 * tests/unit/message-tone.test.mjs — S111 AI message tone picker.
 */
import { describe, it, expect } from "vitest";
import {
  applyTone,
  generateToneVariants,
  MESSAGE_TONES,
} from "../../src/services/wa-messaging.js";

describe("S111 — message-tone", () => {
  it("MESSAGE_TONES exposes 4 stable tones", () => {
    expect(MESSAGE_TONES).toEqual(["formal", "casual", "playful", "minimal"]);
  });

  it("applyTone formal he wraps in greeting + signature", () => {
    const out = applyTone("בואו לחתונה.", "formal", "he");
    expect(out).toContain("שלום רב");
    expect(out).toContain("בברכה");
  });

  it("applyTone casual en adds 👋 prefix", () => {
    const out = applyTone("Come to our wedding.", "casual", "en");
    expect(out).toContain("Hi 👋");
  });

  it("applyTone playful adds celebratory prefix + emoji", () => {
    const out = applyTone("חתונה.", "playful", "he");
    expect(out).toContain("🎉");
    expect(out).toContain("💃");
  });

  it("applyTone minimal collapses whitespace", () => {
    const out = applyTone("hello   world\n\nagain", "minimal", "en");
    expect(out).toBe("hello world again");
  });

  it("applyTone empty input returns empty string", () => {
    expect(applyTone("", "formal")).toBe("");
  });

  it("generateToneVariants returns one entry per tone", () => {
    const all = generateToneVariants("Test", "en");
    expect(Object.keys(all).sort()).toEqual([
      "casual",
      "formal",
      "minimal",
      "playful",
    ]);
    for (const v of Object.values(all)) expect(v.length).toBeGreaterThan(0);
  });
});
