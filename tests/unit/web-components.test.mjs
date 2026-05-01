// @ts-check
/**
 * @vitest-environment happy-dom
 * tests/unit/web-components.test.mjs — S589 <rsvp-pill> + <table-card>
 */
import { describe, it, expect, beforeAll } from "vitest";

beforeAll(async () => {
  await import("../../src/components/rsvp-pill.js");
  await import("../../src/components/table-card.js");
});

describe("S589 <rsvp-pill>", () => {
  it("registers as a custom element", () => {
    expect(customElements.get("rsvp-pill")).toBeDefined();
  });

  it("defaults to status='no-response' on connect", () => {
    const el = document.createElement("rsvp-pill");
    document.body.appendChild(el);
    expect(el.getAttribute("status")).toBe("no-response");
    expect(el.getAttribute("role")).toBe("status");
  });

  it("renders the count attribute when numeric", () => {
    const el = document.createElement("rsvp-pill");
    el.setAttribute("status", "confirmed");
    el.setAttribute("count", "5");
    document.body.appendChild(el);
    const part = el.shadowRoot?.querySelector("[part='count']");
    expect(part?.textContent).toBe("5");
  });

  it("rejects unknown statuses by reverting to no-response", () => {
    const el = document.createElement("rsvp-pill");
    document.body.appendChild(el);
    el.setAttribute("status", "garbage");
    expect(el.getAttribute("status")).toBe("no-response");
  });
});

describe("S589 <table-card>", () => {
  it("registers as a custom element", () => {
    expect(customElements.get("table-card")).toBeDefined();
  });

  it("derives status='full' when assigned === seats", () => {
    const el = document.createElement("table-card");
    el.setAttribute("name", "Table 1");
    el.setAttribute("seats", "8");
    el.setAttribute("assigned", "8");
    document.body.appendChild(el);
    expect(el.getAttribute("status")).toBe("full");
  });

  it("derives status='over' when assigned > seats", () => {
    const el = document.createElement("table-card");
    el.setAttribute("seats", "6");
    el.setAttribute("assigned", "9");
    document.body.appendChild(el);
    expect(el.getAttribute("status")).toBe("over");
  });

  it("derives status='ok' when under capacity", () => {
    const el = document.createElement("table-card");
    el.setAttribute("seats", "10");
    el.setAttribute("assigned", "3");
    document.body.appendChild(el);
    expect(el.getAttribute("status")).toBe("ok");
  });

  it("renders 'assigned / seats' label", () => {
    const el = document.createElement("table-card");
    el.setAttribute("seats", "10");
    el.setAttribute("assigned", "4");
    document.body.appendChild(el);
    const seats = el.shadowRoot?.querySelector("[part='seats']");
    expect(seats?.textContent).toBe("4 / 10");
  });
});

describe("S589 deriveTableStatus pure helper", () => {
  it("returns ok for invalid seats", async () => {
    const { deriveTableStatus } = await import("../../src/components/table-card.js");
    expect(deriveTableStatus(2, 0)).toBe("ok");
    expect(deriveTableStatus(2, Number.NaN)).toBe("ok");
  });
});
