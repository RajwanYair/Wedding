import { describe, it, expect } from "vitest";
import { score } from "../../src/utils/password-strength.js";

describe("password-strength", () => {
  it("empty string scores 0 with 'empty' label", () => {
    const r = score("");
    expect(r.score).toBe(0);
    expect(r.label).toBe("empty");
    expect(r.suggestions).toContain("password.empty");
  });

  it("non-string input is treated as empty", () => {
    expect(score(null).label).toBe("empty");
    expect(score(undefined).label).toBe("empty");
  });

  it("very short password is very-weak", () => {
    const r = score("ab");
    expect(r.score).toBe(0);
    expect(r.label).toBe("very-weak");
    expect(r.suggestions).toContain("password.min_length");
  });

  it("common passwords are penalised to 0", () => {
    const r = score("password");
    expect(r.score).toBe(0);
    expect(r.suggestions).toContain("password.common");
  });

  it("8 lowercase letters scores at least weak", () => {
    const r = score("abcdefgh");
    expect(r.score).toBeGreaterThanOrEqual(1);
  });

  it("12-char mixed-case+digits+symbols scores strong/very-strong", () => {
    const r = score("Abcdefg1!xyz");
    expect(r.score).toBeGreaterThanOrEqual(3);
  });

  it("repeats are penalised", () => {
    const a = score("Abcdef1!aaa");
    expect(a.suggestions).toContain("password.no_repeats");
  });

  it("missing upper triggers suggestion", () => {
    const r = score("abcdef1!xy");
    expect(r.suggestions).toContain("password.add_upper");
  });

  it("missing digit triggers suggestion", () => {
    const r = score("Abcdefgh!");
    expect(r.suggestions).toContain("password.add_digit");
  });

  it("missing symbol triggers suggestion", () => {
    const r = score("Abcdefgh1");
    expect(r.suggestions).toContain("password.add_symbol");
  });

  it("score is clamped 0..4", () => {
    const r = score("Abcdefgh1!xyz_LONG_PHRASE");
    expect(r.score).toBeLessThanOrEqual(4);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });

  it("label maps to score range", () => {
    const labels = [
      "very-weak",
      "weak",
      "fair",
      "strong",
      "very-strong",
    ];
    const r = score("Abcdefgh1!xyz_LONG_PHRASE");
    expect(labels).toContain(r.label);
  });
});
