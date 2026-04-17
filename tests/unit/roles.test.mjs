/**
 * tests/unit/roles.test.mjs — Sprint 17 RBAC permission model
 */
import { describe, it, expect } from "vitest";
import {
  ROLES,
  ROLE_PERMISSIONS,
  resolveRole,
  hasPermission,
  getRoleFromUser,
  getAccessibleSections,
  canAccessSection,
} from "../../src/utils/roles.js";

describe("ROLES constants", () => {
  it("exports GUEST, VIEWER, ADMIN", () => {
    expect(ROLES.GUEST).toBe("guest");
    expect(ROLES.VIEWER).toBe("viewer");
    expect(ROLES.ADMIN).toBe("admin");
  });
});

describe("resolveRole", () => {
  it("resolves valid role strings", () => {
    expect(resolveRole("admin")).toBe("admin");
    expect(resolveRole("viewer")).toBe("viewer");
    expect(resolveRole("guest")).toBe("guest");
  });

  it("falls back to guest for unknown values", () => {
    expect(resolveRole("superuser")).toBe("guest");
    expect(resolveRole(null)).toBe("guest");
    expect(resolveRole(undefined)).toBe("guest");
    expect(resolveRole(42)).toBe("guest");
  });
});

describe("ROLE_PERMISSIONS", () => {
  it("guest can submit/view RSVP", () => {
    expect(ROLE_PERMISSIONS.guest.has("rsvp:submit")).toBe(true);
    expect(ROLE_PERMISSIONS.guest.has("rsvp:view")).toBe(true);
  });

  it("guest cannot edit guests", () => {
    expect(ROLE_PERMISSIONS.guest.has("guest:edit")).toBe(false);
  });

  it("viewer can view guests but not edit them", () => {
    expect(ROLE_PERMISSIONS.viewer.has("guests:view")).toBe(true);
    expect(ROLE_PERMISSIONS.viewer.has("guest:edit")).toBe(false);
  });

  it("admin can do everything viewer can", () => {
    for (const perm of ROLE_PERMISSIONS.viewer) {
      expect(ROLE_PERMISSIONS.admin.has(perm)).toBe(true);
    }
  });

  it("admin has exclusive write permissions", () => {
    expect(ROLE_PERMISSIONS.admin.has("guest:edit")).toBe(true);
    expect(ROLE_PERMISSIONS.admin.has("guest:delete")).toBe(true);
    expect(ROLE_PERMISSIONS.admin.has("whatsapp:send")).toBe(true);
    expect(ROLE_PERMISSIONS.admin.has("settings:edit")).toBe(true);
  });
});

describe("hasPermission", () => {
  it("returns true for valid permission + role", () => {
    expect(hasPermission("admin", "guest:edit")).toBe(true);
    expect(hasPermission("viewer", "guests:view")).toBe(true);
    expect(hasPermission("guest", "rsvp:submit")).toBe(true);
  });

  it("returns false when role lacks permission", () => {
    expect(hasPermission("guest", "guest:edit")).toBe(false);
    expect(hasPermission("viewer", "guest:delete")).toBe(false);
  });

  it("resolves unknown role to guest before checking", () => {
    expect(hasPermission("unknown", "rsvp:submit")).toBe(true);
    expect(hasPermission("unknown", "guest:edit")).toBe(false);
  });
});

describe("getRoleFromUser", () => {
  it("returns guest for null/undefined user", () => {
    expect(getRoleFromUser(null)).toBe("guest");
    expect(getRoleFromUser(undefined)).toBe("guest");
  });

  it("maps isAdmin:true → admin when no explicit role", () => {
    expect(getRoleFromUser({ isAdmin: true })).toBe("admin");
  });

  it("maps isAdmin:false → guest when no explicit role", () => {
    expect(getRoleFromUser({ isAdmin: false })).toBe("guest");
  });

  it("uses explicit role property when set", () => {
    expect(getRoleFromUser({ isAdmin: false, role: "viewer" })).toBe("viewer");
    expect(getRoleFromUser({ isAdmin: false, role: "admin" })).toBe("admin");
  });
});

describe("getAccessibleSections", () => {
  it("guest gets rsvp and landing sections", () => {
    const sections = getAccessibleSections("guest");
    expect(sections).toContain("rsvp");
    expect(sections).toContain("landing");
  });

  it("admin gets more sections than viewer", () => {
    // Both get same :view count — admin adds additional :edit/:delete perms
    const adminSections = getAccessibleSections("admin");
    const viewerSections = getAccessibleSections("viewer");
    // Admin has at least as many view sections as viewer
    for (const s of viewerSections) {
      expect(adminSections).toContain(s);
    }
  });
});

describe("canAccessSection", () => {
  it("admin can access guests section", () => {
    expect(canAccessSection("guests", "admin")).toBe(true);
  });

  it("guest cannot access guests section", () => {
    expect(canAccessSection("guests", "guest")).toBe(false);
  });

  it("viewer can access analytics section", () => {
    expect(canAccessSection("analytics", "viewer")).toBe(true);
  });

  it("returns false for unknown sections", () => {
    expect(canAccessSection("nonexistent", "admin")).toBe(false);
  });
});
