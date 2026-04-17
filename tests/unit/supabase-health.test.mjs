/**
 * tests/unit/supabase-health.test.mjs — Sprint 79
 */

import { describe, it, expect, vi } from "vitest";
import { checkSupabaseHealth, getHealthReport } from "../../src/services/supabase-health.js";

function makeOkChain() {
  const chain = {};
  for (const m of ["from", "select", "limit"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (fn) => Promise.resolve({ data: [], error: null }).then(fn);
  return chain;
}

function makeErrChain(message = "DB Error") {
  const chain = {};
  for (const m of ["from", "select", "limit"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (fn) => Promise.resolve({ data: null, error: { message } }).then(fn);
  return chain;
}

describe("checkSupabaseHealth", () => {
  it("returns ok:true on success", async () => {
    const chain = makeOkChain();
    const supabase = { from: vi.fn().mockReturnValue(chain) };
    const result = await checkSupabaseHealth(supabase);
    expect(result.ok).toBe(true);
    expect(typeof result.latencyMs).toBe("number");
    expect(result.error).toBeUndefined();
  });

  it("returns ok:false when supabase returns error", async () => {
    const chain = makeErrChain("connection refused");
    const supabase = { from: vi.fn().mockReturnValue(chain) };
    const result = await checkSupabaseHealth(supabase);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("connection refused");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("returns ok:false when supabase throws", async () => {
    const supabase = {
      from: vi.fn().mockImplementation(() => { throw new Error("network fail"); }),
    };
    const result = await checkSupabaseHealth(supabase);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/network fail/);
  });

  it("queries the guests table", async () => {
    const chain = makeOkChain();
    const supabase = { from: vi.fn().mockReturnValue(chain) };
    await checkSupabaseHealth(supabase);
    expect(supabase.from).toHaveBeenCalledWith("guests");
  });
});

describe("getHealthReport", () => {
  it("returns ok:true when all tables succeed", async () => {
    const chain = makeOkChain();
    const supabase = { from: vi.fn().mockReturnValue(chain) };
    const report = await getHealthReport(supabase);
    expect(report.ok).toBe(true);
    expect(report.tables).toBeDefined();
    expect(report.error).toBeUndefined();
  });

  it("includes all critical tables in report", async () => {
    const chain = makeOkChain();
    const supabase = { from: vi.fn().mockReturnValue(chain) };
    const report = await getHealthReport(supabase);
    expect(report.tables).toMatchObject({
      guests: true,
      tables: true,
      vendors: true,
      expenses: true,
    });
  });

  it("sets ok:false when a table errors", async () => {
    let _callCount = 0;
    const supabase = {
      from: vi.fn().mockImplementation((table) => {
        _callCount++;
        return table === "vendors" ? makeErrChain("not found") : makeOkChain();
      }),
    };
    const report = await getHealthReport(supabase);
    expect(report.ok).toBe(false);
    expect(report.tables.vendors).toBe(false);
    expect(report.error).toBeDefined();
  });

  it("reports latencyMs as a number", async () => {
    const chain = makeOkChain();
    const supabase = { from: vi.fn().mockReturnValue(chain) };
    const report = await getHealthReport(supabase);
    expect(typeof report.latencyMs).toBe("number");
    expect(report.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
