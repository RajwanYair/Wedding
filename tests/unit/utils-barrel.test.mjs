/**
 * tests/unit/utils-barrel.test.mjs — src/utils/index.js barrel re-export smoke tests (Sprint 4)
 * @vitest-environment happy-dom
 *
 * Verifies that the utils barrel re-exports the expected symbols from each
 * sub-module. These are structural wiring tests — behaviour is covered in
 * each module's own test suite.
 */

import { describe, it, expect } from "vitest";
import * as utils from "../../src/utils/index.js";

describe("utils/index.js barrel", () => {
  // ── phone ──────────────────────────────────────────────────────────────
  it("re-exports cleanPhone from phone.js", () => {
    expect(typeof utils.cleanPhone).toBe("function");
  });

  it("re-exports isValidPhone from phone.js", () => {
    expect(typeof utils.isValidPhone).toBe("function");
  });

  // ── date ───────────────────────────────────────────────────────────────
  it("re-exports formatDateHebrew from date.js", () => {
    expect(typeof utils.formatDateHebrew).toBe("function");
  });

  it("re-exports daysUntil from date.js", () => {
    expect(typeof utils.daysUntil).toBe("function");
  });

  it("re-exports nowISOJerusalem from date.js", () => {
    expect(typeof utils.nowISOJerusalem).toBe("function");
  });

  // ── sanitize ───────────────────────────────────────────────────────────
  it("re-exports sanitizeInput from sanitize.js", () => {
    expect(typeof utils.sanitizeInput).toBe("function");
  });

  it("re-exports sanitize from sanitize.js", () => {
    expect(typeof utils.sanitize).toBe("function");
  });

  // ── misc ───────────────────────────────────────────────────────────────
  it("re-exports uid from misc.js", () => {
    expect(typeof utils.uid).toBe("function");
  });

  it("re-exports guestFullName from misc.js", () => {
    expect(typeof utils.guestFullName).toBe("function");
  });

  it("re-exports isValidHttpsUrl from misc.js", () => {
    expect(typeof utils.isValidHttpsUrl).toBe("function");
  });

  // ── roles ──────────────────────────────────────────────────────────────
  it("re-exports ROLES from roles.js", () => {
    expect(utils.ROLES != null).toBe(true);
  });

  it("re-exports resolveRole from roles.js", () => {
    expect(typeof utils.resolveRole).toBe("function");
  });

  it("re-exports hasPermission from roles.js", () => {
    expect(typeof utils.hasPermission).toBe("function");
  });

  // ── pagination ─────────────────────────────────────────────────────────
  it("re-exports paginateArray from pagination.js", () => {
    expect(typeof utils.paginateArray).toBe("function");
  });

  it("re-exports createPageState from pagination.js", () => {
    expect(typeof utils.createPageState).toBe("function");
  });
});
