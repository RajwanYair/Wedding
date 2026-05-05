/**
 * S447 + S687: Smart guest command palette.
 * Opens a `<dialog>` overlay on Ctrl+K / Cmd+K.
 * Commands dispatch data-action events or navigate directly.
 * S687: AI inline commands (suggest seating, suggest budget, draft message).
 * @owner main.js
 */

import { t } from "../core/i18n.js";
import { navigateTo } from "../core/nav.js";
import { storeGet } from "../core/store.js";

/** @type {HTMLDialogElement | null} */
let _dialog = null;
/** @type {(() => void) | null} */
let _cleanup = null;

/** @typedef {{ id: string, label: () => string, run: () => void }} PaletteCommand */

/** @returns {PaletteCommand[]} */
function _buildCommands() {
  const sections = ["dashboard", "guests", "tables", "rsvp", "vendors", "expenses", "checkin", "settings"];
  const sectionCmds = sections.map((s) => ({
    id: `goto_${s}`,
    label: () => `${t("cmd_go_to")}: ${t(`nav_${s}`) || s}`,
    run: () => navigateTo(s),
  }));

  /** @type {PaletteCommand[]} */
  const staticCmds = [
    {
      id: "add_guest",
      label: () => t("cmd_add_guest"),
      run: () => {
        closeCommandPalette();
        document.body.dispatchEvent(new CustomEvent("action", { detail: "openAddGuestModal", bubbles: true }));
      },
    },
    {
      id: "find_by_phone",
      label: () => t("cmd_find_phone"),
      run: () => {
        closeCommandPalette();
        navigateTo("rsvp");
      },
    },
    {
      id: "export_csv",
      label: () => t("cmd_export_csv"),
      run: () => {
        closeCommandPalette();
        document.body.dispatchEvent(new CustomEvent("action", { detail: "exportJSON", bubbles: true }));
      },
    },
    // S687: AI inline commands
    {
      id: "ai_suggest_seating",
      label: () => `🤖 ${t("cmd_ai_suggest_seating")}`,
      run: () => {
        closeCommandPalette();
        _runAiSuggestSeating();
      },
    },
    {
      id: "ai_suggest_budget",
      label: () => `🤖 ${t("cmd_ai_suggest_budget")}`,
      run: () => {
        closeCommandPalette();
        _runAiSuggestBudget();
      },
    },
    {
      id: "ai_draft_message",
      label: () => `🤖 ${t("cmd_ai_draft_message")}`,
      run: () => {
        closeCommandPalette();
        _runAiDraftMessage();
      },
    },
  ];

  return [...staticCmds, ...sectionCmds];
}

/**
 * Open the command palette.
 */
export function openCommandPalette() {
  if (_dialog) { _dialog.showModal(); _focusInput(); return; }

  _dialog = /** @type {HTMLDialogElement} */ (document.createElement("dialog"));
  _dialog.id = "cmdPaletteDialog";
  _dialog.style.cssText = [
    "padding:0",
    "border:none",
    "border-radius:0.75rem",
    "width:min(480px,90vw)",
    "background:var(--color-surface,#1a1a2e)",
    "color:var(--color-text,#fff)",
    "box-shadow:0 8px 32px rgba(0,0,0,0.5)",
    "top:10vh",
    "margin:0 auto",
  ].join(";");

  const input = document.createElement("input");
  input.type = "search";
  input.id = "cmdPaletteInput";
  input.placeholder = t("cmd_palette_placeholder");
  input.setAttribute("aria-label", t("cmd_palette_title"));
  input.style.cssText = "width:100%;padding:0.75rem 1rem;font-size:1rem;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,0.15);outline:none;color:inherit;box-sizing:border-box";

  const list = document.createElement("ul");
  list.id = "cmdPaletteList";
  list.setAttribute("role", "listbox");
  list.style.cssText = "list-style:none;margin:0;padding:0.5rem 0;max-height:320px;overflow-y:auto";

  _dialog.appendChild(input);
  _dialog.appendChild(list);
  document.body.appendChild(_dialog);

  const allCommands = _buildCommands();
  _renderList(list, allCommands);

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase();
    const filtered = q ? allCommands.filter((c) => c.label().toLowerCase().includes(q)) : allCommands;
    _renderList(list, filtered, () => { closeCommandPalette(); });
  });

  _dialog.addEventListener("click", (e) => {
    if (e.target === _dialog) closeCommandPalette();
  });

  _dialog.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCommandPalette();
  });

  _dialog.showModal();
  _focusInput();
}

