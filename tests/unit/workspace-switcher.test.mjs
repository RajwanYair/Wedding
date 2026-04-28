/**
 * tests/unit/workspace-switcher.test.mjs — Sprint 140 workspace switcher + role badges
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  WORKSPACE_ROLES,
  hasPermission,
  compareRoles,
  canAssignRole,
  newMember,
  filterByRole,
} from "../../src/services/workspace-roles.js";

describe("WorkspaceSwitcher (Sprint 140)", () => {
  describe("role badges & permissions", () => {
    it("WORKSPACE_ROLES includes all roles", () => {
      expect(WORKSPACE_ROLES).toContain("owner");
      expect(WORKSPACE_ROLES).toContain("co_planner");
      expect(WORKSPACE_ROLES).toContain("vendor");
      expect(WORKSPACE_ROLES).toContain("photographer");
      expect(WORKSPACE_ROLES).toContain("guest");
      expect(WORKSPACE_ROLES.length).toBe(5);
    });

    it("owner has all permissions", () => {
      expect(hasPermission("owner", "read")).toBe(true);
      expect(hasPermission("owner", "write")).toBe(true);
      expect(hasPermission("owner", "approve")).toBe(true);
      expect(hasPermission("owner", "invite")).toBe(true);
      expect(hasPermission("owner", "billing")).toBe(true);
    });

    it("guest only has read permission", () => {
      expect(hasPermission("guest", "read")).toBe(true);
      expect(hasPermission("guest", "write")).toBe(false);
      expect(hasPermission("guest", "invite")).toBe(false);
    });

    it("co_planner has invite but not billing", () => {
      expect(hasPermission("co_planner", "invite")).toBe(true);
      expect(hasPermission("co_planner", "billing")).toBe(false);
    });

    it("vendor has read+write but not approve", () => {
      expect(hasPermission("vendor", "read")).toBe(true);
      expect(hasPermission("vendor", "write")).toBe(true);
      expect(hasPermission("vendor", "approve")).toBe(false);
    });

    it("unknown role has no permissions", () => {
      expect(hasPermission("unknown", "read")).toBe(false);
    });
  });

  describe("compareRoles", () => {
    it("owner > co_planner", () => {
      expect(compareRoles("owner", "co_planner")).toBe(1);
    });

    it("guest < vendor", () => {
      expect(compareRoles("guest", "vendor")).toBe(-1);
    });

    it("same rank returns 0", () => {
      expect(compareRoles("vendor", "vendor")).toBe(0);
    });
  });

  describe("canAssignRole", () => {
    it("owner can assign any role", () => {
      expect(canAssignRole("owner", "guest", "vendor")).toBe(true);
      expect(canAssignRole("owner", "vendor", "co_planner")).toBe(true);
    });

    it("co_planner cannot promote to owner", () => {
      expect(canAssignRole("co_planner", "guest", "owner")).toBe(false);
    });

    it("guest cannot assign any role", () => {
      expect(canAssignRole("guest", "guest", "vendor")).toBe(false);
    });

    it("co_planner can demote vendor to guest", () => {
      expect(canAssignRole("co_planner", "vendor", "guest")).toBe(true);
    });
  });

  describe("newMember", () => {
    it("creates a pending member", () => {
      const m = newMember({ email: "a@b.com", role: "vendor", invitedBy: "x" });
      expect(m.email).toBe("a@b.com");
      expect(m.role).toBe("vendor");
      expect(m.status).toBe("pending");
    });

    it("rejects invalid email", () => {
      expect(() => newMember({ email: "bad" })).toThrow("invalid_email");
    });

    it("rejects invalid role", () => {
      expect(() => newMember({ email: "a@b.com", role: "superadmin" })).toThrow("invalid_role");
    });

    it("defaults to guest role", () => {
      const m = newMember({ email: "a@b.com" });
      expect(m.role).toBe("guest");
    });
  });

  describe("filterByRole", () => {
    it("filters permissions by role", () => {
      const perms = filterByRole("vendor", ["read", "write", "approve", "billing"]);
      expect(perms).toEqual(["read", "write"]);
    });

    it("returns empty for no matching perms", () => {
      const perms = filterByRole("guest", ["approve", "billing"]);
      expect(perms).toEqual([]);
    });
  });
});
