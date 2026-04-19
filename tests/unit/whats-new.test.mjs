/**
 * tests/unit/whats-new.test.mjs — Sprint 156
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TEST_STORAGE_KEYS } from "../test-constants.mjs";

vi.mock("../../src/core/config.js", () => ({
  APP_VERSION: "7.6.0",
}));

vi.mock("../../src/core/i18n.js", () => ({
  t: vi.fn((k) => k),
}));

const LAST_SEEN_KEY = TEST_STORAGE_KEYS.LAST_SEEN_VERSION;

// localStorage mock
let _store = {};
vi.stubGlobal("localStorage", {
  getItem: (k) => (_store[k] ?? null),
  setItem: (k, v) => { _store[k] = String(v); },
  removeItem: (k) => { delete _store[k]; },
});

import { maybeShowWhatsNew } from "../../src/core/whats-new.js";

beforeEach(() => {
  _store = {};
  document.body.innerHTML = "";
});

describe("maybeShowWhatsNew", () => {
  it("does nothing for non-admin user", () => {
    maybeShowWhatsNew({ isAdmin: false });
    expect(document.body.children.length).toBe(0);
  });

  it("does nothing for null user", () => {
    maybeShowWhatsNew(null);
    expect(document.body.children.length).toBe(0);
  });

  it("shows overlay for new version", () => {
    maybeShowWhatsNew({ isAdmin: true });
    expect(document.body.children.length).toBe(1);
    expect(document.body.firstElementChild.className).toContain("modal-overlay");
  });

  it("renders translated release items", () => {
    maybeShowWhatsNew({ isAdmin: true });
    const items = [...document.body.querySelectorAll("li")].map((item) => item.textContent);
    expect(items).toEqual([
      "whats_new_item_budget_sync",
      "whats_new_item_checkin_sync",
      "whats_new_item_whatsapp_templates",
      "whats_new_item_status_bar",
      "whats_new_item_popup",
      "whats_new_item_changelog",
    ]);
  });

  it("does not show overlay if version already seen", () => {
    _store[LAST_SEEN_KEY] = "7.6.0";
    maybeShowWhatsNew({ isAdmin: true });
    expect(document.body.children.length).toBe(0);
  });

  it("shows overlay if last-seen version is different", () => {
    _store[LAST_SEEN_KEY] = "7.5.0";
    maybeShowWhatsNew({ isAdmin: true });
    expect(document.body.children.length).toBe(1);
  });

  it("overlay contains a dismiss button", () => {
    maybeShowWhatsNew({ isAdmin: true });
    const btn = document.body.querySelector("button");
    expect(btn).not.toBeNull();
  });

  it("dismiss button click stores current version", () => {
    maybeShowWhatsNew({ isAdmin: true });
    const btn = document.body.querySelector("button");
    btn.click();
    expect(_store[LAST_SEEN_KEY]).toBe("7.6.0");
  });

  it("dismiss button click removes the overlay", () => {
    maybeShowWhatsNew({ isAdmin: true });
    const btn = document.body.querySelector("button");
    btn.click();
    expect(document.body.children.length).toBe(0);
  });
});
