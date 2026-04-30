/**
 * src/utils/ai-panel.js — S450: AI assistant chat panel overlay
 *
 * Opens a persistent `<dialog>` chat panel via Ctrl+Shift+A.
 * Uses the BYO-key AI client from ai-client.js.
 *
 * Exports:
 *   initAiPanel()        — register Ctrl+Shift+A keyboard shortcut
 *   openAiPanel(prompt?) — open (or focus) the panel
 *   closeAiPanel()       — close the panel
 */

import { t } from "../core/i18n.js";

/** @type {HTMLDialogElement | null} */
let _dialog = null;

/** @type {HTMLDivElement | null} */
let _messagesEl = null;

/** @type {HTMLTextAreaElement | null} */
let _inputEl = null;

/** @type {boolean} */
let _thinking = false;

/** @typedef {{ role: "user" | "ai" | "error", text: string }} ChatMessage */

/** @type {ChatMessage[]} */
const _history = [];

// ── DOM helpers ────────────────────────────────────────────────────────────

/**
 * Append a chat bubble to the messages container.
 * @param {ChatMessage} msg
 */
function _appendBubble(msg) {
  if (!_messagesEl) return;
  const row = document.createElement("div");
  row.className = `ai-msg ai-msg--${msg.role}`;
  row.style.cssText = [
    "display:flex",
    "gap:0.5rem",
    `justify-content:${msg.role === "user" ? "flex-end" : "flex-start"}`,
    "margin-bottom:0.5rem",
  ].join(";");

  const bubble = document.createElement("div");
  bubble.className = "ai-bubble";
  bubble.style.cssText = [
    "max-width:80%",
    "padding:0.5rem 0.75rem",
    "border-radius:0.75rem",
    msg.role === "user"
      ? "background:var(--color-primary,#7c3aed);color:#fff"
      : msg.role === "error"
        ? "background:rgba(220,38,38,0.2);color:var(--color-danger,#ef4444)"
        : "background:rgba(255,255,255,0.1);color:var(--color-text,#fff)",
    "white-space:pre-wrap",
    "word-break:break-word",
    "font-size:0.875rem",
    "line-height:1.5",
  ].join(";");

  const label = document.createElement("span");
  label.className = "u-visually-hidden";
  label.textContent = msg.role === "user" ? t("ai_panel_you") : t("ai_panel_ai");
  bubble.appendChild(label);

  const text = document.createTextNode(msg.text);
  bubble.appendChild(text);

  row.appendChild(bubble);
  _messagesEl.appendChild(row);
  _messagesEl.scrollTop = _messagesEl.scrollHeight;
}

// ── Core ────────────────────────────────────────────────────────────────────

/**
 * Build and show the AI panel dialog.
 * @param {string} [initialPrompt]
 */
