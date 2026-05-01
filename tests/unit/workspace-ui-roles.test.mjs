// @ts-check
/** tests/unit/workspace-ui-roles.test.mjs — S601 */
import { describe, it, expect } from "vitest";
import {
  listRoles,
  listActions,
  roleRank,
  canPerform,
  canAssignRole,
} from "../../src/utils/workspace-ui-roles.js";

describe("S601 workspace-ui-roles", () => {
  it("listRoles + listActions are non-empty", () => {
    expect(listRoles()).toContain("owner");
    expect(listRoles()).toContain("guest");
    expect(listActions()).toContain("guests:write");
  });

  it("roleRank: owner > co-planner > vendor > photographer > guest", () => {
    expect(roleRank("owner")).toBeGreaterThan(roleRank("co-planner"));
    expect(roleRank("co-planner")).toBeGreaterThan(roleRank("vendor"));
    expect(roleRank("guest")).toBe(0);
    expect(roleRank(/** @type {any} */ ("alien"))).toBe(-1);
  });

  it("canPerform: owner has full power", () => {
    for (const a of listActions()) expect(canPerform("owner", a)).toBe(true);
  });

  it("canPerform: guest may only RSVP", () => {
    expect(canPerform("guest", "rsvp:submit")).toBe(true);
    expect(canPerform("guest", "guests:read")).toBe(false);
    expect(canPerform("guest", "settings:write")).toBe(false);
  });

  it("canPerform: vendor cannot edit guests / settings", () => {
    expect(canPerform("vendor", "vendors:read")).toBe(true);
    expect(canPerform("vendor", "guests:write")).toBe(false);
    expect(canPerform("vendor", "settings:write")).toBe(false);
  });

  it("canPerform: photographer can read guests + upload media", () => {
    expect(canPerform("photographer", "guests:read")).toBe(true);
    expect(canPerform("photographer", "media:upload")).toBe(true);
    expect(canPerform("photographer", "guests:write")).toBe(false);
  });

  it("canAssignRole: owner can assign any role", () => {
    for (const r of listRoles()) expect(canAssignRole("owner", r)).toBe(true);
  });

  it("canAssignRole: co-planner cannot assign owner", () => {
    expect(canAssignRole("co-planner", "owner")).toBe(false);
    expect(canAssignRole("co-planner", "vendor")).toBe(true);
  });

  it("canAssignRole: vendor / guest cannot invite at all", () => {
    expect(canAssignRole("vendor", "vendor")).toBe(false);
    expect(canAssignRole("guest", "guest")).toBe(false);
  });
});
