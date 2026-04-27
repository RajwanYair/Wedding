/**
 * tests/unit/whatsapp-bulk.test.mjs — S108 bulk WhatsApp dispatch.
 */
import { describe, it, expect, vi } from "vitest";
import { sendWhatsAppBulk } from "../../src/services/backend.js";

describe("S108 — sendWhatsAppBulk", () => {
  it("aggregates ok/failed counts and reports progress", async () => {
    const sender = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, messageId: "m1" })
      .mockResolvedValueOnce({ ok: false, error: "blocked" })
      .mockResolvedValueOnce({ ok: true, messageId: "m3" });

    const calls = /** @type {Array<[number, number, boolean]>} */ ([]);
    const res = await sendWhatsAppBulk(
      ["972500000001", "972500000002", "972500000003"],
      { text: "hi" },
      (i, total, ok) => calls.push([i, total, ok]),
      sender,
    );

    expect(res.ok).toBe(2);
    expect(res.failed).toBe(1);
    expect(res.errors).toEqual([{ to: "972500000002", error: "blocked" }]);
    expect(calls).toEqual([
      [1, 3, true],
      [2, 3, false],
      [3, 3, true],
    ]);
    expect(sender).toHaveBeenCalledTimes(3);
  });

  it("catches thrown errors and continues", async () => {
    const sender = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ ok: true });
    const res = await sendWhatsAppBulk(["a", "b"], { text: "hi" }, undefined, sender);
    expect(res.ok).toBe(1);
    expect(res.failed).toBe(1);
    expect(res.errors[0]?.error).toBe("network");
  });

  it("missing-error response defaults to 'unknown'", async () => {
    const sender = vi.fn().mockResolvedValue({ ok: false });
    const res = await sendWhatsAppBulk(["a"], { text: "hi" }, undefined, sender);
    expect(res.errors[0]).toEqual({ to: "a", error: "unknown" });
  });
});
