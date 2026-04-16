/**
 * tests/unit/contact-collector.test.mjs — Unit tests for contact-collector section
 * Covers: submitContactForm validation + store operations
 *
 * @vitest-environment happy-dom
 * Run: npm test
 */

import { describe, it, expect, beforeEach } from "vitest";
import { initStore, storeGet, storeSet } from "../../src/core/store.js";
import { submitContactForm } from "../../src/sections/contact-collector.js";

function seedStore() {
  initStore({
    contacts: { value: [] },
    guests: { value: [] },
    tables: { value: [] },
    weddingInfo: { value: {} },
  });
}

describe("submitContactForm", () => {
  beforeEach(() => seedStore());

  it("rejects missing firstName", () => {
    const result = submitContactForm({ phone: "0501234567" });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects missing phone", () => {
    const result = submitContactForm({ firstName: "Test" });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid phone number", () => {
    const result = submitContactForm({ firstName: "Test", phone: "123" });
    expect(result.ok).toBe(false);
  });

  it("accepts valid contact submission", () => {
    const result = submitContactForm({
      firstName: "Dan",
      lastName: "Cohen",
      phone: "0501234567",
    });
    expect(result.ok).toBe(true);
  });

  it("stores contact in contacts array", () => {
    submitContactForm({ firstName: "Dan", phone: "0501234567" });
    const contacts = /** @type {any[]} */ (storeGet("contacts"));
    expect(contacts).toHaveLength(1);
    expect(contacts[0].firstName).toBe("Dan");
  });

  it("normalizes phone to international format", () => {
    submitContactForm({ firstName: "Test", phone: "054-123-4567" });
    const contacts = /** @type {any[]} */ (storeGet("contacts"));
    expect(contacts[0].phone).toMatch(/^972/);
  });

  it("generates unique ID for each contact", () => {
    submitContactForm({ firstName: "A", phone: "0501234561" });
    submitContactForm({ firstName: "B", phone: "0501234562" });
    const contacts = /** @type {any[]} */ (storeGet("contacts"));
    expect(contacts[0].id).not.toBe(contacts[1].id);
  });

  it("adds submittedAt timestamp", () => {
    submitContactForm({ firstName: "Test", phone: "0501234567" });
    const contacts = /** @type {any[]} */ (storeGet("contacts"));
    expect(contacts[0].submittedAt).toBeDefined();
  });

  it("preserves optional fields", () => {
    submitContactForm({
      firstName: "Dan",
      phone: "0501234567",
      email: "dan@test.com",
      dietaryNotes: "Vegan",
    });
    const contacts = /** @type {any[]} */ (storeGet("contacts"));
    expect(contacts[0].email).toBe("dan@test.com");
    expect(contacts[0].dietaryNotes).toBe("Vegan");
  });
});
