/**
 * tests/unit/dom-helpers.test.mjs — Sprint 187
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  qs, qsa, addClass, removeClass, toggleClass, setText,
  setData, getData, show, hide, createElement, clearChildren,
} from "../../src/utils/dom-helpers.js";

/** @type {HTMLDivElement} */
let container;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

// Use afterEach cleanup via module-level teardown isn't needed since happy-dom resets between files

describe("qs / qsa", () => {
  it("qs finds first matching element", () => {
    container.innerHTML = "<span class=\"a\">hello</span>";
    expect(qs(".a", container)).not.toBeNull();
  });

  it("qs returns null for no match", () => {
    expect(qs(".no-match", container)).toBeNull();
  });

  it("qsa returns all matching elements", () => {
    container.innerHTML = "<span>a</span><span>b</span>";
    expect(qsa("span", container)).toHaveLength(2);
  });

  it("qsa returns empty array on no match", () => {
    expect(qsa(".no-match", container)).toEqual([]);
  });
});

describe("addClass / removeClass / toggleClass", () => {
  it("addClass adds class", () => {
    const el = document.createElement("div");
    addClass(el, "active");
    expect(el.classList.contains("active")).toBe(true);
  });

  it("addClass adds multiple classes", () => {
    const el = document.createElement("div");
    addClass(el, "a", "b");
    expect(el.classList.contains("a") && el.classList.contains("b")).toBe(true);
  });

  it("removeClass removes class", () => {
    const el = document.createElement("div");
    el.className = "active";
    removeClass(el, "active");
    expect(el.classList.contains("active")).toBe(false);
  });

  it("toggleClass toggles class on/off", () => {
    const el = document.createElement("div");
    toggleClass(el, "on");
    expect(el.classList.contains("on")).toBe(true);
    toggleClass(el, "on");
    expect(el.classList.contains("on")).toBe(false);
  });

  it("toggleClass with force=true adds class", () => {
    const el = document.createElement("div");
    toggleClass(el, "on", true);
    expect(el.classList.contains("on")).toBe(true);
  });
});

describe("setText", () => {
  it("sets text content", () => {
    const el = document.createElement("p");
    setText(el, "Hello World");
    expect(el.textContent).toBe("Hello World");
  });

  it("does not interpret HTML tags as markup", () => {
    const el = document.createElement("p");
    setText(el, "<b>bold</b>");
    expect(el.textContent).toBe("<b>bold</b>");
    expect(el.querySelector("b")).toBeNull();
  });
});

describe("setData / getData", () => {
  it("sets and gets a data attribute", () => {
    const el = document.createElement("div");
    setData(el, "guestId", "42");
    expect(getData(el, "guestId")).toBe("42");
  });

  it("returns empty string for unset attribute", () => {
    const el = document.createElement("div");
    expect(getData(el, "missing")).toBe("");
  });
});

describe("show / hide", () => {
  it("hide sets hidden=true", () => {
    const el = document.createElement("div");
    hide(el);
    expect(/** @type {HTMLElement} */ (el).hidden).toBe(true);
  });

  it("show sets hidden=false and removes hidden class", () => {
    const el = document.createElement("div");
    el.classList.add("hidden");
    /** @type {HTMLElement} */ (el).hidden = true;
    show(el);
    expect(/** @type {HTMLElement} */ (el).hidden).toBe(false);
    expect(el.classList.contains("hidden")).toBe(false);
  });
});

describe("createElement", () => {
  it("creates element with tag", () => {
    const el = createElement("button");
    expect(el.tagName).toBe("BUTTON");
  });

  it("sets attributes", () => {
    const el = createElement("input", { type: "text", placeholder: "Name" });
    expect(el.getAttribute("type")).toBe("text");
    expect(el.getAttribute("placeholder")).toBe("Name");
  });

  it("appends string children as text nodes", () => {
    const el = createElement("span", {}, ["Hello"]);
    expect(el.textContent).toBe("Hello");
  });

  it("appends element children", () => {
    const child = document.createElement("em");
    const el = createElement("p", {}, [child]);
    expect(el.querySelector("em")).not.toBeNull();
  });
});

describe("clearChildren", () => {
  it("removes all children", () => {
    const parent = document.createElement("ul");
    parent.innerHTML = "<li>1</li><li>2</li><li>3</li>";
    clearChildren(parent);
    expect(parent.children).toHaveLength(0);
  });

  it("does not throw for empty element", () => {
    const el = document.createElement("div");
    expect(() => clearChildren(el)).not.toThrow();
  });
});