function _buildDialog(initialPrompt) {
  _dialog = /** @type {HTMLDialogElement} */ (document.createElement("dialog"));
  _dialog.id = "aiPanelDialog";
  _dialog.setAttribute("aria-label", t("ai_panel_title"));
  _dialog.style.cssText = [
    "padding:0",
    "border:none",
    "border-radius:1rem",
    "width:min(420px,92vw)",
    "height:min(520px,80vh)",
    "background:var(--color-surface,#1a1a2e)",
    "color:var(--color-text,#fff)",
    "box-shadow:0 8px 40px rgba(0,0,0,0.6)",
    "display:flex",
    "flex-direction:column",
    "overflow:hidden",
    "top:5vh",
    "margin:0 auto",
  ].join(";");

  // Header
  const header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1rem;border-bottom:1px solid rgba(255,255,255,0.1);flex-shrink:0";

  const title = document.createElement("span");
  title.style.cssText = "font-weight:600;font-size:0.95rem";
  title.textContent = `🤖 ${t("ai_panel_title")}`;

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", t("close"));
  closeBtn.style.cssText = "background:none;border:none;color:inherit;cursor:pointer;font-size:1.2rem;padding:0.25rem;line-height:1";
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", closeAiPanel);

  header.appendChild(title);
  header.appendChild(closeBtn);

  // Messages area
  _messagesEl = document.createElement("div");
  _messagesEl.id = "aiMessages";
  _messagesEl.setAttribute("aria-live", "polite");
  _messagesEl.setAttribute("aria-label", t("ai_panel_title"));
  _messagesEl.style.cssText = "flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column";

  // Re-render history
  for (const msg of _history) _appendBubble(msg);

  // Input row
  const inputRow = document.createElement("div");
  inputRow.style.cssText = "display:flex;gap:0.5rem;padding:0.75rem;border-top:1px solid rgba(255,255,255,0.1);flex-shrink:0;align-items:flex-end";

  _inputEl = document.createElement("textarea");
  _inputEl.id = "aiInput";
  _inputEl.rows = 2;
  _inputEl.placeholder = t("ai_panel_placeholder");
  _inputEl.setAttribute("aria-label", t("ai_panel_placeholder"));
  _inputEl.style.cssText = "flex:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:0.5rem;color:inherit;padding:0.5rem;font-size:0.875rem;resize:none;outline:none;font-family:inherit;line-height:1.4;max-height:100px;overflow-y:auto";

  const sendBtn = document.createElement("button");
  sendBtn.type = "button";
  sendBtn.style.cssText = "background:var(--color-primary,#7c3aed);color:#fff;border:none;border-radius:0.5rem;padding:0.5rem 0.75rem;cursor:pointer;font-size:0.9rem;white-space:nowrap;align-self:flex-end";
  sendBtn.textContent = t("ai_panel_send");

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.setAttribute("title", t("ai_panel_clear"));
  clearBtn.style.cssText = "background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:0.5rem;color:inherit;padding:0.5rem;cursor:pointer;font-size:0.85rem;align-self:flex-end";
  clearBtn.textContent = "🗑";

  const handleSend = () => _sendMessage();
  sendBtn.addEventListener("click", handleSend);
  clearBtn.addEventListener("click", () => {
    _history.length = 0;
    if (_messagesEl) _messagesEl.textContent = "";
  });

  _inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  inputRow.appendChild(_inputEl);
  inputRow.appendChild(clearBtn);
  inputRow.appendChild(sendBtn);

  _dialog.appendChild(header);
  _dialog.appendChild(_messagesEl);
  _dialog.appendChild(inputRow);
  document.body.appendChild(_dialog);

  _dialog.addEventListener("click", (e) => {
    if (e.target === _dialog) closeAiPanel();
  });
  _dialog.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAiPanel();
  });

  _dialog.showModal();

  if (initialPrompt && _inputEl) {
    _inputEl.value = initialPrompt;
  }
  _inputEl?.focus();
}

/**
 * Send the current input message to the AI.
 */
async function _sendMessage() {
  if (_thinking || !_inputEl) return;
  const text = _inputEl.value.trim();
  if (!text) return;
  _inputEl.value = "";

  const userMsg = /** @type {ChatMessage} */ ({ role: "user", text });
  _history.push(userMsg);
  _appendBubble(userMsg);

  _thinking = true;
  const thinkingMsg = /** @type {ChatMessage} */ ({ role: "ai", text: t("ai_panel_thinking") });
  _history.push(thinkingMsg);
  _appendBubble(thinkingMsg);

  try {
    const { askAi } = await import("./ai-client.js");
    const response = await askAi(text);
    // Replace thinking placeholder
    _history[_history.length - 1] = { role: "ai", text: response };
    // Remove thinking bubble and add real response
    if (_messagesEl) {
      const last = _messagesEl.lastElementChild;
      if (last) last.remove();
    }
    _appendBubble({ role: "ai", text: response });
  } catch (err) {
    _history[_history.length - 1] = { role: "error", text: err instanceof Error ? err.message : String(err) };
    if (_messagesEl) {
      const last = _messagesEl.lastElementChild;
      if (last) last.remove();
    }
    _appendBubble({ role: "error", text: _history[_history.length - 1].text });
  } finally {
    _thinking = false;
    _inputEl?.focus();
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Open (or focus) the AI panel.
 * @param {string} [initialPrompt]
 */
export function openAiPanel(initialPrompt) {
  if (_dialog) {
    _dialog.showModal();
    if (initialPrompt && _inputEl) _inputEl.value = initialPrompt;
    _inputEl?.focus();
    return;
  }
  _buildDialog(initialPrompt);
}

/**
 * Close the AI panel dialog.
 */
export function closeAiPanel() {
  if (_dialog) {
    _dialog.close();
    _dialog.remove();
    _dialog = null;
    _messagesEl = null;
    _inputEl = null;
  }
}

/**
 * Register Ctrl+Shift+A keyboard shortcut to open the AI panel.
 * @returns {() => void} cleanup function
 */
export function initAiPanel() {
  /**
   * @param {KeyboardEvent} e
   */
  function _onKey(e) {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "A") {
      e.preventDefault();
      openAiPanel();
    }
  }
  document.addEventListener("keydown", _onKey);
  return () => document.removeEventListener("keydown", _onKey);
}
