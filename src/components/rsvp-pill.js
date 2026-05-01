/**
 * @owner ui
 * `<rsvp-pill>` — RSVP status pill primitive (S589).
 *
 * Attributes:
 *   - `status`: "confirmed" | "pending" | "declined" | "no-response"
 *     (default "no-response").
 *   - `count`: optional numeric prefix shown before the label.
 *
 * Example:
 *   <rsvp-pill status="confirmed" count="3"></rsvp-pill>
 */

const STATUSES = new Set(["confirmed", "pending", "declined", "no-response"]);

const STYLE = `
  :host {
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    padding: 0.2em 0.7em;
    border-radius: 999px;
    font-size: 0.85em;
    font-weight: 600;
    line-height: 1.4;
    border: 1px solid currentcolor;
    background: color-mix(in oklch, currentcolor 12%, transparent);
    white-space: nowrap;
    user-select: none;
  }
  :host([status="confirmed"])    { color: var(--positive, #34d399); }
  :host([status="pending"])      { color: var(--warning, #f59e0b); }
  :host([status="declined"])     { color: var(--negative, #f87171); }
  :host([status="no-response"])  { color: var(--text-secondary, #cbd5e1); }
  .count {
    font-variant-numeric: tabular-nums;
    opacity: 0.85;
  }
  .dot {
    display: inline-block;
    width: 0.5em;
    height: 0.5em;
    border-radius: 50%;
    background: currentcolor;
  }
`;

class RsvpPill extends HTMLElement {
  static get observedAttributes() {
    return ["status", "count"];
  }

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLE;
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.setAttribute("aria-hidden", "true");
    const count = document.createElement("span");
    count.className = "count";
    count.setAttribute("part", "count");
    const label = document.createElement("span");
    label.className = "label";
    label.setAttribute("part", "label");
    const slot = document.createElement("slot");
    root.append(style, dot, count, label, slot);
    this._count = count;
    this._label = label;
  }

  connectedCallback() {
    if (!this.hasAttribute("status")) this.setAttribute("status", "no-response");
    this.setAttribute("role", "status");
    this._render();
  }

  /** @param {string} _name */
  attributeChangedCallback(_name) {
    const status = this.getAttribute("status") ?? "no-response";
    if (!STATUSES.has(status)) {
      this.setAttribute("status", "no-response");
      return;
    }
    this._render();
  }

  _render() {
    const status = this.getAttribute("status") ?? "no-response";
    const count = this.getAttribute("count");
    this._count.textContent = count && Number.isFinite(Number(count)) ? String(count) : "";
    this._label.textContent = status;
  }
}

if (typeof customElements !== "undefined" && !customElements.get("rsvp-pill")) {
  customElements.define("rsvp-pill", RsvpPill);
}

export { RsvpPill };
