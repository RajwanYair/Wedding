/**
 * tests/unit/sms-service.test.mjs — Sprint 123
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/services/backend.js", () => ({
  callEdgeFunction: vi.fn().mockResolvedValue({ sent: 1, failed: 0, errors: [] }),
}));

const {
  sendSms, sendSmsBatch, isValidPhone, setSmsStub,
} = await import("../../src/services/sms-service.js");

beforeEach(() => {
  setSmsStub(null);
  vi.clearAllMocks();
});

describe("isValidPhone", () => {
  it("accepts E.164 numbers", () => {
    expect(isValidPhone("+972541234567")).toBe(true);
    expect(isValidPhone("+1234567890")).toBe(true);
  });

  it("rejects non-E.164", () => {
    expect(isValidPhone("0541234567")).toBe(false);
    expect(isValidPhone("+972")).toBe(false);
    expect(isValidPhone("abc")).toBe(false);
  });
});

describe("sendSmsBatch", () => {
  it("returns 0 counts for empty batch", async () => {
    const r = await sendSmsBatch([]);
    expect(r.sent).toBe(0);
  });

  it("throws for missing to field", async () => {
    await expect(sendSmsBatch([{ to: "", body: "Hi" }])).rejects.toThrow();
  });

  it("calls stub when set", async () => {
    const stub = vi.fn().mockResolvedValue({ sent: 2, failed: 0, errors: [] });
    setSmsStub(stub);
    const r = await sendSmsBatch([
      { to: "+972541234567", body: "Test" },
      { to: "+972541234568", body: "Test" },
    ]);
    expect(stub).toHaveBeenCalledOnce();
    expect(r.sent).toBe(2);
  });
});

describe("sendSms", () => {
  it("delegates to sendSmsBatch with one message", async () => {
    const stub = vi.fn().mockResolvedValue({ sent: 1, failed: 0, errors: [] });
    setSmsStub(stub);
    const r = await sendSms("+972541234567", "Hello");
    expect(stub).toHaveBeenCalledWith([{ to: "+972541234567", body: "Hello" }]);
    expect(r.sent).toBe(1);
  });
});