/**
 * Close and remove the command palette dialog.
 */
export function closeCommandPalette() {
  if (_dialog) {
    _dialog.close();
    _dialog.remove();
    _dialog = null;
  }
}

/**
 * Register Ctrl+K / Cmd+K keyboard shortcut to open the palette.
 * Returns a cleanup function.
 * @returns {() => void}
 */
export function initCommandPalette() {
  if (_cleanup) return _cleanup;

  /** @param {KeyboardEvent} e */
  const handler = (e) => {
    // S686: Ctrl+K (primary) or Ctrl+Shift+K (legacy) opens the command palette.
    // Skip when focus is inside an input to avoid hijacking text editing.
    const tag = /** @type {HTMLElement} */ (e.target).tagName;
    const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
      || /** @type {HTMLElement} */ (e.target).isContentEditable;
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      if (inInput && !e.shiftKey) return; // allow native browser address-bar behaviour in inputs
      e.preventDefault();
      openCommandPalette();
    }
  };
  document.addEventListener("keydown", handler);
  _cleanup = () => {
    document.removeEventListener("keydown", handler);
    _cleanup = null;
  };
  return _cleanup;
}

// ── Private helpers ───────────────────────────────────────────────────────

function _focusInput() {
  const input = /** @type {HTMLInputElement|null} */ (document.getElementById("cmdPaletteInput"));
  input?.focus();
}

/**
 * @param {HTMLUListElement} list
 * @param {PaletteCommand[]} commands
 * @param {(() => void) | undefined} [onRun]
 */
function _renderList(list, commands, onRun) {
  list.textContent = "";
  if (commands.length === 0) {
    const li = document.createElement("li");
    li.textContent = t("cmd_no_results");
    li.style.cssText = "padding:0.5rem 1rem;opacity:0.5;font-size:0.9rem";
    list.appendChild(li);
    return;
  }
  for (const cmd of commands) {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.style.cssText = "padding:0.5rem 1rem;cursor:pointer;font-size:0.9rem;border-radius:0.25rem;transition:background 0.1s";
    li.textContent = cmd.label();
    li.addEventListener("mouseover", () => { li.style.background = "rgba(255,255,255,0.1)"; });
    li.addEventListener("mouseout", () => { li.style.background = ""; });
    li.addEventListener("click", () => {
      closeCommandPalette();
      if (onRun) onRun();
      cmd.run();
    });
    list.appendChild(li);
  }
}

// ── S687: AI inline command runners ───────────────────────────────────────

/**
 * Show a non-blocking toast-style AI result overlay near top of screen.
 * @param {string} title
 * @param {string} body
 */
