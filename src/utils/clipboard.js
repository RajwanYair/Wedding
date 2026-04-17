/**
 * src/utils/clipboard.js — Clipboard API wrapper (Sprint 206)
 *
 * Provides a consistent, testable API for reading from and writing to the
 * system clipboard. Falls back gracefully in non-secure contexts.
 *
 * Zero dependencies.
 */

/**
 * Write `text` to the clipboard.
 * Uses the async Clipboard API if available; falls back to execCommand.
 *
 * @param {string} text
 * @returns {Promise<boolean>}  true if successful.
 */
export async function copyToClipboard(text) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to execCommand
    }
  }
  return _execCommandCopy(text);
}

/**
 * Read text from the clipboard (requires Permissions API grant).
 * @returns {Promise<string>}
 */
export async function readFromClipboard() {
  if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
    return navigator.clipboard.readText();
  }
  return "";
}

/**
 * Check whether the clipboard API is available in this context.
 * @returns {boolean}
 */
export function isClipboardAvailable() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard !== "undefined" &&
    typeof navigator.clipboard.writeText === "function"
  );
}

/**
 * Legacy execCommand fallback.
 * @param {string} text
 * @returns {boolean}
 */
function _execCommandCopy(text) {
  if (typeof document === "undefined") return false;
  const el = document.createElement("textarea");
  el.value = text;
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(el);
  return ok;
}

/**
 * Copy text and return a formatted result object.
 * @param {string} text
 * @param {string} [label]  Optional label for the confirmation message.
 * @returns {Promise<{ success: boolean, text: string, label?: string }>}
 */
export async function copyWithFeedback(text, label) {
  const success = await copyToClipboard(text);
  return { success, text, label };
}
