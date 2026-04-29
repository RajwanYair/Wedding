/**
 * tests/unit/workspace-roles.test.mjs — S132 RBAC helpers.
 */
import { describe, it, expect } from "vitest";
import {
  WORKSPACE_ROLES,
  hasPermission,
  compareRoles,
  canAssignRole,
  filterByRole,
  newMember,
} from "../../src/services/workspace.js";

describe("S132 — workspace-roles", () => {
  it("WORKSPACE_ROLES contains 5 known roles", () => {
    expect(WORKSPACE_ROLES).toEqual([
      "owner",
      "co_planner",
      "vendor",
      "photographer",
      "guest",
    ]);
  });

  it("hasPermission baseline", () => {
    expect(hasPermission("owner", "billing")).toBe(true);
    expect(hasPermission("co_planner", "billing")).toBe(false);
    expect(hasPermission("guest", "write")).toBe(false);
    expect(hasPermission("nope", "read")).toBe(false);
  });

  it("compareRoles ranks owner > co_planner > vendor > photographer > guest", () => {
    expect(compareRoles("owner", "guest")).toBe(1);
    expect(compareRoles("guest", "owner")).toBe(-1);
    expect(compareRoles("vendor", "vendor")).toBe(0);
  });

  it("canAssignRole — owner can do anything", () => {
    expect(canAssignRole("owner", "guest", "co_planner")).toBe(true);
    expect(canAssignRole("owner", "co_planner", "owner")).toBe(true);
  });

  it("canAssignRole — co_planner cannot promote to owner / cannot replace equals", () => {
    expect(canAssignRole("co_planner", "guest", "owner")).toBe(false);
    expect(canAssignRole("co_planner", "co_planner", "vendor")).toBe(false);
    expect(canAssignRole("co_planner", "guest", "vendor")).toBe(true);
  });

  it("canAssignRole — guest cannot invite anyone", () => {
    expect(canAssignRole("guest", "guest", "guest")).toBe(false);
  });

  it("filterByRole strips disallowed perms", () => {
    expect(filterByRole("guest", ["read", "write", "billing"])).toEqual(["read"]);
  });

  it("newMember validates email + role", () => {
    const m = newMember({ email: "  Foo@Bar.COM ", role: "vendor" });
    expect(m.email).toBe("foo@bar.com");
    expect(m.role).toBe("vendor");
    expect(m.status).toBe("pending");
    expect(() => newMember({ email: "broken", role: "guest" })).toThrow();
    expect(() => newMember({ email: "ok@ok.com", role: "admin" })).toThrow();
  });
});
