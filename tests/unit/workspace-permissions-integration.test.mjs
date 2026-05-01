/**
 * S610 smoke test — workspace permission matrix helpers wired in.
 *
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  canPerformWorkspaceAction,
  canAssignWorkspaceRole,
  getWorkspacePermissionMatrix,
  getWorkspaceRoleRank,
} from "../../src/sections/workspace-switcher.js";

const SECTION = readFileSync("src/sections/workspace-switcher.js", "utf8");

describe("S610 workspace permission matrix wiring", () => {
  it("imports helpers from utils/workspace-ui-roles.js", () => {
    expect(SECTION).toMatch(/from\s+"\.\.\/utils\/workspace-ui-roles\.js"/);
    expect(SECTION).toMatch(/canPerform/);
    expect(SECTION).toMatch(/canAssignRole/);
    expect(SECTION).toMatch(/roleRank/);
  });

  it("canPerformWorkspaceAction respects the matrix", () => {
    expect(canPerformWorkspaceAction("owner", "members:invite")).toBe(true);
    expect(canPerformWorkspaceAction("guest", "members:invite")).toBe(false);
  });

  it("normalises legacy co_planner role", () => {
    expect(canPerformWorkspaceAction("co_planner", "guests:write")).toBe(true);
  });

  it("canAssignWorkspaceRole prevents privilege escalation", () => {
    expect(canAssignWorkspaceRole("owner", "co-planner")).toBe(true);
    expect(canAssignWorkspaceRole("guest", "owner")).toBe(false);
  });

  it("getWorkspacePermissionMatrix returns full role × action grid", () => {
    const m = getWorkspacePermissionMatrix();
    expect(m.roles.length).toBeGreaterThan(0);
    expect(m.actions.length).toBeGreaterThan(0);
    expect(m.grid.owner["members:invite"]).toBe(true);
    expect(m.grid.guest["members:invite"]).toBe(false);
  });

  it("getWorkspaceRoleRank: owner > guest", () => {
    expect(getWorkspaceRoleRank("owner")).toBeGreaterThan(getWorkspaceRoleRank("guest"));
  });
});
