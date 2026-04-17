/**
 * tests/unit/supabase-rsvp-log-repository.test.mjs — Sprint 77 tests
 */

import { describe, it, expect, vi } from "vitest";
import { SupabaseRsvpLogRepository } from "../../src/repositories/supabase-rsvp-log-repository.js";

function makeChain(resolveData = null) {
  const result = { data: resolveData, error: null };
  const chain = {};
  for (const m of ["select", "insert", "eq", "order", "limit", "not"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single      = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then        = (fn) => Promise.resolve(result).then(fn);
  chain.catch       = (fn) => Promise.resolve(result).catch(fn);
  return chain;
}

function makeSupabase(resolveData = null) {
  const chain = makeChain(resolveData);
  return { from: vi.fn().mockReturnValue(chain) };
}

describe("SupabaseRsvpLogRepository", () => {
  it("constructs without errors", () => {
    const repo = new SupabaseRsvpLogRepository(makeSupabase());
    expect(repo).toBeDefined();
  });

  it("logRsvp calls insert on rsvp_log", async () => {
    const supabase = makeSupabase({ id: "log1", to_status: "confirmed" });
    const repo = new SupabaseRsvpLogRepository(supabase);
    const result = await repo.logRsvp("g1", "pending", "confirmed", "web", "evt1");
    expect(supabase.from).toHaveBeenCalledWith("rsvp_log");
    expect(result).toMatchObject({ id: "log1" });
  });

  it("logRsvp uses default source=web and eventId=default", async () => {
    const supabase = makeSupabase({ id: "log2" });
    const chain = supabase.from();
    const repo = new SupabaseRsvpLogRepository(supabase);
    await repo.logRsvp("g2", null, "confirmed");
    // insert called on the chain
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ source: "web", event_id: "default" })
    );
  });

  it("logRsvp sets from_status to null when not provided", async () => {
    const supabase = makeSupabase({ id: "log3" });
    const chain = supabase.from();
    const repo = new SupabaseRsvpLogRepository(supabase);
    await repo.logRsvp("g3", null, "declined");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ from_status: null })
    );
  });

  it("findByGuest filters by guest_id", async () => {
    const supabase = makeSupabase([{ id: "l1", guest_id: "g1" }]);
    const chain = supabase.from();
    const repo = new SupabaseRsvpLogRepository(supabase);
    await repo.findByGuest("g1");
    expect(chain.eq).toHaveBeenCalledWith("guest_id", "g1");
  });

  it("findByGuest orders by logged_at desc", async () => {
    const supabase = makeSupabase([]);
    const chain = supabase.from();
    const repo = new SupabaseRsvpLogRepository(supabase);
    await repo.findByGuest("g1");
    expect(chain.order).toHaveBeenCalledWith("logged_at", { ascending: false });
  });

  it("findRecent returns data with default limit 50", async () => {
    const supabase = makeSupabase([{ id: "l1" }]);
    const chain = supabase.from();
    const repo = new SupabaseRsvpLogRepository(supabase);
    const rows = await repo.findRecent();
    expect(chain.limit).toHaveBeenCalledWith(50);
    expect(Array.isArray(rows)).toBe(true);
  });

  it("findRecent respects custom limit", async () => {
    const supabase = makeSupabase([]);
    const chain = supabase.from();
    const repo = new SupabaseRsvpLogRepository(supabase);
    await repo.findRecent(10);
    expect(chain.limit).toHaveBeenCalledWith(10);
  });

  it("findByEvent filters by event_id", async () => {
    const supabase = makeSupabase([]);
    const chain = supabase.from();
    const repo = new SupabaseRsvpLogRepository(supabase);
    await repo.findByEvent("evt-abc");
    expect(chain.eq).toHaveBeenCalledWith("event_id", "evt-abc");
  });

  it("logRsvp includes logged_at timestamp", async () => {
    const supabase = makeSupabase({ id: "l9" });
    const chain = supabase.from();
    const repo = new SupabaseRsvpLogRepository(supabase);
    await repo.logRsvp("g4", "confirmed", "declined");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ logged_at: expect.any(String) })
    );
  });
});
