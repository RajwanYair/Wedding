// tests/unit/workspace-members.test.mjs — S634 Workspace member CRUD
import { describe, it, expect } from "vitest";
import {
  addMember,
  removeMember,
  changeRole,
  setMemberStatus,
  memberCanPerform,
  memberStats,
} from "../../src/utils/workspace-members.js";

function makeMember(userId, role = "editor", status = "active") {
  return { userId, email: `${userId}@test.com`, displayName: userId, role, joinedAt: new Date().toISOString(), status };
}

describe("workspace-members", () => {
  describe("addMember", () => {
    it("adds a member", () => {
      const r = addMember([], { userId: "u1", email: "a@b.com", displayName: "A", role: "editor" });
      expect(r.ok).toBe(true);
      expect(r.members).toHaveLength(1);
      expect(r.members[0].email).toBe("a@b.com");
    });
    it("rejects duplicate userId", () => {
      const r = addMember([makeMember("u1")], { userId: "u1", email: "x@y.com", displayName: "X", role: "editor" });
      expect(r.ok).toBe(false);
    });
    it("requires userId", () => {
      expect(addMember([], { email: "x@y.com" }).ok).toBe(false);
    });
    it("defaults role to guest", () => {
      const r = addMember([], { userId: "u1", email: "a@b.com", displayName: "A" });
      expect(r.members[0].role).toBe("guest");
    });
    it("lowercases email", () => {
      const r = addMember([], { userId: "u1", email: "  A@B.COM  ", displayName: "A" });
      expect(r.members[0].email).toBe("a@b.com");
    });
  });

  describe("removeMember", () => {
    it("removes a member", () => {
      const r = removeMember([makeMember("u1"), makeMember("u2")], "u1");
      expect(r.ok).toBe(true);
      expect(r.members).toHaveLength(1);
    });
    it("cannot remove the last owner", () => {
      const r = removeMember([makeMember("u1", "owner")], "u1");
      expect(r.ok).toBe(false);
      expect(r.error).toContain("last owner");
    });
    it("returns error for unknown member", () => {
      expect(removeMember([makeMember("u1")], "u99").ok).toBe(false);
    });
  });

  describe("changeRole", () => {
    it("changes role", () => {
      const r = changeRole([makeMember("u1", "editor")], "u1", "admin");
      expect(r.ok).toBe(true);
      expect(r.members[0].role).toBe("admin");
    });
    it("cannot demote the last owner", () => {
      const r = changeRole([makeMember("u1", "owner")], "u1", "editor");
      expect(r.ok).toBe(false);
    });
    it("allows demote when multiple owners", () => {
      const r = changeRole([makeMember("u1", "owner"), makeMember("u2", "owner")], "u1", "editor");
      expect(r.ok).toBe(true);
    });
  });

  describe("setMemberStatus", () => {
    it("suspends a member", () => {
      const r = setMemberStatus([makeMember("u1", "editor")], "u1", "suspended");
      expect(r.ok).toBe(true);
      expect(r.members[0].status).toBe("suspended");
    });
    it("cannot suspend the last owner", () => {
      const r = setMemberStatus([makeMember("u1", "owner")], "u1", "suspended");
      expect(r.ok).toBe(false);
    });
    it("reactivates a suspended member", () => {
      const r = setMemberStatus([makeMember("u1", "editor", "suspended")], "u1", "active");
      expect(r.ok).toBe(true);
      expect(r.members[0].status).toBe("active");
    });
  });

  describe("memberCanPerform", () => {
    it("allows action for active member", () => {
      expect(memberCanPerform([makeMember("u1", "owner")], "u1", "members:remove")).toBe(true);
    });
    it("denies action for suspended member", () => {
      expect(memberCanPerform([makeMember("u1", "owner", "suspended")], "u1", "members:remove")).toBe(false);
    });
    it("denies for unknown user", () => {
      expect(memberCanPerform([makeMember("u1")], "u99", "guests:read")).toBe(false);
    });
  });

  describe("memberStats", () => {
    it("returns correct stats", () => {
      const members = [makeMember("u1", "owner"), makeMember("u2", "editor"), makeMember("u3", "guest", "suspended")];
      const stats = memberStats(members);
      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.suspended).toBe(1);
      expect(stats.byRole.owner).toBe(1);
    });
    it("handles empty list", () => {
      expect(memberStats([]).total).toBe(0);
    });
  });
});
