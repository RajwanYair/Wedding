/**
 * src/handlers/search-handler.js — S214 Cmd-K command palette handler.
 *
 * Wires the search modal input to buildSearchIndex + searchIndex.
 * Called once on first modal open via initSearchModalHandlers().
 * Exported for deferred setup from main.js.
 */

import { buildSearchIndex, searchIndex } from "../services/analytics.js";
import { closeModal } from "../core/ui.js";
import { navigateTo } from "../core/nav.js";
import { t } from "../core/i18n.js";

/** @typedef {import("../services/analytics.js").SearchEntry} SearchEntry */

/** Cached index — rebuilt each time the modal opens. */
let _index = /** @type {SearchEntry[]} */ ([]);

/**
 * Type-icon map for result entries.
 * @type {Record<string, string>}
 */
const TYPE_ICONS = {
  section: "📑",
  guest: "👤",
  table: "🪑",
  vendor: "🏪",
  command: "⚡",
};

/**
 * Render results into the #cmdPaletteResults list.
 * @param {SearchEntry[]} results
 * @param {HTMLElement} list
 */
function _renderResults(results, list) {
  list.textContent = "";
  if (!results.length) {
    const li = document.createElement("li");
    li.className = "cmd-palette-empty";
    li.textContent = t("cmd_palette_no_results");
    list.appendChild(li);
    return;
  }
  for (const entry of results) {
    const li = document.createElement("li");
    li.className = "cmd-palette-item";
    li.setAttribute("role", "option");
    li.dataset.entryId = entry.id;
    li.dataset.entryType = entry.type;
    li.tabIndex = -1;

    const icon = document.createElement("span");
    icon.className = "cmd-palette-icon";
    icon.textContent = TYPE_ICONS[entry.type] ?? "🔍";
    icon.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.className = "cmd-palette-label";
    label.textContent = entry.label;

    if (entry.hint) {
      const hint = document.createElement("span");
      hint.className = "cmd-palette-hint";
      hint.textContent = entry.hint;
      li.append(icon, label, hint);
    } else {
      li.append(icon, label);
    }

    li.addEventListener("click", () => _activateEntry(entry));
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        _activateEntry(entry);
      }
    });

    list.appendChild(li);
  }
}

/**
 * Activate a selected entry — navigate to section or show a detail view.
 * @param {SearchEntry} entry
 */
function _activateEntry(entry) {
  closeModal("searchModal");
  if (entry.type === "section") {
    const sectionId = entry.id.replace(/^section:/, "");
    navigateTo(sectionId);
  }
  // guests, tables, vendors — navigate to their section
  if (entry.type === "guest") {
    navigateTo("guests");
  } else if (entry.type === "table") {
    navigateTo("tables");
  } else if (entry.type === "vendor") {
    navigateTo("vendors");
  } else if (entry.type === "command") {
    _runCommand(entry.action ?? "");
  }
}

/**
 * Dispatch a static command.  S567: keep this dispatcher tiny — each
 * branch should either navigate or trigger an existing global side effect.
 * @param {string} action
 */
function _runCommand(action) {
  switch (action) {
    case "sync": {
      void import("../services/sheets.js").then((m) => m.syncSheetsNow?.()).catch(() => {});
      break;
    }
    case "add-guest": {
      navigateTo("guests");
      void import("../core/ui.js").then((m) => m.openModal?.("guestModal")).catch(() => {});
      break;
    }
    case "open-settings": {
      navigateTo("settings");
      break;
    }
    case "export-csv": {
      void import("../sections/guests.js")
        .then((m) => m.exportGuestsCSV?.())
        .catch(() => {});
      break;
    }
    case "toggle-theme": {
      void import("../core/ui.js")
        .then((m) => m.cycleTheme?.())
        .catch(() => {});
      break;
    }
    default:
      /* unknown command — silently ignore */
  }
}

/**
 * Initialise the search modal once its DOM is injected.
 * Attaches input + keyboard listeners.
 */
export function initSearchModalHandlers() {
  const input = /** @type {HTMLInputElement | null} */ (
    document.getElementById("cmdPaletteInput")
  );
  const list = document.getElementById("cmdPaletteResults");
  if (!input || !list) return;

  // Build a fresh index each time the modal opens.
  _index = buildSearchIndex();

  // Show hint on empty
  _renderResults([], list);

  input.addEventListener("input", () => {
    const results = searchIndex(_index, input.value);
    _renderResults(results, list);
  });

  // Keyboard navigation: arrow-down from input focuses first item.
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const first = /** @type {HTMLElement | null} */ (
        list.querySelector(".cmd-palette-item")
      );
      first?.focus();
    }
    if (e.key === "Escape") {
      closeModal("searchModal");
    }
  });

  // Arrow key navigation inside results list.
  list.addEventListener("keydown", (e) => {
    const items = /** @type {NodeListOf<HTMLElement>} */ (
      list.querySelectorAll(".cmd-palette-item")
    );
    const idx = [...items].indexOf(/** @type {HTMLElement} */ (e.target));
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[Math.min(idx + 1, items.length - 1)]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (idx === 0) {
        input.focus();
      } else {
        items[Math.max(idx - 1, 0)]?.focus();
      }
    } else if (e.key === "Escape") {
      closeModal("searchModal");
    }
  });

  // Auto-focus input
  input.focus();
}
