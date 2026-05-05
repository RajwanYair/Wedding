/**
 * tests/unit/s694-plugin-permissions-ui.test.mjs
 * S694 — Plugin permissions UI: risk score display, dangerous permission detection,
 * permission chip rendering helpers via plugin-permission utils.
 */
import { describe, it, expect } from "vitest";
import {
  getRiskScore,
  getDangerousPermissions,
  getPermissionDescription,
  getPermissionSummary,
  getAllScopes,
  isSandboxed,
} from "../../src/utils/plugin-permission.js";

const safe = {
  id: "p-safe",
  name: "Safe Plugin",
  version: "1.0.0",
  permissions: ["read:guests", "ui:notification"],
  author: "Test",
  trusted: false,
};

const risky = {
  id: "p-risky",
  name: "Risky Plugin",
  version: "1.0.0",
  permissions: ["write:settings", "network:fetch", "storage:local"],
  author: "Test",
  trusted: false,
};

const mixed = {
  id: "p-mixed",
  name: "Mixed Plugin",
  version: "1.0.0",
  permissions: ["read:guests", "write:tables", "ui:modal"],
  author: "Test",
  trusted: false,
};

const trusted = {
  id: "p-trusted",
  name: "Trusted Plugin",
  version: "1.0.0",
  permissions: ["write:settings", "network:fetch"],
  author: "Corp",
  trusted: true,
};

describe("S694 plugin permissions UI — risk scoring", () => {
  it("scores a safe plugin as 0", () => {
    expect(getRiskScore(safe)).toBe(0);
  });

  it("scores a risky plugin above 70", () => {
    expect(getRiskScore(risky)).toBeGreaterThanOrEqual(70);
  });

  it("scores a mixed plugin between 1 and 69", () => {
    const score = getRiskScore(mixed);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(70);
  });

  it("scores a trusted plugin as 0 regardless of dangerous perms", () => {
    expect(getRiskScore(trusted)).toBe(0);
  });
});

describe("S694 plugin permissions UI — dangerous permission detection", () => {
  it("returns empty array for safe plugin", () => {
    expect(getDangerousPermissions(safe)).toHaveLength(0);
  });

  it("detects all 3 dangerous scopes in risky plugin", () => {
    const dangerous = getDangerousPermissions(risky);
    expect(dangerous).toContain("write:settings");
    expect(dangerous).toContain("network:fetch");
    expect(dangerous).toContain("storage:local");
  });

  it("returns only dangerous perms from mixed list", () => {
    // write:tables is a write perm but not in DANGEROUS_SCOPES
    expect(getDangerousPermissions(mixed)).toHaveLength(0);
  });
});

describe("S694 plugin permissions UI — permission descriptions", () => {
  it("returns human-readable description for known scope", () => {
    const desc = getPermissionDescription("read:guests");
    expect(typeof desc).toBe("string");
    expect(desc.length).toBeGreaterThan(5);
  });

  it("returns fallback for unknown scope", () => {
    const desc = getPermissionDescription(/** @type {any} */ ("bogus:scope"));
    expect(typeof desc).toBe("string");
  });

  it("all scopes from getAllScopes() have non-empty descriptions", () => {
    for (const { scope, description } of getAllScopes()) {
      expect(description.length, `scope ${scope} has empty description`).toBeGreaterThan(0);
    }
  });
});

describe("S694 plugin permissions UI — permission summary", () => {
  it("counts read, write, ui, dangerous correctly for safe plugin", () => {
    const s = getPermissionSummary(safe);
    expect(s.read).toBe(1);
    expect(s.write).toBe(0);
    expect(s.ui).toBe(1);
    expect(s.dangerous).toBe(0);
    expect(s.riskScore).toBe(0);
    expect(s.total).toBe(2);
  });

  it("counts all dangerous scopes for risky plugin", () => {
    const s = getPermissionSummary(risky);
    expect(s.dangerous).toBe(3);
    expect(s.riskScore).toBeGreaterThanOrEqual(70);
  });

  it("reports correct total permissions", () => {
    const s = getPermissionSummary(mixed);
    expect(s.total).toBe(3);
  });
});

describe("S694 plugin permissions UI — sandbox detection", () => {
  it("marks safe untrusted plugin as sandboxed", () => {
    expect(isSandboxed(safe)).toBe(true);
  });

  it("marks risky plugin as NOT sandboxed (has dangerous perms)", () => {
    expect(isSandboxed(risky)).toBe(false);
  });

  it("marks trusted plugin as NOT sandboxed", () => {
    expect(isSandboxed(trusted)).toBe(false);
  });
});
