/**
 * S724 integration tests — WhatsApp DNC list + message templates wired into whatsapp.js
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore } from "../../src/core/store.js";

vi.mock("../../src/core/sync.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(),
}));
vi.mock("../../src/core/ui.js", () => ({ showToast: vi.fn(), announce: vi.fn() }));
vi.mock("../../src/core/storage.js", () => ({
  readBrowserStorageJson: vi.fn(() => []),
  writeBrowserStorage: vi.fn(),
}));
vi.mock("../../src/services/wa-messaging.js", () => ({
  personalizeMessage: vi.fn((m) => m),
  getVariableHints: vi.fn(() => []),
}));

beforeEach(() => {
  initStore({});
  localStorage.clear();
});

import {
  addToDncList,
  removeFromDncList,
  isDncListed,
  getDncList,
  clearDncList,
  filterOutDnc,
  listMessageTemplates,
  renderMessageTemplate,
  registerMessageTemplate,
  getBuiltInTemplates,
} from "../../src/sections/whatsapp.js";

describe("S724 -- DNC list: addToDncList / isDncListed", () => {
  it("adds a phone and confirms it is listed", () => {
    expect(addToDncList("0541234567")).toBe(true);
    expect(isDncListed("0541234567")).toBe(true);
  });

  it("returns false when adding the same phone twice", () => {
    addToDncList("0541234567");
    expect(addToDncList("0541234567")).toBe(false);
  });

  it("returns false for empty/invalid phone", () => {
    expect(addToDncList("")).toBe(false);
  });
});

describe("S724 -- DNC list: removeFromDncList", () => {
  it("removes a listed phone and it is no longer listed", () => {
    addToDncList("0549876543");
    expect(removeFromDncList("0549876543")).toBe(true);
    expect(isDncListed("0549876543")).toBe(false);
  });

  it("returns false when phone was never on the list", () => {
    expect(removeFromDncList("0541111111")).toBe(false);
  });
});

describe("S724 -- DNC list: getDncList / clearDncList", () => {
  it("getDncList returns array of listed phones", () => {
    addToDncList("0541234567");
    addToDncList("0549999999");
    const list = getDncList();
    expect(list.length).toBe(2);
  });

  it("clearDncList empties the list", () => {
    addToDncList("0541234567");
    clearDncList();
    expect(getDncList().length).toBe(0);
  });
});

describe("S724 -- DNC list: filterOutDnc", () => {
  it("removes DNC phones from a batch", () => {
    addToDncList("0541234567");
    const result = filterOutDnc(["0541234567", "0549999999"]);
    expect(result).not.toContain("0541234567");
    expect(result.length).toBe(1);
  });
});

describe("S724 -- Message templates: listMessageTemplates", () => {
  it("returns array of template names including built-ins", () => {
    const names = listMessageTemplates();
    expect(Array.isArray(names)).toBe(true);
    expect(names).toContain("rsvpConfirm");
    expect(names).toContain("rsvpReminder");
  });
});

describe("S724 -- Message templates: renderMessageTemplate", () => {
  it("renders rsvpConfirm with firstName and weddingDate", () => {
    const result = renderMessageTemplate("rsvpConfirm", { firstName: "יוסי", weddingDate: "01/06/2026" });
    expect(result).toContain("יוסי");
    expect(result).toContain("01/06/2026");
  });

  it("renders rsvpReminder", () => {
    const result = renderMessageTemplate("rsvpReminder", { firstName: "שרה", weddingDate: "01/06/2026" });
    expect(result).toContain("שרה");
  });
});

describe("S724 -- Message templates: registerMessageTemplate", () => {
  it("registers a custom template and renders it", () => {
    registerMessageTemplate("customTest", "Hello {{name}}!");
    const result = renderMessageTemplate("customTest", { name: "World" });
    expect(result).toContain("World");
  });
});

describe("S724 -- Message templates: getBuiltInTemplates", () => {
  it("returns object with built-in keys", () => {
    const templates = getBuiltInTemplates();
    expect(templates).toHaveProperty("rsvpConfirm");
    expect(templates).toHaveProperty("generalInfo");
  });
});
