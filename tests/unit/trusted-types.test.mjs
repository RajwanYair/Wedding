/**
 * tests/unit/trusted-types.test.mjs — Unit tests for src/core/trusted-types.js (S90)
 * @vitest-environment happy-dom
 */
import { describe, it, expect, afterEach } from "vitest";

import {
  WEDDING_HTML_POLICY,
  isTrustedTypesSupported,
  installTrustedTypesPolicy,
  trustedHtml,
} from "../../src/core/trusted-types.js";

describe("trusted-types (S90)", () => {
  afterEach(() => {
    // @ts-ignore — strip stub between tests
    delete globalThis.trustedTypes;
  });

  it("WEDDING_HTML_POLICY constant is the documented name", () => {
    expect(WEDDING_HTML_POLICY).toBe("wedding-html");
  });

  it("isTrustedTypesSupported returns false in non-TT environments", () => {
    expect(isTrustedTypesSupported()).toBe(false);
  });

  it("installTrustedTypesPolicy returns null when TT API is missing", () => {
    expect(installTrustedTypesPolicy()).toBeNull();
  });

  it("trustedHtml falls back to DOMPurify sanitisation without TT", () => {
    const dirty = '<img src=x onerror="alert(1)">';
    const out = trustedHtml(dirty);
    expect(typeof out).toBe("string");
    expect(out).not.toContain("onerror");
  });

  it("installTrustedTypesPolicy registers wedding-html policy when TT is available", () => {
    /** @type {Array<string>} */
    const created = [];
    // @ts-ignore — stub global
    globalThis.trustedTypes = {
      createPolicy(name, rules) {
        created.push(name);
        return {
          createHTML(html) {
            return rules.createHTML(html);
          },
        };
      },
    };
    const policy = installTrustedTypesPolicy();
    expect(policy).not.toBeNull();
    expect(created).toContain(WEDDING_HTML_POLICY);
    expect(created).toContain("default");
    const html = policy?.sanitize('<b>ok</b><script>1</script>');
    expect(html).toContain("<b>ok</b>");
    expect(html).not.toContain("<script>");
  });
});
