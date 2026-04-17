/**
 * tests/unit/log-formatter.test.mjs — Sprint 209
 */

import { describe, it, expect } from "vitest";
import {
  createEntry,
  formatHuman,
  formatJSON,
  meetsLevel,
  redactContext,
  log,
  LEVEL_SEVERITY,
} from "../../src/utils/log-formatter.js";

describe("LEVEL_SEVERITY", () => {
  it("debug < info < warn < error < fatal", () => {
    expect(LEVEL_SEVERITY.debug).toBeLessThan(LEVEL_SEVERITY.info);
    expect(LEVEL_SEVERITY.info).toBeLessThan(LEVEL_SEVERITY.warn);
    expect(LEVEL_SEVERITY.warn).toBeLessThan(LEVEL_SEVERITY.error);
    expect(LEVEL_SEVERITY.error).toBeLessThan(LEVEL_SEVERITY.fatal);
  });
});

describe("createEntry", () => {
  it("creates entry with level, message, timestamp", () => {
    const e = createEntry("info", "hello");
    expect(e.level).toBe("info");
    expect(e.message).toBe("hello");
    expect(e.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
  it("includes context if provided", () => {
    const e = createEntry("info", "msg", { userId: "123" });
    expect(e.context).toEqual({ userId: "123" });
  });
  it("omits context for empty object", () => {
    const e = createEntry("info", "msg", {});
    expect(e.context).toBeUndefined();
  });
  it("includes error details", () => {
    const err = new Error("bad things");
    const e = createEntry("error", "oops", undefined, err);
    expect(e.error?.message).toBe("bad things");
  });
  it("omits error section when no error passed", () => {
    const e = createEntry("info", "ok");
    expect(e.error).toBeUndefined();
  });
});

describe("formatHuman", () => {
  it("includes level and message", () => {
    const e = createEntry("warn", "careful");
    const s = formatHuman(e);
    expect(s).toContain("WARN");
    expect(s).toContain("careful");
  });
  it("includes context", () => {
    const e = createEntry("info", "ctx test", { key: "value" });
    expect(formatHuman(e)).toContain("key");
  });
  it("includes error message", () => {
    const e = createEntry("error", "fail", undefined, new Error("broken"));
    expect(formatHuman(e)).toContain("broken");
  });
});

describe("formatJSON", () => {
  it("returns valid JSON string", () => {
    const e = createEntry("debug", "json test");
    const parsed = JSON.parse(formatJSON(e));
    expect(parsed.level).toBe("debug");
    expect(parsed.message).toBe("json test");
  });
});

describe("meetsLevel", () => {
  it("info meets info", () => {
    const e = createEntry("info", "msg");
    expect(meetsLevel(e, "info")).toBe(true);
  });
  it("warn meets info", () => {
    const e = createEntry("warn", "msg");
    expect(meetsLevel(e, "info")).toBe(true);
  });
  it("debug does not meet warn", () => {
    const e = createEntry("debug", "msg");
    expect(meetsLevel(e, "warn")).toBe(false);
  });
});

describe("redactContext", () => {
  it("redacts password key", () => {
    const r = redactContext({ password: "secret123", user: "alice" });
    expect(r.password).toBe("***");
    expect(r.user).toBe("alice");
  });
  it("redacts apiKey (case-insensitive)", () => {
    const r = redactContext({ ApiKey: "abc" });
    expect(r.ApiKey).toBe("***");
  });
  it("custom sensitive keys", () => {
    const r = redactContext({ pin: "1234" }, ["pin"]);
    expect(r.pin).toBe("***");
  });
  it("empty context → empty result", () => {
    expect(redactContext({})).toEqual({});
  });
});

describe("log convenience factories", () => {
  it("log.info creates info entry", () => {
    expect(log.info("test").level).toBe("info");
  });
  it("log.error includes error", () => {
    const e = log.error("fail", {}, new Error("x"));
    expect(e.error?.message).toBe("x");
  });
  it("log.fatal creates fatal entry", () => {
    expect(log.fatal("system down").level).toBe("fatal");
  });
});