function _showAiResult(title, body) {
  const existing = document.getElementById("aiInlineResult");
  if (existing) existing.remove();
  const el = document.createElement("div");
  el.id = "aiInlineResult";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.style.cssText = [
    "position:fixed",
    "top:5rem",
    "inset-inline-end:1rem",
    "max-width:min(400px,90vw)",
    "background:var(--color-surface,#1a1a2e)",
    "color:var(--color-text,#fff)",
    "border:1px solid rgba(255,255,255,0.15)",
    "border-radius:0.75rem",
    "padding:1rem",
    "z-index:9999",
    "box-shadow:0 4px 20px rgba(0,0,0,0.4)",
    "font-size:0.875rem",
    "line-height:1.5",
  ].join(";");

  const h = document.createElement("strong");
  h.style.cssText = "display:block;margin-bottom:0.5rem;font-size:0.95rem";
  h.textContent = title;

  const p = document.createElement("p");
  p.style.cssText = "margin:0 0 0.75rem";
  p.textContent = body;

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = t("close");
  close.style.cssText = "background:none;border:1px solid rgba(255,255,255,0.2);color:inherit;border-radius:0.375rem;padding:0.25rem 0.75rem;cursor:pointer;font-size:0.8rem";
  close.addEventListener("click", () => el.remove());

  el.appendChild(h);
  el.appendChild(p);
  el.appendChild(close);
  document.body.appendChild(el);

  // Auto-dismiss after 15 s
  setTimeout(() => el.remove(), 15_000);
}

/**
 * Run AI seating suggestions using current guest + table data (S687).
 */
async function _runAiSuggestSeating() {
  try {
    const { suggestSeating, sortSuggestions } = await import("../utils/ai-suggest.js");
    const guests = /** @type {Array<{id:string,name:string,group?:string,plusOne?:boolean}>} */ (storeGet("guests") ?? []);
    const tables = /** @type {Array<{capacity:number}>} */ (storeGet("tables") ?? []);
    const avgCapacity = tables.length ? Math.round(tables.reduce((s, tb) => s + (tb.capacity || 8), 0) / tables.length) : 8;
    const suggestions = sortSuggestions(suggestSeating(guests, avgCapacity));
    if (!suggestions.length) {
      _showAiResult(`🤖 ${t("cmd_ai_suggest_seating")}`, t("ai_no_suggestions"));
      return;
    }
    const lines = suggestions.slice(0, 5).map((s) => `• [${s.priority}] ${s.title}: ${s.description}`).join("\n");
    _showAiResult(`🤖 ${t("cmd_ai_suggest_seating")}`, lines);
  } catch {
    _showAiResult(`🤖 ${t("cmd_ai_suggest_seating")}`, t("ai_error"));
  }
}

/**
 * Run AI budget suggestions using current expense + vendor data (S687).
 */
async function _runAiSuggestBudget() {
  try {
    const { suggestBudget, sortSuggestions } = await import("../utils/ai-suggest.js");
    const info = /** @type {{budget?:number}} */ (storeGet("weddingInfo") ?? {});
    const expenses = /** @type {Array<{amount:number}>} */ (storeGet("expenses") ?? []);
    const vendors = /** @type {Array<{price:number,paid:number}>} */ (storeGet("vendors") ?? []);
    const guests = /** @type {unknown[]} */ (storeGet("guests") ?? []);
    const totalBudget = Number(info.budget) || 0;
    const spent = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const committed = vendors.reduce((s, v) => s + Number(v.price || 0) - Number(v.paid || 0), 0);
    const suggestions = sortSuggestions(suggestBudget({ totalBudget, spent, committed, guestCount: guests.length }));
    if (!suggestions.length) {
      _showAiResult(`🤖 ${t("cmd_ai_suggest_budget")}`, t("ai_no_suggestions"));
      return;
    }
    const lines = suggestions.slice(0, 5).map((s) => `• [${s.priority}] ${s.title}: ${s.description}`).join("\n");
    _showAiResult(`🤖 ${t("cmd_ai_suggest_budget")}`, lines);
  } catch {
    _showAiResult(`🤖 ${t("cmd_ai_suggest_budget")}`, t("ai_error"));
  }
}

/**
 * Open the AI panel to draft a WhatsApp/email message (S687).
 */
async function _runAiDraftMessage() {
  try {
    const { openAiPanel } = await import("./ai-panel.js");
    openAiPanel(t("cmd_ai_draft_message_prompt"));
  } catch {
    _showAiResult(`🤖 ${t("cmd_ai_draft_message")}`, t("ai_error"));
  }
}

