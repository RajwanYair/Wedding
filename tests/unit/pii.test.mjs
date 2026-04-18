/**
 * tests/unit/pii.test.mjs — Sprint 18 PII classification & masking
 */
import { describe, it, expect } from "vitest";
import { STORE_DATA_CLASS } from "../../src/core/constants.js";
import {
  DATA_CLASS,
  STORE_KEY_CLASSES,
  maskPhone,
  maskEmail,
  maskName,
  classifyRecord,
  redactForLog,
  safeGuestSummary,
} from "../../src/utils/pii.js";

describe("DATA_CLASS constants", () => {
  it("exports four classes", () => {
    expect(DATA_CLASS.PUBLIC).toBe("public");
    expect(DATA_CLASS.GUEST_PRIVATE).toBe("guest-private");
    expect(DATA_CLASS.ADMIN_SENSITIVE).toBe("admin-sensitive");
    expect(DATA_CLASS.OPERATIONAL).toBe("operational");
  });

  it("is frozen", () => {
    expect(Object.isFrozen(DATA_CLASS)).toBe(true);
  });
});

describe("STORE_KEY_CLASSES", () => {
  it("reuses the canonical store data-class map", () => {
    expect(STORE_KEY_CLASSES.guests).toBe(STORE_DATA_CLASS.guests);
    expect(STORE_KEY_CLASSES.commLog).toBe(STORE_DATA_CLASS.commLog);
  });

  it("vendors is admin-sensitive", () => {
    expect(STORE_KEY_CLASSES.vendors).toBe("admin-sensitive");
  });

  it("lang is operational", () => {
    expect(STORE_KEY_CLASSES.lang).toBe("operational");
  });
});

describe("maskPhone", () => {
  it("shows only the last 3 digits", () => {
    const masked = maskPhone("+972541234567");
    expect(masked).toMatch(/567$/);
    expect(masked).not.toContain("972");
  });

  it("handles short numbers gracefully", () => {
    expect(maskPhone("123")).toBe("•••");
  });

  it("returns placeholder for empty input", () => {
    expect(maskPhone("")).toBe("•••");
    expect(maskPhone("  ")).toBe("•••");
  });

  it("handles non-string input", () => {
    // @ts-ignore
    expect(maskPhone(null)).toBe("•••");
  });
});

describe("maskEmail", () => {
  it("shows first char and full domain", () => {
    const masked = maskEmail("yair@example.com");
    expect(masked.startsWith("y")).toBe(true);
    expect(masked).toContain("@example.com");
    expect(masked).not.toContain("air");
  });

  it("returns placeholder for invalid email", () => {
    expect(maskEmail("notanemail")).toBe("•••");
    expect(maskEmail("")).toBe("•••");
  });

  it("handles non-string input", () => {
    // @ts-ignore
    expect(maskEmail(null)).toBe("•••");
  });
});

describe("maskName", () => {
  it("shows only first letter per word", () => {
    const masked = maskName("Yair Rajwany");
    expect(masked).toMatch(/^Y•/);
    expect(masked).not.toContain("air");
    expect(masked).not.toContain("ajwany");
  });

  it("handles single word name", () => {
    const masked = maskName("Yair");
    expect(masked).toBe("Y•");
  });

  it("returns placeholder for empty input", () => {
    expect(maskName("")).toBe("•");
  });
});

describe("classifyRecord", () => {
  it("classifies guest record as guest-private", () => {
    expect(classifyRecord({ id: "g1", phone: "+972541234567", email: "a@b.com" })).toBe("guest-private");
  });

  it("classifies vendor record as admin-sensitive", () => {
    expect(classifyRecord({ id: "v1", name: "Florist", price: 5000 })).toBe("admin-sensitive");
  });

  it("classifies unknown record as operational", () => {
    expect(classifyRecord({ id: "x", type: "timeline" })).toBe("operational");
  });

  it("handles non-object input", () => {
    // @ts-ignore
    expect(classifyRecord(null)).toBe("operational");
    // @ts-ignore
    expect(classifyRecord("string")).toBe("operational");
  });
});

describe("redactForLog", () => {
  it("masks phone and email fields", () => {
    const input = { id: "g1", phone: "+972541234567", email: "yair@example.com", status: "confirmed" };
    const safe = redactForLog(input);
    expect(safe.phone).not.toContain("972");
    expect(safe.email).not.toContain("yair");
    expect(safe.status).toBe("confirmed");
    expect(safe.id).toBe("g1");
  });

  it("masks firstName and lastName", () => {
    const safe = redactForLog({ firstName: "Yair", lastName: "Rajwany" });
    expect(safe.firstName).not.toBe("Yair");
    expect(safe.lastName).not.toBe("Rajwany");
  });

  it("does not mutate the original record", () => {
    const input = { phone: "+972541234567" };
    redactForLog(input);
    expect(input.phone).toBe("+972541234567");
  });

  it("handles non-object input gracefully", () => {
    // @ts-ignore
    expect(redactForLog(null)).toBeNull();
  });
});

describe("safeGuestSummary", () => {
  it("returns masked name, phone, email", () => {
    const summary = safeGuestSummary({
      id: "g1",
      firstName: "Yair",
      lastName: "Rajwany",
      phone: "+972541234567",
      email: "yair@example.com",
      status: "confirmed",
    });
    expect(summary.id).toBe("g1");
    expect(summary.status).toBe("confirmed");
    expect(summary.name).not.toContain("Yair");
    expect(summary.phone).not.toContain("972");
    expect(summary.email).not.toContain("yair@");
  });

  it("handles missing fields without throwing", () => {
    const summary = safeGuestSummary({ id: "g2" });
    expect(summary.name).toBeTruthy();
    expect(summary.phone).toBeTruthy();
    expect(summary.email).toBeTruthy();
  });
});
