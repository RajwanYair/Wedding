// tests/unit/workspace-invite.test.mjs — S626 workspace invitation helpers
import { describe, it, expect } from "vitest";
import {
  INVITE_STATUSES,
  INVITABLE_ROLES,
  validateInvite,
  createInvite,
  acceptInvite,
  revokeInvite,
  hasPendingInvite,
  inviteStats,
} from "../../src/utils/workspace-invite.js";

describe("workspace-invite", () => {
  const base = { workspaceId: "ws1", email: "a@b.com", role: "co-planner", invitedBy: "u1" };

  describe("constants", () => {
    it("has 4 invite statuses", () => {
      expect(INVITE_STATUSES).toHaveLength(4);
    });
    it("has 4 invitable roles", () => {
      expect(INVITABLE_ROLES).toHaveLength(4);
      expect(INVITABLE_ROLES).not.toContain("owner");
    });
  });

  describe("validateInvite", () => {
    it("passes valid input", () => {
      expect(validateInvite(base)).toEqual([]);
    });
    it("rejects bad email", () => {
      expect(validateInvite({ ...base, email: "nope" }).length).toBeGreaterThan(0);
    });
    it("rejects owner role", () => {
      expect(validateInvite({ ...base, role: "owner" }).length).toBeGreaterThan(0);
    });
    it("rejects missing workspaceId", () => {
      expect(validateInvite({ ...base, workspaceId: "" }).length).toBeGreaterThan(0);
    });
  });

  describe("createInvite", () => {
    it("creates a pending invite", () => {
      const { ok, invite } = createInvite(base);
      expect(ok).toBe(true);
      expect(invite.status).toBe("pending");
      expect(invite.email).toBe("a@b.com");
    });
    it("lowercases email", () => {
      const { invite } = createInvite({ ...base, email: "A@B.COM" });
      expect(invite.email).toBe("a@b.com");
    });
    it("fails without invitedBy", () => {
      const { ok, errors } = createInvite({ ...base, invitedBy: "" });
      expect(ok).toBe(false);
      expect(errors.length).toBeGreaterThan(0);
    });
    it("sets expiry", () => {
      const { invite } = createInvite({ ...base, expiryDays: 3 });
      expect(invite.expiresAt).toBeTruthy();
    });
  });

  describe("acceptInvite", () => {
    it("accepts a pending invite", () => {
      const { invite } = createInvite(base);
      const result = acceptInvite(invite, new Date().toISOString());
      expect(result.ok).toBe(true);
      expect(result.invite.status).toBe("accepted");
      expect(result.invite.acceptedAt).toBeTruthy();
    });
    it("rejects non-pending invite", () => {
      expect(acceptInvite({ status: "accepted" }).ok).toBe(false);
    });
    it("rejects expired invite", () => {
      const { invite } = createInvite({ ...base, expiryDays: 0 });
      const future = new Date(Date.now() + 86_400_000).toISOString();
      expect(acceptInvite(invite, future).ok).toBe(false);
    });
    it("handles null", () => {
      expect(acceptInvite(null).ok).toBe(false);
    });
  });

  describe("revokeInvite", () => {
    it("revokes a pending invite", () => {
      const { invite } = createInvite(base);
      const result = revokeInvite(invite);
      expect(result.ok).toBe(true);
      expect(result.invite.status).toBe("revoked");
    });
    it("rejects non-pending", () => {
      expect(revokeInvite({ status: "accepted" }).ok).toBe(false);
    });
  });

  describe("hasPendingInvite", () => {
    it("finds pending invite", () => {
      const { invite } = createInvite(base);
      expect(hasPendingInvite([invite], "a@b.com", "ws1")).toBe(true);
    });
    it("ignores accepted invites", () => {
      const inv = { ...createInvite(base).invite, status: "accepted" };
      expect(hasPendingInvite([inv], "a@b.com", "ws1")).toBe(false);
    });
    it("returns false for empty", () => {
      expect(hasPendingInvite([], "a@b.com", "ws1")).toBe(false);
    });
  });

  describe("inviteStats", () => {
    it("counts by status", () => {
      const invites = [
        { workspaceId: "ws1", status: "pending" },
        { workspaceId: "ws1", status: "accepted" },
        { workspaceId: "ws1", status: "expired" },
        { workspaceId: "ws2", status: "pending" },
      ];
      const s = inviteStats(invites, "ws1");
      expect(s.total).toBe(3);
      expect(s.pending).toBe(1);
      expect(s.accepted).toBe(1);
      expect(s.expired).toBe(1);
    });
    it("handles null", () => {
      expect(inviteStats(null, "ws1").total).toBe(0);
    });
  });
});
