/**
 * tests/unit/template-loader.test.mjs — Unit tests for template-loader core module
 * Covers: onTemplateLoaded callback registration
 *
 * @vitest-environment happy-dom
 * Run: npm test
 */

import { describe, it, expect, vi } from "vitest";
import { onTemplateLoaded } from "../../src/core/template-loader.js";

describe("onTemplateLoaded", () => {
  it("is a function", () => {
    expect(typeof onTemplateLoaded).toBe("function");
  });

  it("accepts a section name and callback without throwing", () => {
    expect(() => onTemplateLoaded("test-section", () => {})).not.toThrow();
  });

  it("accepts multiple callbacks for same section", () => {
    const spy1 = vi.fn();
    const spy2 = vi.fn();
    expect(() => {
      onTemplateLoaded("multi", spy1);
      onTemplateLoaded("multi", spy2);
    }).not.toThrow();
  });
});
