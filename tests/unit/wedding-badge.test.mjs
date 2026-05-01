/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeAll } from "vitest";

beforeAll(async () => {
  await import("../../src/components/wedding-badge.js");
});

describe("<wedding-badge> (S572)", () => {
  it("registers as a custom element", () => {
    expect(customElements.get("wedding-badge")).toBeDefined();
  });

  it("defaults variant to neutral when omitted", () => {
    const el = document.createElement("wedding-badge");
    document.body.append(el);
    expect(el.getAttribute("variant")).toBe("neutral");
    expect(el.getAttribute("role")).toBe("status");
  });

  it("renders the text attribute as visible label", () => {
    const el = document.createElement("wedding-badge");
    el.setAttribute("text", "confirmed");
    el.setAttribute("variant", "success");
    document.body.append(el);
    const span = el.shadowRoot?.querySelector("span");
    expect(span?.textContent).toBe("confirmed");
  });

  it("rejects unknown variants and falls back to neutral", () => {
    const el = document.createElement("wedding-badge");
    el.setAttribute("variant", "bogus");
    document.body.append(el);
    expect(el.getAttribute("variant")).toBe("neutral");
  });

  it("isolates styles inside Shadow DOM", () => {
    const el = document.createElement("wedding-badge");
    document.body.append(el);
    expect(el.shadowRoot?.querySelector("style")).not.toBeNull();
  });
});
