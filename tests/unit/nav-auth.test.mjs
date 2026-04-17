/**
 * tests/unit/nav-auth.test.mjs — Sprint 190
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/core/i18n.js", () => ({ t: vi.fn((k) => k) }));
vi.mock("../../src/core/status-bar.js", () => ({ updateStatusBar: vi.fn() }));
vi.mock("../../src/core/whats-new.js", () => ({ maybeShowWhatsNew: vi.fn() }));

import { updateNavForAuth } from "../../src/core/nav-auth.js";
import { updateStatusBar } from "../../src/core/status-bar.js";
import { maybeShowWhatsNew } from "../../src/core/whats-new.js";

/** Build the nav-related DOM elements */
function buildDom() {
  const ids = ["btnSignIn", "btnSignOut", "userAvatar", "userDisplayName", "userRoleBadge"];
  ids.forEach((id) => {
    document.getElementById(id)?.remove();
    const el = document.createElement(id === "userAvatar" ? "img" : "button");
    el.id = id;
    document.body.appendChild(el);
  });
  // Admin-only nav items
  const nav = document.createElement("a");
  nav.dataset.adminOnly = "";
  nav.id = "adminNavItem";
  document.body.appendChild(nav);
}

beforeEach(() => {
  buildDom();
  vi.clearAllMocks();
});

describe("updateNavForAuth — guest/null user", () => {
  it("hides sign-out button for guest", () => {
    updateNavForAuth(null);
    expect(document.getElementById("btnSignOut")?.classList.contains("u-hidden")).toBe(true);
  });

  it("shows sign-in button for guest", () => {
    updateNavForAuth(null);
    expect(document.getElementById("btnSignIn")?.classList.contains("u-hidden")).toBe(false);
  });

  it("hides admin-only nav items for guest", () => {
    updateNavForAuth(null);
    expect(document.getElementById("adminNavItem")?.classList.contains("u-hidden")).toBe(true);
  });

  it("clears userDisplayName for guest", () => {
    updateNavForAuth(null);
    expect(document.getElementById("userDisplayName")?.textContent).toBe("");
  });

  it("calls updateStatusBar with null", () => {
    updateNavForAuth(null);
    expect(updateStatusBar).toHaveBeenCalledWith(null);
  });

  it("calls maybeShowWhatsNew with null", () => {
    updateNavForAuth(null);
    expect(maybeShowWhatsNew).toHaveBeenCalledWith(null);
  });
});

describe("updateNavForAuth — admin user", () => {
  const admin = { isAdmin: true, name: "Alice", email: "alice@example.com", picture: "" };

  it("shows sign-out and hides sign-in for admin", () => {
    updateNavForAuth(admin);
    expect(document.getElementById("btnSignOut")?.classList.contains("u-hidden")).toBe(false);
    expect(document.getElementById("btnSignIn")?.classList.contains("u-hidden")).toBe(true);
  });

  it("shows admin-only nav items", () => {
    updateNavForAuth(admin);
    expect(document.getElementById("adminNavItem")?.classList.contains("u-hidden")).toBe(false);
  });

  it("sets userDisplayName to admin name", () => {
    updateNavForAuth(admin);
    expect(document.getElementById("userDisplayName")?.textContent).toBe("Alice");
  });

  it("does not throw when DOM elements are absent", () => {
    ["btnSignIn", "btnSignOut", "userAvatar", "userDisplayName", "userRoleBadge"].forEach(
      (id) => document.getElementById(id)?.remove(),
    );
    expect(() => updateNavForAuth(admin)).not.toThrow();
  });
});
