/**
 * tests/unit/auth-handlers.test.mjs — Sprint 196 + Sprint 4 (session)
 *
 * Expanded: tests now invoke handler callbacks to verify behavior.
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

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
import { showToast, openModal, closeModal } from "../../src/core/ui.js";
import { loginOAuth, clearSession, loginAnonymous } from "../../src/services/auth.js";
import { switchSection } from "../../src/core/section-resolver.js";

function getHandler(action) {
  const call = vi.mocked(on).mock.calls.find(([a]) => a === action);
  if (!call) throw new Error(`No handler for "${action}"`);
  return call[1];
}

describe("registerAuthHandlers — registration", () => {
  beforeEach(() => { vi.mocked(on).mockClear(); });

  it("is a function", () => { expect(typeof registerAuthHandlers).toBe("function"); });
  it("registers handlers via on()", () => {
    registerAuthHandlers();
    expect(vi.mocked(on).mock.calls.length).toBeGreaterThan(0);
  });
  it("does not throw", () => { expect(() => registerAuthHandlers()).not.toThrow(); });
  it("registers submitEmailLogin handler", () => {
    registerAuthHandlers();
    expect(vi.mocked(on).mock.calls.map((c) => c[0])).toContain("submitEmailLogin");
  });
  it("registers signOut handler", () => {
    registerAuthHandlers();
    expect(vi.mocked(on).mock.calls.map((c) => c[0])).toContain("signOut");
  });
});

describe("registerAuthHandlers — handler behavior", () => {
  beforeEach(() => {
    vi.mocked(on).mockClear();
    vi.mocked(loginOAuth).mockReset().mockReturnValue(false);
    vi.mocked(clearSession).mockReset();
    vi.mocked(loginAnonymous).mockReset();
    vi.mocked(switchSection).mockReset();
    vi.mocked(showToast).mockReset();
    vi.mocked(closeModal).mockReset();
    vi.mocked(openModal).mockReset();
    // Provide a DOM input element for submitEmailLogin
    if (!document.getElementById("adminLoginEmail")) {
      const input = document.createElement("input");
      input.id = "adminLoginEmail";
      input.value = "admin@example.com";
      document.body.appendChild(input);
    }
    registerAuthHandlers();
  });

  it("submitEmailLogin calls loginOAuth with trimmed email", () => {
    document.getElementById("adminLoginEmail").value = "  test@test.com  ";
    getHandler("submitEmailLogin")();
    expect(loginOAuth).toHaveBeenCalledWith("test@test.com", "test@test.com", "", "email");
  });

  it("submitEmailLogin shows error toast when loginOAuth returns falsy", () => {
    vi.mocked(loginOAuth).mockReturnValue(false);
    getHandler("submitEmailLogin")();
    expect(showToast).toHaveBeenCalledWith(expect.anything(), "error");
  });

  it("submitEmailLogin closes modal and switches to dashboard on success", () => {
    vi.mocked(loginOAuth).mockReturnValue({ name: "Admin" });
    getHandler("submitEmailLogin")();
    expect(closeModal).toHaveBeenCalledWith("authOverlay");
    expect(switchSection).toHaveBeenCalledWith("dashboard");
  });

  it("submitEmailLogin shows success toast when loginOAuth succeeds", () => {
    vi.mocked(loginOAuth).mockReturnValue({ name: "Admin" });
    getHandler("submitEmailLogin")();
    expect(showToast).toHaveBeenCalledWith(expect.anything(), "success");
  });

  it("signOut handler calls clearSession()", () => {
    getHandler("signOut")();
    expect(clearSession).toHaveBeenCalledOnce();
  });

  it("signOut handler calls loginAnonymous()", () => {
    getHandler("signOut")();
    expect(loginAnonymous).toHaveBeenCalledOnce();
  });

  it("signOut handler switches to landing section", () => {
    getHandler("signOut")();
    expect(switchSection).toHaveBeenCalledWith("landing");
  });

  it("signOut handler shows info toast", () => {
    getHandler("signOut")();
    expect(showToast).toHaveBeenCalledWith(expect.anything(), "info");
  });

  it("showAuthOverlay handler opens authOverlay modal", () => {
    getHandler("showAuthOverlay")();
    expect(openModal).toHaveBeenCalledWith("authOverlay");
  });

  it("hideAuthOverlay handler closes authOverlay modal", () => {
    getHandler("hideAuthOverlay")();
    expect(closeModal).toHaveBeenCalledWith("authOverlay");
  });

  it("loginFacebook handler returns early if window.FB is absent", () => {
    const orig = window.FB;
    delete window.FB;
    expect(() => getHandler("loginFacebook")()).not.toThrow();
    if (orig !== undefined) window.FB = orig;
  });

  it("loginApple handler returns early if window.AppleID is absent", () => {
    const orig = window.AppleID;
    delete window.AppleID;
    expect(() => getHandler("loginApple")()).not.toThrow();
    if (orig !== undefined) window.AppleID = orig;
  });
});

