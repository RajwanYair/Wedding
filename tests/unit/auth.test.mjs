/**
 * tests/unit/auth.test.mjs — Unit tests for src/services/auth.js (S6.6)
 * Covers: isApprovedAdmin, loginOAuth, loginAnonymous, currentUser,
 *         saveSession/clearSession, maybeRotateSession
 *
 * Run: npm test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  isApprovedAdmin,
  loginOAuth,
  loginAnonymous,
  currentUser,
  saveSession,
  clearSession,
  maybeRotateSession,
} from "../../src/services/auth.js";

beforeEach(() => {
  clearSession();
});

// ── isApprovedAdmin ───────────────────────────────────────────────────────────
describe("isApprovedAdmin", () => {
  it("returns boolean", () => {
    expect(typeof isApprovedAdmin("anyone@example.com")).toBe("boolean");
  });

  it("is case-insensitive", () => {
    // Both calls should agree — don't hardcode an admin email that may not exist
    const lower = isApprovedAdmin("admin@example.com");
    const upper = isApprovedAdmin("ADMIN@EXAMPLE.COM");
    expect(lower).toBe(upper);
  });

  it("rejects clearly garbage input", () => {
    expect(isApprovedAdmin("")).toBe(false);
    expect(isApprovedAdmin("not_an_email")).toBe(false);
  });
});

// ── loginOAuth ───────────────────────────────────────────────────────────────
describe("loginOAuth", () => {
  it("returns null for non-approved email", () => {
    const result = loginOAuth("stranger@example.com", "Stranger", "", "google");
    expect(result).toBeNull();
  });

  it("user is null after failed login", () => {
    loginOAuth("stranger@example.com", "X", "", "google");
    expect(currentUser()).toBeNull();
  });
});

// ── loginAnonymous ───────────────────────────────────────────────────────────
describe("loginAnonymous", () => {
  it("returns a guest user object with isAdmin=false", () => {
    const user = loginAnonymous();
    expect(user).toBeTruthy();
    expect(user.isAdmin).toBe(false);
  });

  it("sets currentUser after anonymous login", () => {
    loginAnonymous();
    expect(currentUser()).not.toBeNull();
    expect(currentUser()?.isAdmin).toBe(false);
  });

  it("provider is 'anonymous'", () => {
    const user = loginAnonymous();
    expect(user.provider).toBe("anonymous");
  });
});

// ── saveSession / clearSession / currentUser ──────────────────────────────────
describe("saveSession / clearSession", () => {
  it("saves and retrieves user", () => {
    const user = { uid: "u1", email: "a@b.com", name: "A", picture: "", provider: "email", isAdmin: true, loginAt: Date.now() };
    saveSession(user);
    expect(currentUser()).toMatchObject({ uid: "u1", email: "a@b.com" });
  });

  it("clearSession sets currentUser to null", () => {
    saveSession({ uid: "u2", email: "b@b.com", name: "B", picture: "", provider: "email", isAdmin: true, loginAt: Date.now() });
    clearSession();
    expect(currentUser()).toBeNull();
  });
});

// ── maybeRotateSession ────────────────────────────────────────────────────────
describe("maybeRotateSession", () => {
  it("does not throw when no user logged in", () => {
    expect(() => maybeRotateSession()).not.toThrow();
  });

  it("does not throw with a fresh session (loginAt = now)", () => {
    saveSession({ uid: "u3", email: "c@c.com", name: "C", picture: "", provider: "email", isAdmin: true, loginAt: Date.now() });
    expect(() => maybeRotateSession()).not.toThrow();
  });
});
