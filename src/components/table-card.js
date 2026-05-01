/**
 * @owner ui
 * `<table-card>` — table summary card primitive (S589).
 *
 * Attributes:
 *   - `name`: table label (string).
 *   - `seats`: total seats (number).
 *   - `assigned`: assigned seats (number, default 0).
 *   - `status`: "ok" | "full" | "over" (auto-derived if omitted).
 *
 * Example:
 *   <table-card name="שולחן 7" seats="10" assigned="9"></table-card>
 */

const STYLE = `
  :host {
    display: inline-block;
    min-width: 9rem;
    padding: 0.7rem 0.9rem;
    border-radius: 12px;
    border: 1px solid var(--border-color, rgba(255,255,255,0.12));
    background: var(--bg-card, rgba(255,255,255,0.04));
    color: var(--text-primary, #f0e6d6);
    font-size: 0.92em;
    line-height: 1.45;
  }
  :host([status="full"]) { border-color: var(--warning, #f59e0b); }
  :host([status="over"]) { border-color: var(--negative, #f87171); }
  .name {
    font-weight: 700;
    margin-bottom: 0.2rem;
  }
  .seats {
    font-variant-numeric: tabular-nums;
    opacity: 0.85;
  }
  .bar {
    margin-top: 0.4rem;
    height: 4px;
    border-radius: 2px;
    background: color-mix(in oklch, currentcolor 12%, transparent);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--accent, #60a5fa);
    transition: width 200ms ease;
  }
  :host([status="full"]) .fill { background: var(--warning, #f59e0b); }
  :host([status="over"]) .fill { background: var(--negative, #f87171); }
  @media (prefers-reduced-motion: reduce) {
    .fill { transition: none; }
  }
`;

/**
 * @param {number} assigned
 * @param {number} seats
 * @returns {"ok"|"full"|"over"}
 */
export function deriveTableStatus(assigned, seats) {
  if (!Number.isFinite(seats) || seats <= 0) return "ok";
  if (assigned > seats) return "over";
  if (assigned === seats) return "full";
  return "ok";
}

class TableCard extends HTMLElement {
  static get observedAttributes() {
    return ["name", "seats", "assigned", "status"];
  }

  constructor() {
    super();
    /** @type {boolean} — whether the consumer set status explicitly */
    this._userStatus = false;
    /** @type {boolean} — true while we mutate the status attr ourselves */
    this._writingStatus = false;
    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLE;
    const name = document.createElement("div");
    name.className = "name";
    name.setAttribute("part", "name");
    const seats = document.createElement("div");
    seats.className = "seats";
    seats.setAttribute("part", "seats");
    const bar = document.createElement("div");
    bar.className = "bar";
    const fill = document.createElement("div");
    fill.className = "fill";
    bar.appendChild(fill);
    root.append(style, name, seats, bar);
    this._name = name;
    this._seats = seats;
    this._fill = fill;
  }

  connectedCallback() {
    this.setAttribute("role", "group");
    this._render();
  }

  /** @param {string} attr */
  attributeChangedCallback(attr) {
    if (attr === "status" && !this._writingStatus) {
      this._userStatus = true;
    }
    this._render();
  }

  _render() {
    const name = this.getAttribute("name") ?? "";
    const seats = Number(this.getAttribute("seats") ?? 0);
    const assigned = Number(this.getAttribute("assigned") ?? 0);
    const explicit = this.getAttribute("status");
    const useExplicit =
      this._userStatus && (explicit === "ok" || explicit === "full" || explicit === "over");
    const status = useExplicit
      ? /** @type {"ok"|"full"|"over"} */ (explicit)
      : deriveTableStatus(assigned, seats);
    if (this.getAttribute("status") !== status) {
      this._writingStatus = true;
      this.setAttribute("status", status);
      this._writingStatus = false;
    }
    this._name.textContent = name;
    this._seats.textContent = `${assigned} / ${seats}`;
    const pct = seats > 0 ? Math.min(100, Math.round((assigned / seats) * 100)) : 0;
    this._fill.style.width = `${pct}%`;
  }
}

if (typeof customElements !== "undefined" && !customElements.get("table-card")) {
  customElements.define("table-card", TableCard);
}

export { TableCard };
