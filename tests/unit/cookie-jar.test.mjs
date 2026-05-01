import { describe, it, expect } from "vitest";
import {
  parseCookies,
  serializeCookie,
} from "../../src/utils/cookie-jar.js";

describe("parseCookies", () => {
  it("parses simple", () => {
    expect(parseCookies("a=1; b=2")).toEqual({ a: "1", b: "2" });
  });

  it("URI-decodes values", () => {
    expect(parseCookies("name=Yair%20%D7%99%D7%90%D7%99%D7%A8")).toEqual({
      name: "Yair יאיר",
    });
  });

  it("strips surrounding double quotes", () => {
    expect(parseCookies('a="hello"')).toEqual({ a: "hello" });
  });

  it("later duplicates win", () => {
    expect(parseCookies("a=1; a=2")).toEqual({ a: "2" });
  });

  it("empty / non-string → {}", () => {
    expect(parseCookies("")).toEqual({});
    expect(parseCookies(null)).toEqual({});
  });

  it("ignores malformed pairs", () => {
    expect(parseCookies("a=1; nokey; =val; b=2")).toEqual({ a: "1", b: "2" });
  });

  it("tolerates non-decodable values", () => {
    expect(parseCookies("a=%E0%A4%A")).toEqual({ a: "%E0%A4%A" });
  });
});

describe("serializeCookie", () => {
  it("formats name/value with encoding", () => {
    expect(serializeCookie("a", "hello world")).toBe("a=hello%20world");
  });

  it("includes path / domain / secure / httpOnly", () => {
    expect(
      serializeCookie("k", "v", {
        path: "/",
        domain: "x.com",
        secure: true,
        httpOnly: true,
      }),
    ).toBe("k=v; Path=/; Domain=x.com; Secure; HttpOnly");
  });

  it("formats Expires from Date", () => {
    const d = new Date("2026-01-01T00:00:00Z");
    expect(serializeCookie("k", "v", { expires: d })).toContain(
      "Expires=Thu, 01 Jan 2026 00:00:00 GMT",
    );
  });

  it("Max-Age accepts seconds", () => {
    expect(serializeCookie("k", "v", { maxAge: 60 })).toBe("k=v; Max-Age=60");
  });

  it("SameSite preserved", () => {
    expect(serializeCookie("k", "v", { sameSite: "Lax" })).toContain(
      "SameSite=Lax",
    );
  });

  it("rejects bad cookie name", () => {
    expect(() => serializeCookie("bad name", "v")).toThrow(TypeError);
  });

  it("rejects invalid expires / maxAge", () => {
    expect(() => serializeCookie("k", "v", { expires: "nope" })).toThrow();
    expect(() =>
      serializeCookie("k", "v", { maxAge: Number.POSITIVE_INFINITY }),
    ).toThrow();
  });

  it("round-trips a simple value through parseCookies", () => {
    const s = serializeCookie("name", "יאיר 🎉");
    expect(parseCookies(s.split(";")[0])).toEqual({ name: "יאיר 🎉" });
  });
});
