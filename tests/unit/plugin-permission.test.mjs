import { describe, it, expect } from "vitest";
import {
  validateManifest,
  checkPermission,
  checkPermissions,
  getDangerousPermissions,
  isSandboxed,
  getPermissionDescription,
  getAllScopes,
  getRiskScore,
  getPermissionSummary,
} from "../../src/utils/plugin-permission.js";

const VALID_MANIFEST = {
  id: "plugin-1",
  name: "Test Plugin",
  version: "1.0.0",
  permissions: ["read:guests", "ui:notification"],
  author: "Test",
  trusted: false,
};

describe("S671 plugin-permission", () => {
  describe("validateManifest", () => {
    it("validates a correct manifest", () => {
      const result = validateManifest(VALID_MANIFEST);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects missing id", () => {
      const result = validateManifest({ ...VALID_MANIFEST, id: "" });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("id");
    });

    it("rejects unknown permissions", () => {
      const result = validateManifest({ ...VALID_MANIFEST, permissions: ["bogus:scope"] });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Unknown permission");
    });

    it("rejects non-array permissions", () => {
      const result = validateManifest({ ...VALID_MANIFEST, permissions: "read:guests" });
      expect(result.valid).toBe(false);
    });
  });

  describe("checkPermission", () => {
    it("grants declared permission", () => {
      const result = checkPermission(VALID_MANIFEST, "read:guests");
      expect(result.granted).toBe(true);
    });

    it("denies undeclared permission", () => {
      const result = checkPermission(VALID_MANIFEST, "write:guests");
      expect(result.granted).toBe(false);
      expect(result.reason).toContain("lacks");
    });
  });

  describe("checkPermissions", () => {
    it("checks multiple at once", () => {
      const result = checkPermissions(VALID_MANIFEST, ["read:guests", "write:guests"]);
      expect(result.allGranted).toBe(false);
      expect(result.results[0].granted).toBe(true);
      expect(result.results[1].granted).toBe(false);
    });

    it("all granted when all present", () => {
      const result = checkPermissions(VALID_MANIFEST, ["read:guests", "ui:notification"]);
      expect(result.allGranted).toBe(true);
    });
  });

  describe("getDangerousPermissions", () => {
    it("returns dangerous permissions in manifest", () => {
      const manifest = { ...VALID_MANIFEST, permissions: ["read:guests", "network:fetch", "storage:local"] };
      expect(getDangerousPermissions(manifest)).toEqual(["network:fetch", "storage:local"]);
    });

    it("returns empty for safe manifest", () => {
      expect(getDangerousPermissions(VALID_MANIFEST)).toHaveLength(0);
    });
  });

  describe("isSandboxed", () => {
    it("returns true for untrusted plugin with no dangerous perms", () => {
      expect(isSandboxed(VALID_MANIFEST)).toBe(true);
    });

    it("returns false for trusted plugin", () => {
      expect(isSandboxed({ ...VALID_MANIFEST, trusted: true })).toBe(false);
    });

    it("returns false when has dangerous perms", () => {
      const manifest = { ...VALID_MANIFEST, permissions: ["network:fetch"] };
      expect(isSandboxed(manifest)).toBe(false);
    });
  });

  describe("getPermissionDescription", () => {
    it("returns description for known scope", () => {
      expect(getPermissionDescription("read:guests")).toBe("Read guest list data");
    });

    it("returns fallback for unknown", () => {
      expect(getPermissionDescription("bogus")).toBe("Unknown permission");
    });
  });

  describe("getAllScopes", () => {
    it("returns all available scopes", () => {
      const scopes = getAllScopes();
      expect(scopes.length).toBeGreaterThan(10);
      expect(scopes[0]).toHaveProperty("scope");
      expect(scopes[0]).toHaveProperty("dangerous");
    });
  });

  describe("getRiskScore", () => {
    it("returns 0 for trusted plugins", () => {
      expect(getRiskScore({ ...VALID_MANIFEST, trusted: true })).toBe(0);
    });

    it("returns higher score for dangerous perms", () => {
      const manifest = { ...VALID_MANIFEST, permissions: ["network:fetch", "write:settings", "write:guests"] };
      expect(getRiskScore(manifest)).toBeGreaterThan(50);
    });

    it("caps at 100", () => {
      const manifest = { ...VALID_MANIFEST, permissions: ["network:fetch", "storage:local", "write:settings", "write:guests", "write:vendors", "write:tables"] };
      expect(getRiskScore(manifest)).toBeLessThanOrEqual(100);
    });
  });

  describe("getPermissionSummary", () => {
    it("returns categorized summary", () => {
      const manifest = { ...VALID_MANIFEST, permissions: ["read:guests", "write:guests", "ui:modal", "network:fetch"] };
      const summary = getPermissionSummary(manifest);
      expect(summary.total).toBe(4);
      expect(summary.read).toBe(1);
      expect(summary.write).toBe(1);
      expect(summary.ui).toBe(1);
      expect(summary.dangerous).toBe(1);
      expect(summary.riskScore).toBeGreaterThan(0);
    });
  });
});
