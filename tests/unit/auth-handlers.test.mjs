/**
 * tests/unit/auth-handlers.test.mjs — Sprint 196
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/core/events.js", () => ({ on: vi.fn() }));
vi.mock("../../src/core/i18n.js", () => ({ t: vi.fn((k) => k) }));
vi.mock("../../src/core/ui.js", () => ({
  showToast: vi.fn(), openModal: vi.fn(), closeModal: vi.fn(),
}));
vi.mock("../../src/services/auth.js", () => ({
  loginAnonymous: vi.fn(), loginOAuth: vi.fn(() => false), clearSession: vi.fn(),
}));
vi.mock("../../src/core/section-resolver.js", () => ({ switchSection: vi.fn() }));

import { registerAuthHandlers } from "../../src/handlers/auth-handlers.js";
import { on } from "../../src/core/events.js";

describe("registerAuthHandlers", () => {
  it("is a function", () => {
    expect(typeof registerAuthHandlers).toBe("function");
  });

  it("registers handlers via on()", () => {
    vi.mocked(on).mockClear();
    registerAuthHandlers();
    expect(vi.mocked(on).mock.calls.length).toBeGreaterThan(0);
  });

  it("does not throw", () => {
    expect(() => registerAuthHandlers()).not.toThrow();
  });

  it("registers submitEmailLogin handler", () => {
    vi.mocked(on).mockClear();
    registerAuthHandlers();
    const actions = vi.mocked(on).mock.calls.map((c) => c[0]);
    expect(actions).toContain("submitEmailLogin");
  });

  it("registers signOut handler", () => {
    vi.mocked(on).mockClear();
    registerAuthHandlers();
    const actions = vi.mocked(on).mock.calls.map((c) => c[0]);
    expect(actions).toContain("signOut");
  });
});
