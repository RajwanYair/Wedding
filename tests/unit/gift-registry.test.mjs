import { describe, it, expect } from "vitest";
import {
  markReceived,
  markPending,
  summarise,
  filterByState,
} from "../../src/utils/gift-registry.js";

const sample = () => [
  { id: "a", name: "Toaster", price: 200 },
  { id: "b", name: "Wine glasses", price: 150, received: true, giverId: "g1", receivedAt: "2026-01-01T00:00:00.000Z" },
  { id: "c", name: "Card" },
];

describe("gift-registry", () => {
  it("markReceived flips state and records giver + timestamp", () => {
    const out = markReceived(sample(), "a", "g42", "2026-05-01T10:00:00.000Z");
    const a = out.find((g) => g.id === "a");
    expect(a.received).toBe(true);
    expect(a.giverId).toBe("g42");
    expect(a.receivedAt).toBe("2026-05-01T10:00:00.000Z");
  });

  it("markReceived defaults to current ISO timestamp", () => {
    const out = markReceived([{ id: "x", name: "x" }], "x", "g1");
    expect(typeof out[0].receivedAt).toBe("string");
    expect(out[0].receivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("markReceived returns a new array, leaves others unchanged", () => {
    const items = sample();
    const out = markReceived(items, "a", "g1");
    expect(out).not.toBe(items);
    expect(out[1]).toEqual(items[1]);
  });

  it("markPending strips received fields", () => {
    const out = markPending(sample(), "b");
    const b = out.find((g) => g.id === "b");
    expect(b.received).toBeUndefined();
    expect(b.giverId).toBeUndefined();
    expect(b.receivedAt).toBeUndefined();
    expect(b.name).toBe("Wine glasses");
  });

  it("markPending no-op for unknown id", () => {
    const items = sample();
    const out = markPending(items, "missing");
    expect(out).toEqual(items);
  });

  it("summarise counts totals correctly", () => {
    const s = summarise(sample());
    expect(s.total).toBe(3);
    expect(s.received).toBe(1);
    expect(s.pending).toBe(2);
    expect(s.estimatedValue).toBe(350);
    expect(s.receivedValue).toBe(150);
    expect(s.pendingValue).toBe(200);
  });

  it("summarise handles empty array", () => {
    expect(summarise([])).toEqual({
      total: 0,
      received: 0,
      pending: 0,
      estimatedValue: 0,
      receivedValue: 0,
      pendingValue: 0,
    });
  });

  it("summarise treats missing price as zero", () => {
    const s = summarise([{ id: "a", name: "x" }]);
    expect(s.estimatedValue).toBe(0);
  });

  it("filterByState 'received' returns only received", () => {
    expect(filterByState(sample(), "received").map((g) => g.id)).toEqual(["b"]);
  });

  it("filterByState 'pending' returns only pending", () => {
    expect(filterByState(sample(), "pending").map((g) => g.id).sort()).toEqual([
      "a",
      "c",
    ]);
  });

  it("filterByState defaults to 'all'", () => {
    expect(filterByState(sample())).toHaveLength(3);
  });
});
