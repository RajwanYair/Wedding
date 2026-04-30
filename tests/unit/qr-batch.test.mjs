import { describe, it, expect } from "vitest";
import {
  encodeToken,
  decodeToken,
  buildBatch,
  manifestText,
} from "../../src/utils/qr-batch.js";

describe("qr-batch", () => {
  it("encodeToken produces URL-safe base64 (no +/= chars)", () => {
    const tok = encodeToken("guest-1", "evt-9");
    expect(tok).not.toMatch(/[+/=]/);
  });

  it("encodeToken/decodeToken round-trip", () => {
    const tok = encodeToken("g42", "wedding-2026");
    expect(decodeToken(tok)).toEqual({ guestId: "g42", eventId: "wedding-2026" });
  });

  it("encodeToken/decodeToken round-trip without event", () => {
    const tok = encodeToken("solo");
    expect(decodeToken(tok)).toEqual({ guestId: "solo" });
  });

  it("encodeToken handles unicode (Hebrew names)", () => {
    const tok = encodeToken("יוסי", "חתונה");
    const { guestId, eventId } = decodeToken(tok);
    expect(guestId).toBe("יוסי");
    expect(eventId).toBe("חתונה");
  });

  it("encodeToken throws on empty id", () => {
    expect(() => encodeToken("")).toThrow(TypeError);
  });

  it("decodeToken throws on empty input", () => {
    expect(() => decodeToken("")).toThrow(TypeError);
  });

  it("buildBatch creates one entry per guest with token in URL", () => {
    const out = buildBatch([{ id: "a" }, { id: "b" }], {
      baseUrl: "https://wed.example/checkin",
    });
    expect(out).toHaveLength(2);
    expect(out[0].url).toContain("https://wed.example/checkin?t=");
    expect(out[0].url).toContain(out[0].payload);
  });

  it("buildBatch supports custom param name", () => {
    const out = buildBatch([{ id: "a" }], {
      baseUrl: "https://e/c",
      param: "code",
    });
    expect(out[0].url).toContain("?code=");
  });

  it("buildBatch scopes by eventId", () => {
    const out = buildBatch([{ id: "g" }], {
      baseUrl: "https://e/c",
      eventId: "ev1",
    });
    expect(decodeToken(out[0].payload).eventId).toBe("ev1");
  });

  it("buildBatch skips invalid rows", () => {
    const out = buildBatch([{ id: "a" }, null, { foo: "x" }, { id: 7 }]);
    expect(out).toHaveLength(1);
  });

  it("manifestText emits one tab-delimited line per entry", () => {
    const text = manifestText([
      { id: "a", name: "Alice", url: "u1", payload: "p" },
      { id: "b", url: "u2", payload: "p" },
    ]);
    expect(text).toBe("Alice\tu1\nb\tu2");
  });

  it("manifestText returns empty string for empty input", () => {
    expect(manifestText([])).toBe("");
  });
});
