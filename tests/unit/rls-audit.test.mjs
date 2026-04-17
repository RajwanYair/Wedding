/**
 * tests/unit/rls-audit.test.mjs — Sprint 82
 */

import { describe, it, expect, vi } from "vitest";
import {
  verifyRlsEnabled,
  listPolicies,
  verifySelectPolicies,
  REQUIRED_RLS_TABLES,
} from "../../src/services/rls-audit.js";

function makeRpcSupabase(returnData, returnError = null) {
  return {
    rpc: vi.fn().mockResolvedValue({ data: returnData, error: returnError }),
  };
}

describe("REQUIRED_RLS_TABLES", () => {
  it("includes guests and events", () => {
    expect(REQUIRED_RLS_TABLES).toContain("guests");
    expect(REQUIRED_RLS_TABLES).toContain("events");
  });

  it("has at least 8 tables", () => {
    expect(REQUIRED_RLS_TABLES.length).toBeGreaterThanOrEqual(8);
  });
});

describe("verifyRlsEnabled", () => {
  it("returns ok:true when all required tables have RLS", async () => {
    const rows = REQUIRED_RLS_TABLES.map((t) => ({ tablename: t, rowsecurity: true }));
    const supabase = makeRpcSupabase(rows);
    const result = await verifyRlsEnabled(supabase);
    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("returns ok:false and lists missing tables when RLS is off", async () => {
    const rows = [
      { tablename: "guests",   rowsecurity: true },
      { tablename: "vendors",  rowsecurity: false },
      { tablename: "expenses", rowsecurity: true },
    ];
    const supabase = makeRpcSupabase(rows);
    const result = await verifyRlsEnabled(supabase);
    expect(result.ok).toBe(false);
    expect(result.missing).toContain("vendors");
  });

  it("includes tableStatus map", async () => {
    const rows = [{ tablename: "guests", rowsecurity: true }];
    const supabase = makeRpcSupabase(rows);
    const result = await verifyRlsEnabled(supabase);
    expect(result.tableStatus.guests).toBe(true);
  });

  it("throws when rpc returns error", async () => {
    const supabase = makeRpcSupabase(null, { message: "rpc fail" });
    await expect(verifyRlsEnabled(supabase)).rejects.toMatchObject({ message: "rpc fail" });
  });
});

describe("listPolicies", () => {
  it("calls get_table_policies rpc with correct param", async () => {
    const policies = [{ policyname: "select_guests", cmd: "SELECT" }];
    const supabase = makeRpcSupabase(policies);
    const result = await listPolicies(supabase, "guests");
    expect(supabase.rpc).toHaveBeenCalledWith("get_table_policies", { p_table: "guests" });
    expect(result).toEqual(policies);
  });

  it("returns empty array when rpc returns null", async () => {
    const supabase = makeRpcSupabase(null);
    const result = await listPolicies(supabase, "guests");
    expect(result).toEqual([]);
  });
});

describe("verifySelectPolicies", () => {
  it("returns ok:true when all tables have SELECT policy", async () => {
    const tables = REQUIRED_RLS_TABLES;
    const supabase = {
      rpc: vi.fn().mockResolvedValue({
        data: [{ policyname: "sel", cmd: "SELECT" }],
        error: null,
      }),
    };
    const result = await verifySelectPolicies(supabase);
    expect(result.ok).toBe(true);
    expect(result.unprotected).toEqual([]);
  });

  it("returns ok:false when a table has no SELECT policy", async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const result = await verifySelectPolicies(supabase);
    expect(result.ok).toBe(false);
    expect(result.unprotected.length).toBeGreaterThan(0);
  });

  it("accepts ALL cmd as equivalent to SELECT", async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({
        data: [{ cmd: "ALL" }],
        error: null,
      }),
    };
    const result = await verifySelectPolicies(supabase);
    expect(result.ok).toBe(true);
  });
});
