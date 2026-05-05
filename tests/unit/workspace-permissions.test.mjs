import { describe, it, expect } from "vitest";
import {
  ROLES,
  ACTION_ROLES,
  roleLevel,
  canPerform,
  allowedActions,
  outranks,
  canChangeRole,
  roleSummary,
  membersWhoCanPerform,
} from "../../src/utils/workspace-permissions.js";

describe("workspace-permissions", () => {
  describe("ROLES", () => {
    it("defines 4 roles in ascending privilege", () => {
      expect(ROLES).toEqual(["viewer", "editor", "admin", "owner"]);
    });

    it("is frozen", () => {
      expect(Object.isFrozen(ROLES)).toBe(true);
    });
  });

  describe("roleLevel", () => {
    it("returns correct levels", () => {
      expect(roleLevel("viewer")).toBe(0);
      expect(roleLevel("owner")).toBe(3);
    });

    it("returns -1 for unknown", () => {
      expect(roleLevel("superadmin")).toBe(-1);
    });
  });

  describe("canPerform", () => {
    it("allows owner to do anything", () => {
      expect(canPerform("owner", "delete:workspace")).toBe(true);
      expect(canPerform("owner", "view:guests")).toBe(true);
    });

    it("prevents viewer from editing", () => {
      expect(canPerform("viewer", "edit:guests")).toBe(false);
    });

    it("allows editor to edit", () => {
      expect(canPerform("editor", "edit:guests")).toBe(true);
    });

    it("returns false for unknown action", () => {
      expect(canPerform("owner", "fly:helicopter")).toBe(false);
    });
  });

  describe("allowedActions", () => {
    it("viewer can only view", () => {
      const actions = allowedActions("viewer");
      expect(actions.every((a) => a.startsWith("view:"))).toBe(true);
    });

    it("owner gets all actions", () => {
      const actions = allowedActions("owner");
      expect(actions.length).toBe(Object.keys(ACTION_ROLES).length);
    });

    it("unknown role gets nothing", () => {
      expect(allowedActions("hacker")).toEqual([]);
    });
  });

  describe("outranks", () => {
    it("admin outranks editor", () => {
      expect(outranks("admin", "editor")).toBe(true);
    });

    it("editor does not outrank admin", () => {
      expect(outranks("editor", "admin")).toBe(false);
    });

    it("same role does not outrank", () => {
      expect(outranks("admin", "admin")).toBe(false);
    });
  });

  describe("canChangeRole", () => {
    it("owner can promote viewer to editor", () => {
      expect(canChangeRole("owner", "viewer", "editor")).toBe(true);
    });

    it("admin cannot promote to owner", () => {
      expect(canChangeRole("admin", "viewer", "owner")).toBe(false);
    });

    it("editor cannot change roles", () => {
      expect(canChangeRole("editor", "viewer", "editor")).toBe(false);
    });
  });

  describe("roleSummary", () => {
    it("counts members by role", () => {
      const members = [
        { role: "viewer" }, { role: "viewer" }, { role: "editor" }, { role: "owner" },
      ];
      expect(roleSummary(members)).toEqual({ viewer: 2, editor: 1, owner: 1 });
    });

    it("returns empty for non-array", () => {
      expect(roleSummary(null)).toEqual({});
    });
  });

  describe("membersWhoCanPerform", () => {
    it("filters members who can edit", () => {
      const members = [
        { id: "u1", role: "viewer" },
        { id: "u2", role: "editor" },
        { id: "u3", role: "admin" },
      ];
      const result = membersWhoCanPerform(members, "edit:guests");
      expect(result.map((m) => m.id)).toEqual(["u2", "u3"]);
    });
  });
});
