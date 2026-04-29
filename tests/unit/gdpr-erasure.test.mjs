/**
 * tests/unit/gdpr-erasure.test.mjs — Sprint 86
 */

import { describe, it, expect, vi } from "vitest";
import {
  eraseGuest,
  isErased,
  PII_COLUMNS,
} from "../../src/services/privacy.js";

function makeChain(resolveWith = { data: null, error: null }) {
  const chain = {};
  for (const m of ["from", "update", "insert", "select", "eq", "maybeSingle"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (fn) => Promise.resolve(resolveWith).then(fn);
  chain.maybeSingle = vi.fn().mockResolvedValue(resolveWith);
  return chain;
}

function makeSupabase(resolveWith = { data: null, error: null }) {
  const chain = makeChain(resolveWith);
  chain.from = vi.fn().mockReturnValue(chain);
  return chain;
}

describe("PII_COLUMNS", () => {
  it("includes phone and email", () => {
    expect(PII_COLUMNS).toContain("phone");
    expect(PII_COLUMNS).toContain("email");
  });

  it("does not include non-PII fields like status or table_id", () => {
    expect(PII_COLUMNS).not.toContain("status");
    expect(PII_COLUMNS).not.toContain("table_id");
  });
});

describe("eraseGuest", () => {
  it("calls update on guests table", async () => {
    const supabase = makeSupabase();
    await eraseGuest(supabase, "g1");
    expect(supabase.from).toHaveBeenCalledWith("guests");
  });

  it("nullifies all PII columns", async () => {
    const supabase = makeSupabase();
    const chain = supabase.from();
    await eraseGuest(supabase, "g1");
    const [patchArg] = chain.update.mock.calls[0];
    for (const col of PII_COLUMNS) {
      expect(patchArg).toHaveProperty(col, null);
    }
  });

  it("sets erased_at in the patch", async () => {
    const supabase = makeSupabase();
    const chain = supabase.from();
    await eraseGuest(supabase, "g1");
    const [patchArg] = chain.update.mock.calls[0];
    expect(typeof patchArg.erased_at).toBe("string");
  });

  it("inserts into erasure_log with entity_type=guest", async () => {
    const supabase = makeSupabase();
    const chain = supabase.from();
    await eraseGuest(supabase, "g2", { requestedBy: "admin@test.com" });
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: "guest",
        entity_id: "g2",
        requested_by: "admin@test.com",
      })
    );
  });

  it("sets requested_by to null when not provided", async () => {
    const supabase = makeSupabase();
    const chain = supabase.from();
    await eraseGuest(supabase, "g3");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ requested_by: null })
    );
  });

  it("throws when supabase update fails", async () => {
    const supabase = makeSupabase({ data: null, error: { message: "update failed" } });
    await expect(eraseGuest(supabase, "g4")).rejects.toMatchObject({ message: "update failed" });
  });
});

describe("isErased", () => {
  it("returns true when erased_at is set", async () => {
    const chain = makeChain({ data: { erased_at: "2025-01-01T00:00:00Z" }, error: null });
    const supabase = { from: vi.fn().mockReturnValue(chain) };
    expect(await isErased(supabase, "g1")).toBe(true);
  });

  it("returns false when erased_at is null", async () => {
    const chain = makeChain({ data: { erased_at: null }, error: null });
    const supabase = { from: vi.fn().mockReturnValue(chain) };
    expect(await isErased(supabase, "g1")).toBe(false);
  });

  it("returns false when guest not found", async () => {
    const chain = makeChain({ data: null, error: null });
    const supabase = { from: vi.fn().mockReturnValue(chain) };
    expect(await isErased(supabase, "g99")).toBe(false);
  });
});
