/**
 * @file secure-storage-crypto-wiring.test.mjs
 * Sprint 62 — A3: secure-storage.js wired to crypto.js
 *
 * Verifies that:
 *  1. secure-storage.js imports from crypto.js (static analysis).
 *  2. setSecure/getSecure round-trip works in a mocked environment.
 *  3. Legacy { v, iv, ct } envelopes are handled gracefully.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { createLocalStorageMock } from "./helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ssPath = path.resolve(__dirname, "../../src/services/secure-storage.js");
const SS_SRC = readFileSync(ssPath, "utf8");

// ── Static analysis tests ────────────────────────────────────────────────────

describe("secure-storage.js → crypto.js wiring (static)", () => {
  it("imports from ./crypto.js", () => {
    expect(SS_SRC).toContain('from "./crypto.js"');
  });

  it("imports encryptField from crypto.js", () => {
    expect(SS_SRC).toContain("encryptField");
  });

  it("imports decryptField from crypto.js", () => {
    expect(SS_SRC).toContain("decryptField");
  });

  it("imports importRawKey from crypto.js", () => {
    expect(SS_SRC).toContain("importRawKey");
  });

  it("no longer calls crypto.subtle.encrypt inline in setSecure", () => {
    // The inline encrypt call should be gone from setSecure body
    const setSecureBody = SS_SRC.slice(
      SS_SRC.indexOf("export async function setSecure"),
      SS_SRC.indexOf("export async function getSecure"),
    );
    expect(setSecureBody).not.toContain("crypto.subtle.encrypt");
  });

  it("no longer calls crypto.subtle.decrypt inline in getSecure", () => {
    const getSecureBody = SS_SRC.slice(
      SS_SRC.indexOf("export async function getSecure"),
      SS_SRC.indexOf("export function removeSecure"),
    );
    expect(getSecureBody).not.toContain("crypto.subtle.decrypt");
  });

  it("setSecure uses encryptField()", () => {
    const setSecureBody = SS_SRC.slice(
      SS_SRC.indexOf("export async function setSecure"),
      SS_SRC.indexOf("export async function getSecure"),
    );
    expect(setSecureBody).toContain("encryptField(cryptoKey,");
  });

  it("getSecure uses decryptField()", () => {
    const getSecureBody = SS_SRC.slice(
      SS_SRC.indexOf("export async function getSecure"),
      SS_SRC.indexOf("export function removeSecure"),
    );
    expect(getSecureBody).toContain("decryptField(cryptoKey,");
  });

  it("stores new envelope format with 'd' field", () => {
    const setSecureBody = SS_SRC.slice(
      SS_SRC.indexOf("export async function setSecure"),
      SS_SRC.indexOf("export async function getSecure"),
    );
    // d: sealed — property name is unquoted in source object literal
    expect(setSecureBody).toContain("d: sealed");
  });

  it("reads new envelope format with 'd' field in getSecure", () => {
    const getSecureBody = SS_SRC.slice(
      SS_SRC.indexOf("export async function getSecure"),
      SS_SRC.indexOf("export function removeSecure"),
    );
    expect(getSecureBody).toContain("env.d");
  });

  it("handles legacy iv+ct format in getSecure for backward compat", () => {
    const getSecureBody = SS_SRC.slice(
      SS_SRC.indexOf("export async function getSecure"),
      SS_SRC.indexOf("export function removeSecure"),
    );
    expect(getSecureBody).toContain("env.iv && env.ct");
  });

  it("uses importRawKey() in _getKey instead of crypto.subtle.importKey", () => {
    const getKeyBody = SS_SRC.slice(
      SS_SRC.indexOf("function _getKey"),
      SS_SRC.indexOf("export function rotateDeviceKey"),
    );
    expect(getKeyBody).toContain("importRawKey(raw)");
    expect(getKeyBody).not.toContain("crypto.subtle.importKey");
  });

  it("still exports rotateDeviceKey", () => {
    expect(SS_SRC).toContain("export function rotateDeviceKey");
  });

  it("still exports removeSecure", () => {
    expect(SS_SRC).toContain("export function removeSecure");
  });

  it("still exports _resetKeyForTests", () => {
    expect(SS_SRC).toContain("export function _resetKeyForTests");
  });

  it("envelope version constant is still 1", () => {
    expect(SS_SRC).toContain("const ENVELOPE_VERSION = 1");
  });
});

// ── Runtime round-trip test ──────────────────────────────────────────────────

describe("secure-storage.js → crypto.js round-trip (runtime)", () => {
  let store;

  beforeEach(() => {
    const { mock: lsMock, store: lsData } = createLocalStorageMock();
    store = lsData;
    vi.stubGlobal("localStorage", lsMock);
  });

  it("setSecure + getSecure round-trips a string value", async () => {
    const { setSecure, getSecure, _resetKeyForTests } = await import(
      "../../src/services/secure-storage.js"
    );
    _resetKeyForTests();
    await setSecure("test_key", "hello world");
    const result = await getSecure("test_key");
    expect(result).toBe("hello world");
  });

  it("setSecure + getSecure round-trips an object value", async () => {
    const { setSecure, getSecure, _resetKeyForTests } = await import(
      "../../src/services/secure-storage.js"
    );
    _resetKeyForTests();
    const obj = { name: "Yair", phone: "0541234567" };
    await setSecure("user_obj", obj);
    const result = await getSecure("user_obj");
    expect(result).toEqual(obj);
  });

  it("getSecure returns null for missing key", async () => {
    const { getSecure, _resetKeyForTests } = await import(
      "../../src/services/secure-storage.js"
    );
    _resetKeyForTests();
    const result = await getSecure("nonexistent_key");
    expect(result).toBeNull();
  });

  it("removeSecure deletes the entry", async () => {
    const { setSecure, getSecure, removeSecure, _resetKeyForTests } = await import(
      "../../src/services/secure-storage.js"
    );
    _resetKeyForTests();
    await setSecure("to_remove", 42);
    removeSecure("to_remove");
    const result = await getSecure("to_remove");
    expect(result).toBeNull();
  });

  it("getSecure returns null for legacy plaintext (non-JSON envelope)", async () => {
    const { getSecure, _resetKeyForTests } = await import(
      "../../src/services/secure-storage.js"
    );
    _resetKeyForTests();
    store["wedding_v1_legacy"] = "plaintext-value";
    const result = await getSecure("legacy");
    expect(result).toBeNull();
  });
});
