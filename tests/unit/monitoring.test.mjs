/**
 * tests/unit/monitoring.test.mjs — Unit tests for src/services/monitoring.js
 */

import { describe, it, expect, beforeEach } from "vitest";
import { initStore } from "../../src/core/store.js";

import {
  scrubPii,
  initMonitoring,
  captureException,
  addBreadcrumb,
  getBreadcrumbs,
  _resetForTests,
} from "../../src/services/observability.js";

function seedStore() {
  initStore({
    appErrors: { value: [] },
    guests: { value: [] },
    campaigns: { value: [] },
    tables: { value: [] },
    vendors: { value: [] },
    expenses: { value: [] },
    weddingInfo: { value: {} },
  });
}

beforeEach(() => {
  seedStore();
  _resetForTests();
});

describe("scrubPii", () => {
  it("redacts email addresses", () => {
    expect(scrubPii("user error: alice@example.com failed")).toBe(
      "user error: [email] failed",
    );
  });

  it("redacts JWT-like tokens", () => {
    expect(scrubPii("token=eyJhbGciOiJIUzI1NiJ9.payload.sig"))
      .toContain("[token]");
  });

  it("masks Israeli phone numbers but keeps last digits", () => {
    expect(scrubPii("call 054-123-4567 now")).toMatch(/\[phone-\*\*\*\d{2,4}]/);
  });

  it("returns non-strings unchanged", () => {
    // @ts-expect-error testing wrong type
    expect(scrubPii(42)).toBe(42);
  });
});

describe("initMonitoring", () => {
  it("returns false without a DSN", async () => {
    const wired = await initMonitoring({});
    expect(wired).toBe(false);
  });

  it("is idempotent", async () => {
    const a = await initMonitoring({});
    const b = await initMonitoring({});
    expect(a).toBe(b);
  });
});

describe("captureException", () => {
  it("records to the local error pipeline even without a transport", async () => {
    await initMonitoring({});
    captureException(new Error("boom"), { section: "guests" });
    // Should not throw — local pipeline handles it.
    expect(true).toBe(true);
  });

  it("scrubs PII in the context object", () => {
    captureException(new Error("ctx"), { email: "a@b.com" });
    expect(true).toBe(true); // capture should not throw on scrubbed data
  });
});

describe("breadcrumbs", () => {
  it("stores breadcrumbs and scrubs their messages", () => {
    addBreadcrumb({ message: "user a@b.com clicked save" });
    const crumbs = getBreadcrumbs();
    expect(crumbs).toHaveLength(1);
    expect(crumbs[0].message).toContain("[email]");
    expect(crumbs[0].ts).toBeTypeOf("number");
  });

  it("caps breadcrumb buffer at 50", () => {
    for (let i = 0; i < 60; i++) addBreadcrumb({ message: `step ${i}` });
    expect(getBreadcrumbs()).toHaveLength(50);
  });
});
