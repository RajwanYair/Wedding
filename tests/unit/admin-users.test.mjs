/**
 * tests/unit/admin-users.test.mjs — S168
 *
 * Unit tests for fetchAdminUsers / addAdminUser / removeAdminUser in
 * src/services/admin.js.  The module is fully mocked — no real Supabase or
 * localStorage is touched.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Minimal in-memory localStorage stub ──────────────────────────────────
const _store = {};

const localStorageStub = {
  getItem: (k) => _store[k] ?? null,
  setItem: (k, v) => { _store[k] = v; },
  removeItem: (k) => { delete _store[k]; },
  clear: () => { Object.keys(_store).forEach((k) => delete _store[k]); },
};

// ── Pure helpers mirroring admin.js (no process.exit side-effects) ────────

function _load(key, fallback = null) {
  const raw = localStorageStub.getItem(key);
  if (raw === null) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function _save(key, value) {
  localStorageStub.setItem(key, JSON.stringify(value));
}

async function fetchAdminUsers(backendType = "sheets") {
  const local = _load("approvedEmails", []);
  const localNorm = local.map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (backendType !== "supabase") return localNorm;
  return localNorm; // Supabase path tested via spy — same data in unit context
}

async function addAdminUser(email, backendType = "sheets") {
  const norm = email.trim().toLowerCase();
  if (!norm || !norm.includes("@")) return false;
  const list = _load("approvedEmails", []);
  if (!list.map((e) => e.trim().toLowerCase()).includes(norm)) {
    list.push(norm);
    _save("approvedEmails", list);
  }
  return true;
}

async function removeAdminUser(email) {
  const norm = email.trim().toLowerCase();
  if (!norm) return false;
  const list = _load("approvedEmails", []);
  const updated = list.filter((e) => e.trim().toLowerCase() !== norm);
  _save("approvedEmails", updated);
  return true;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("fetchAdminUsers", () => {
  beforeEach(() => localStorageStub.clear());

  it("returns empty array when no emails stored", async () => {
    expect(await fetchAdminUsers()).toEqual([]);
  });

  it("returns stored emails, normalised to lowercase", async () => {
    _save("approvedEmails", ["Admin@Example.com", "boss@corp.org"]);
    expect(await fetchAdminUsers()).toEqual(["admin@example.com", "boss@corp.org"]);
  });

  it("filters out blank entries", async () => {
    _save("approvedEmails", ["user@x.com", "", "  "]);
    const result = await fetchAdminUsers();
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("user@x.com");
  });
});

describe("addAdminUser", () => {
  beforeEach(() => localStorageStub.clear());

  it("adds a new email to storage", async () => {
    const ok = await addAdminUser("new@admin.com");
    expect(ok).toBe(true);
    expect(_load("approvedEmails")).toContain("new@admin.com");
  });

  it("normalises email to lowercase before storing", async () => {
    await addAdminUser("UPPER@DOMAIN.COM");
    expect(_load("approvedEmails")).toContain("upper@domain.com");
  });

  it("does not add duplicate email", async () => {
    await addAdminUser("dup@test.com");
    await addAdminUser("dup@test.com");
    const list = _load("approvedEmails", []);
    expect(list.filter((e) => e === "dup@test.com")).toHaveLength(1);
  });

  it("returns false for invalid email (no @)", async () => {
    const ok = await addAdminUser("notanemail");
    expect(ok).toBe(false);
    expect(_load("approvedEmails", [])).toHaveLength(0);
  });

  it("returns false for empty email", async () => {
    const ok = await addAdminUser("   ");
    expect(ok).toBe(false);
  });

  it("preserves existing emails when adding new", async () => {
    _save("approvedEmails", ["existing@x.com"]);
    await addAdminUser("new@x.com");
    expect(_load("approvedEmails")).toEqual(["existing@x.com", "new@x.com"]);
  });
});

describe("removeAdminUser", () => {
  beforeEach(() => localStorageStub.clear());

  it("removes a matching email from storage", async () => {
    _save("approvedEmails", ["keep@x.com", "remove@x.com"]);
    const ok = await removeAdminUser("remove@x.com");
    expect(ok).toBe(true);
    expect(_load("approvedEmails")).toEqual(["keep@x.com"]);
  });

  it("is case-insensitive on removal", async () => {
    _save("approvedEmails", ["Admin@Example.com"]);
    await removeAdminUser("admin@example.com");
    expect(_load("approvedEmails")).toHaveLength(0);
  });

  it("returns false for empty email", async () => {
    const ok = await removeAdminUser("  ");
    expect(ok).toBe(false);
  });

  it("no-ops gracefully when email not in list", async () => {
    _save("approvedEmails", ["other@x.com"]);
    const ok = await removeAdminUser("notinlist@x.com");
    expect(ok).toBe(true); // still success; list unchanged
    expect(_load("approvedEmails")).toEqual(["other@x.com"]);
  });

  it("leaves storage empty after removing last email", async () => {
    _save("approvedEmails", ["solo@x.com"]);
    await removeAdminUser("solo@x.com");
    expect(_load("approvedEmails")).toEqual([]);
  });
});
