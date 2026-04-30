import { describe, it, expect } from "vitest";
import {
  recordThanks,
  unrecordThanks,
  hasThanked,
  outstanding,
  channelCounts,
} from "../../src/utils/gift-thanks.js";

describe("gift-thanks", () => {
  it("recordThanks adds a new entry with default channel + timestamp", () => {
    const log = recordThanks([], { giftId: "g1", giverId: "u1" });
    expect(log).toHaveLength(1);
    expect(log[0].channel).toBe("whatsapp");
    expect(typeof log[0].sentAt).toBe("string");
  });

  it("recordThanks honours custom channel + notes + sentAt", () => {
    const log = recordThanks([], {
      giftId: "g",
      giverId: "u",
      channel: "card",
      notes: "handwritten",
      sentAt: "2026-05-01T00:00:00.000Z",
    });
    expect(log[0]).toEqual({
      giftId: "g",
      giverId: "u",
      channel: "card",
      notes: "handwritten",
      sentAt: "2026-05-01T00:00:00.000Z",
    });
  });

  it("recordThanks replaces an existing entry for the same gift", () => {
    let log = recordThanks([], { giftId: "g", giverId: "u", channel: "email" });
    log = recordThanks(log, { giftId: "g", giverId: "u", channel: "card" });
    expect(log).toHaveLength(1);
    expect(log[0].channel).toBe("card");
  });

  it("recordThanks throws on missing required fields", () => {
    expect(() => recordThanks([], { giverId: "u" })).toThrow(TypeError);
    expect(() => recordThanks([], { giftId: "g" })).toThrow(TypeError);
  });

  it("unrecordThanks removes the entry; no-op when absent", () => {
    const log = [{ giftId: "g", giverId: "u", sentAt: "2026-01-01T00:00:00.000Z" }];
    expect(unrecordThanks(log, "g")).toEqual([]);
    expect(unrecordThanks(log, "missing")).toEqual(log);
  });

  it("hasThanked returns boolean correctly", () => {
    const log = [{ giftId: "g", giverId: "u", sentAt: "2026-01-01T00:00:00.000Z" }];
    expect(hasThanked(log, "g")).toBe(true);
    expect(hasThanked(log, "x")).toBe(false);
  });

  it("outstanding filters received gifts without thanks", () => {
    const gifts = [
      { id: "a", received: true },
      { id: "b", received: false },
      { id: "c", received: true },
    ];
    const log = [{ giftId: "a", giverId: "u", sentAt: "2026-01-01T00:00:00.000Z" }];
    expect(outstanding(gifts, log)).toEqual(["c"]);
  });

  it("outstanding ignores invalid rows", () => {
    expect(outstanding([null, { received: true }, { id: "z", received: true }], [])).toEqual([
      "z",
    ]);
  });

  it("channelCounts buckets by channel with whatsapp default", () => {
    const log = [
      { giftId: "a", giverId: "u", sentAt: "2026-01-01T00:00:00.000Z" },
      { giftId: "b", giverId: "u", sentAt: "2026-01-01T00:00:00.000Z", channel: "card" },
      { giftId: "c", giverId: "u", sentAt: "2026-01-01T00:00:00.000Z", channel: "card" },
    ];
    expect(channelCounts(log)).toEqual({ whatsapp: 1, card: 2 });
  });

  it("channelCounts returns empty object for empty log", () => {
    expect(channelCounts([])).toEqual({});
  });
});
