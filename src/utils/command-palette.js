/**
 * S447: Smart guest command palette.
 * Opens a `<dialog>` overlay on Ctrl+K / Cmd+K.
 * Commands dispatch data-action events or navigate directly.
 * @owner main.js
 */

import { t } from "../core/i18n.js";
import { navigateTo } from "../core/nav.js";

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
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "k") {
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
