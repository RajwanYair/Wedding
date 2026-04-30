/**
 * tests/unit/webauthn.test.mjs — S442: coverage for src/utils/webauthn.js
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── localStorage mock ──────────────────────────────────────────────────────
const _store = {};
const localStorageMock = {
  getItem: vi.fn((k) => _store[k] ?? null),
  setItem: vi.fn((k, v) => { _store[k] = v; }),
  removeItem: vi.fn((k) => { delete _store[k]; }),
};
vi.stubGlobal("localStorage", localStorageMock);

// ── crypto mock (needs getRandomValues + randomUUID) ──────────────────────
vi.stubGlobal("crypto", {
  getRandomValues: (arr) => { arr.fill(1); return arr; },
  randomUUID: () => "00000000-0000-0000-0000-000000000001",
});

// ── btoa / atob ────────────────────────────────────────────────────────────
vi.stubGlobal("btoa", (s) => Buffer.from(s, "binary").toString("base64"));
vi.stubGlobal("atob", (s) => Buffer.from(s, "base64").toString("binary"));

// ── PublicKeyCredential + navigator.credentials mock ──────────────────────
const FAKE_CRED_ID = new Uint8Array([1, 2, 3]).buffer;
const credCreateMock = vi.fn(() =>
  Promise.resolve({ rawId: FAKE_CRED_ID, id: "AQID", type: "public-key" })
);
const credGetMock = vi.fn(() =>
  Promise.resolve({ rawId: FAKE_CRED_ID, id: "AQID", type: "public-key" })
);
vi.stubGlobal("PublicKeyCredential", class {});
vi.stubGlobal("navigator", {
  credentials: { create: credCreateMock, get: credGetMock },
});
vi.stubGlobal("window", {
  PublicKeyCredential: class {},
});
vi.stubGlobal("location", { hostname: "localhost" });

// ── TextEncoder ────────────────────────────────────────────────────────────
vi.stubGlobal("TextEncoder", class {
  encode(str) { return new Uint8Array(Buffer.from(str, "utf8")); }
});

import {
  isPasskeySupported,
  registerPasskey,
  authenticatePasskey,
  clearPasskeys,
  listPasskeys,
} from "../../src/utils/webauthn.js";

const STORAGE_KEY = "wedding_v1_passkey_creds";

beforeEach(() => {
  Object.keys(_store).forEach((k) => delete _store[k]);
  vi.clearAllMocks();
  credCreateMock.mockResolvedValue({ rawId: FAKE_CRED_ID });
  credGetMock.mockResolvedValue({ rawId: FAKE_CRED_ID });
});

describe("isPasskeySupported", () => {
  it("returns true when all globals are present", () => {
    expect(isPasskeySupported()).toBe(true);
  });
});

describe("registerPasskey", () => {
  it("calls navigator.credentials.create and returns credentialId", async () => {
    const result = await registerPasskey({ id: "u1", name: "Test", displayName: "Test User" });
    expect(credCreateMock).toHaveBeenCalledOnce();
    expect(result).toEqual({ credentialId: expect.any(String) });
  });

  it("persists credential to localStorage", async () => {
    await registerPasskey({ id: "u1", name: "Test", displayName: "Test" });
    expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
    const saved = JSON.parse(_store[STORAGE_KEY]);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ credentialId: expect.any(String), userId: "u1" });
  });

  it("returns null when credentials.create returns falsy", async () => {
    credCreateMock.mockResolvedValue(null);
    const result = await registerPasskey({ id: "u1", name: "Test", displayName: "Test" });
    expect(result).toBeNull();
  });

  it("returns null on NotAllowedError (user cancel)", async () => {
    const err = new Error("cancelled");
    err.name = "NotAllowedError";
    credCreateMock.mockRejectedValue(err);
    const result = await registerPasskey({ id: "u1", name: "Test", displayName: "Test" });
    expect(result).toBeNull();
  });

  it("returns null and warns on other errors", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    credCreateMock.mockRejectedValue(new Error("hardware error"));
    const result = await registerPasskey({ id: "u1", name: "Test", displayName: "Test" });
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe("authenticatePasskey", () => {
  it("calls navigator.credentials.get and returns credentialId", async () => {
    const result = await authenticatePasskey();
    expect(credGetMock).toHaveBeenCalledOnce();
    expect(result).toEqual({ credentialId: expect.any(String) });
  });

  it("returns null when assertion is falsy", async () => {
    credGetMock.mockResolvedValue(null);
    const result = await authenticatePasskey();
    expect(result).toBeNull();
  });

  it("returns null on NotAllowedError", async () => {
    const err = new Error("cancelled");
    err.name = "NotAllowedError";
    credGetMock.mockRejectedValue(err);
    expect(await authenticatePasskey()).toBeNull();
  });

  it("returns null and warns on other errors", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    credGetMock.mockRejectedValue(new Error("timeout"));
    expect(await authenticatePasskey()).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe("clearPasskeys", () => {
  it("removes the storage key", () => {
    _store[STORAGE_KEY] = "[]";
    clearPasskeys();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(_store[STORAGE_KEY]).toBeUndefined();
  });
});

describe("listPasskeys", () => {
  it("returns empty array when nothing stored", () => {
    expect(listPasskeys()).toEqual([]);
  });

  it("returns stored credentials", () => {
    const cred = [{ credentialId: "abc", userId: "u1", ts: 1 }];
    _store[STORAGE_KEY] = JSON.stringify(cred);
    expect(listPasskeys()).toEqual(cred);
  });

  it("returns empty array on corrupt storage", () => {
    _store[STORAGE_KEY] = "not-json{{{";
    expect(listPasskeys()).toEqual([]);
  });
});
