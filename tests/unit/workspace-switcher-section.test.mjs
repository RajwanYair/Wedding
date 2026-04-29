/**
 * tests/unit/workspace-switcher-section.test.mjs — S317: coverage for
 * @vitest-environment happy-dom
 * src/sections/workspace-switcher.js
 *
 * Tests getWorkspaces, getActiveWorkspace, switchWorkspace, renderWorkspaceSwitcher,
 * toggleWorkspaceDropdown, selectWorkspace, and mount/unmount lifecycle.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────

const _store = new Map();
vi.mock("../../src/core/store.js", () => ({
  storeGet: vi.fn((k) => _store.get(k) ?? null),
  storeSet: vi.fn((k, v) => _store.set(k, v)),
  storeSubscribe: vi.fn(() => () => {}),
  storeSubscribeScoped: vi.fn(() => () => {}),
  cleanupScope: vi.fn(),
}));

vi.mock("../../src/core/sync.js", () => ({
  enqueueWrite: vi.fn(async (_k, fn) => fn()),
}));

vi.mock("../../src/core/i18n.js", () => ({
  t: (/** @type {string} */ k) => k,
}));

vi.mock("../../src/services/workspace.js", () => ({
  hasPermission: vi.fn((role) => role === "owner"),
}));

// ── Module under test ────────────────────────────────────────────────────

import {
  mount,
  unmount,
  toggleWorkspaceDropdown,
  selectWorkspace,
  capabilities,
} from "../../src/sections/workspace-switcher.js";

// ── Helpers ───────────────────────────────────────────────────────────────

function makeDom() {
  document.body.innerHTML = `<div id="workspaceSwitcher"></div>`;
}

function setWorkspaces(workspaces, activeId = null) {
  _store.set("workspaces", workspaces);
  if (activeId) _store.set("activeWorkspace", activeId);
  else _store.delete("activeWorkspace");
}

beforeEach(async () => {
  _store.clear();
  makeDom();
  unmount();
  await mount();
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe("S317 — WorkspaceSwitcherSection — lifecycle", () => {
  it("capabilities is defined", () => {
    expect(capabilities).toBeDefined();
  });

  it("mount renders current workspace button", () => {
    const btn = document.querySelector(".ws-current");
    expect(btn).not.toBeNull();
  });

  it("mount renders role badge element", () => {
    const badge = document.querySelector(".ws-role-badge");
    expect(badge).not.toBeNull();
  });

  it("unmount clears the container", async () => {
    unmount();
    expect(document.getElementById("workspaceSwitcher").textContent).toBe("");
  });
});

describe("S317 — WorkspaceSwitcherSection — default workspace", () => {
  it("shows workspace_default label when no workspaces in store", () => {
    const btn = document.querySelector(".ws-current");
    expect(btn.textContent).toContain("workspace_default");
  });

  it("shows owner badge emoji by default", () => {
    const btn = document.querySelector(".ws-current");
    expect(btn.textContent).toContain("👑");
  });

  it("renders invite button for owner", () => {
    expect(document.querySelector(".ws-invite-btn")).not.toBeNull();
  });
});

describe("S317 — WorkspaceSwitcherSection — multiple workspaces", () => {
  beforeEach(async () => {
    setWorkspaces([
      { id: "ws1", name: "My Wedding", role: "owner" },
      { id: "ws2", name: "Test Event", role: "co_planner" },
    ], "ws1");
    makeDom();
    unmount();
    await mount();
  });

  it("renders a dropdown list with multiple workspaces", () => {
    const dropdown = document.getElementById("wsDropdown");
    expect(dropdown).not.toBeNull();
    const items = dropdown.querySelectorAll(".ws-item");
    expect(items.length).toBe(2);
  });

  it("active workspace item has --active modifier", () => {
    const active = document.querySelector(".ws-item--active");
    expect(active).not.toBeNull();
    expect(active.getAttribute("data-action-arg")).toBe("ws1");
  });

  it("non-owner role does not get invite button", async () => {
    setWorkspaces([
      { id: "gs1", name: "Guest Space", role: "guest" },
      { id: "gs2", name: "Other", role: "guest" },
    ], "gs1");
    makeDom();
    unmount();
    await mount();
    expect(document.querySelector(".ws-invite-btn")).toBeNull();
  });
});

describe("S317 — WorkspaceSwitcherSection — toggleWorkspaceDropdown", () => {
  beforeEach(async () => {
    setWorkspaces([
      { id: "a", name: "A", role: "owner" },
      { id: "b", name: "B", role: "co_planner" },
    ], "a");
    makeDom();
    unmount();
    await mount();
  });

  it("shows dropdown on first toggle", () => {
    const dropdown = document.getElementById("wsDropdown");
    toggleWorkspaceDropdown();
    expect(dropdown.classList.contains("u-hidden")).toBe(false);
  });

  it("hides dropdown on second toggle", () => {
    toggleWorkspaceDropdown();
    toggleWorkspaceDropdown();
    const dropdown = document.getElementById("wsDropdown");
    expect(dropdown.classList.contains("u-hidden")).toBe(true);
  });

  it("does nothing when dropdown is missing", () => {
    document.body.innerHTML = `<div id="workspaceSwitcher"></div>`;
    expect(() => toggleWorkspaceDropdown()).not.toThrow();
  });
});

describe("S317 — WorkspaceSwitcherSection — selectWorkspace", () => {
  beforeEach(async () => {
    setWorkspaces([
      { id: "w1", name: "First", role: "owner" },
      { id: "w2", name: "Second", role: "vendor" },
    ], "w1");
    makeDom();
    unmount();
    await mount();
  });

  it("switches to a valid workspace and updates active key in store", () => {
    selectWorkspace("w2");
    // store mock sets the key directly
    expect(_store.get("activeWorkspace")).toBe("w2");
  });

  it("does nothing for an unknown workspace id", () => {
    const before = _store.get("activeWorkspace");
    selectWorkspace("nonexistent");
    expect(_store.get("activeWorkspace")).toBe(before);
  });
});

describe("S317 — WorkspaceSwitcherSection — role badges", () => {
  it.each([
    ["owner", "👑"],
    ["co_planner", "🤝"],
    ["vendor", "🏪"],
    ["photographer", "📸"],
    ["guest", "👤"],
    ["unknown", "👤"],
  ])("role %s maps to badge %s", async (role, badge) => {
    setWorkspaces([{ id: "test", name: "Test", role }], "test");
    makeDom();
    unmount();
    await mount();
    const btn = document.querySelector(".ws-current");
    expect(btn.textContent).toContain(badge);
  });
});
