/**
 * tests/unit/audit-pipeline.test.mjs — Sprint 88
 */

import { describe, it, expect, vi } from "vitest";
import { createAuditPipeline } from "../../src/services/compliance.js";

function makeSupabase() {
  const chain = {
    insert: vi.fn().mockResolvedValue({ error: null }),
  };
  return { from: vi.fn().mockReturnValue(chain), _chain: chain };
}

describe("createAuditPipeline", () => {
  it("creates a pipeline with log/flush/pending/destroy", () => {
    const p = createAuditPipeline(null, { flushMs: 60_000 });
    expect(typeof p.log).toBe("function");
    expect(typeof p.flush).toBe("function");
    expect(typeof p.pending).toBe("function");
    expect(typeof p.destroy).toBe("function");
    p.destroy();
  });
});

describe("log", () => {
  it("increments pending count", () => {
    const p = createAuditPipeline(null, { flushMs: 60_000 });
    p.log({ action: "guest.create" });
    p.log({ action: "guest.update" });
    expect(p.pending()).toBe(2);
    p.destroy();
  });

  it("is a no-op after destroy", () => {
    const p = createAuditPipeline(null, { flushMs: 60_000 });
    p.destroy();
    p.log({ action: "guest.create" });
    expect(p.pending()).toBe(0);
  });

  it("elevates severity for high-risk actions", async () => {
    const sb = makeSupabase();
    const p = createAuditPipeline(sb, { flushMs: 60_000, batchSize: 1 });
    p.log({ action: "guest.delete", severity: "low" });
    await p.flush();
    const [rows] = sb._chain.insert.mock.calls[0];
    expect(rows[0].severity).toBe("high");
    p.destroy();
  });

  it("keeps caller severity when already high enough", async () => {
    const sb = makeSupabase();
    const p = createAuditPipeline(sb, { flushMs: 60_000, batchSize: 1 });
    p.log({ action: "guest.delete", severity: "critical" });
    await p.flush();
    const [rows] = sb._chain.insert.mock.calls[0];
    expect(rows[0].severity).toBe("critical");
    p.destroy();
  });

  it("adds logged_at timestamp", async () => {
    const sb = makeSupabase();
    const p = createAuditPipeline(sb, { flushMs: 60_000, batchSize: 10 });
    p.log({ action: "guest.create" });
    await p.flush();
    const [rows] = sb._chain.insert.mock.calls[0];
    expect(typeof rows[0].logged_at).toBe("string");
    p.destroy();
  });

  it("auto-flushes when batchSize is reached", async () => {
    const sb = makeSupabase();
    const p = createAuditPipeline(sb, { flushMs: 60_000, batchSize: 2 });
    p.log({ action: "a" });
    p.log({ action: "b" }); // Should trigger auto-flush
    await new Promise((r) => setTimeout(r, 10)); // micro-task drain
    expect(sb._chain.insert).toHaveBeenCalled();
    p.destroy();
  });
});

describe("flush", () => {
  it("sends queued events to supabase", async () => {
    const sb = makeSupabase();
    const p = createAuditPipeline(sb, { flushMs: 60_000 });
    p.log({ action: "guest.create" });
    p.log({ action: "guest.update" });
    await p.flush();
    expect(sb.from).toHaveBeenCalledWith("audit_log");
    expect(sb._chain.insert).toHaveBeenCalled();
    expect(p.pending()).toBe(0);
    p.destroy();
  });

  it("is safe to call on empty queue", async () => {
    const p = createAuditPipeline(null, { flushMs: 60_000 });
    await expect(p.flush()).resolves.toBeUndefined();
    p.destroy();
  });
});

describe("offline mode (null supabase)", () => {
  it("falls back to console.warn without throwing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const p = createAuditPipeline(null, { flushMs: 60_000 });
    p.log({ action: "guest.create" });
    await p.flush();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    p.destroy();
  });
});
