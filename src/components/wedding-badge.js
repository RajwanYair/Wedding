/**
 * @owner ui
 * `<wedding-badge>` — first Web Component primitive (S572).
 *
 * A small, accessible status pill rendered inside a Shadow DOM so app
 * styles cannot bleed in.  Use anywhere a coloured chip is needed.
 *
 * Attributes:
 *   - `variant`: "info" | "success" | "warning" | "error" | "neutral"
 *     (default "neutral").
 *   - `text`: badge label (string).  Children are also rendered if no
 *     `text` attribute is set.
 *
 * Example:
 *   <wedding-badge variant="success" text="confirmed"></wedding-badge>
 */

const VARIANTS = new Set(["info", "success", "warning", "error", "neutral"]);

const STYLE = `
  :host {
    display: inline-flex;
    align-items: center;
    gap: 0.35em;
    padding: 0.15em 0.6em;
    border-radius: 999px;
    font-size: 0.82em;
    font-weight: 600;
    line-height: 1.4;
    border: 1px solid currentcolor;
    background: color-mix(in oklch, currentcolor 12%, transparent);
    color: var(--text-primary, #f0e6d6);
    white-space: nowrap;
    user-select: none;
  }
  :host([variant="info"])    { color: var(--accent, #60a5fa); }
  :host([variant="success"]) { color: var(--positive, #34d399); }
  :host([variant="warning"]) { color: var(--warning, #f59e0b); }
  :host([variant="error"])   { color: var(--negative, #f87171); }
  :host([variant="neutral"]) { color: var(--text-secondary, #cbd5e1); }
`;

class WeddingBadge extends HTMLElement {
  static get observedAttributes() {
    return ["variant", "text"];
  }

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLE;
    const slot = document.createElement("slot");
    slot.name = "label";
    const span = document.createElement("span");
    span.part = "label";
    root.append(style, span, slot);
    this._label = span;
  }

  connectedCallback() {
    if (!this.hasAttribute("variant")) {
      this.setAttribute("variant", "neutral");
    }
    this.setAttribute("role", "status");
    this._render();
  }

  /**
   * @param {string} name
   * @param {string|null} _old
   * @param {string|null} _next
   */
  attributeChangedCallback(name, _old, _next) {
    if (name === "variant") {
      const value = this.getAttribute("variant") ?? "neutral";
      if (!VARIANTS.has(value)) {
        this.setAttribute("variant", "neutral");
        return;
      }
    }
    this._render();
  }

  _render() {
    const text = this.getAttribute("text") ?? "";
    this._label.textContent = text;
  }
}

if (typeof customElements !== "undefined" && !customElements.get("wedding-badge")) {
  customElements.define("wedding-badge", WeddingBadge);
}

export { WeddingBadge };
