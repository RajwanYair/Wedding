/**
 * tests/unit/status-bar.test.mjs — Sprint 188
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/core/config.js", () => ({
  APP_VERSION: "7.8.0",
  SHEETS_WEBAPP_URL: "",
}));

vi.mock("../../src/core/i18n.js", () => ({
  t: vi.fn((key) => key),
}));

vi.mock("../../src/core/state.js", () => ({
  load: vi.fn(() => ""),
}));

// Import after mocks
import { updateStatusBar } from "../../src/core/status-bar.js";

/** Create the three status bar DOM elements */
function buildStatusDom() {
  ["statusVersion", "statusGas", "statusRole"].forEach((id) => {
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    const el = document.createElement("span");
    el.id = id;
    document.body.appendChild(el);
  });
}

beforeEach(() => {
  buildStatusDom();
});

describe("updateStatusBar", () => {
  it("sets version element to vX.Y.Z from APP_VERSION", () => {
    updateStatusBar(null);
    expect(document.getElementById("statusVersion")?.textContent).toBe("v7.8.0");
  });

  it("clears GAS element when _gasVersion is empty", () => {
    updateStatusBar(null);
    expect(document.getElementById("statusGas")?.textContent).toBe("");
  });

  it("shows admin role for admin user", () => {
    updateStatusBar({ isAdmin: true, email: "admin@example.com" });
    const roleEl = document.getElementById("statusRole");
    expect(roleEl?.textContent).toContain("role_admin");
  });

  it("shows guest role for non-admin or null user", () => {
    updateStatusBar(null);
    const roleEl = document.getElementById("statusRole");
    expect(roleEl?.textContent).toContain("role_guest");
  });

  it("does not throw when DOM elements are absent", () => {
    ["statusVersion", "statusGas", "statusRole"].forEach((id) => {
      document.getElementById(id)?.remove();
    });
    expect(() => updateStatusBar(null)).not.toThrow();
  });
});
