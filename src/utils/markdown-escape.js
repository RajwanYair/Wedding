/**
 * Escape characters that would otherwise be interpreted by CommonMark.
 * Used when injecting untrusted data into Markdown templates (e.g.
 * release notes, vendor notes that may flow into a Markdown export).
 */

const MD_SPECIAL = /[\\`*_{}[\]()#+\-.!|>~]/g;

/**
 * Escape Markdown punctuation in a string.
 *
 * @param {string} text
 * @returns {string}
 */
export function escapeMarkdown(text) {
  if (typeof text !== "string") return "";
  return text.replace(MD_SPECIAL, (ch) => `\\${ch}`);
}

/**
 * Escape inline-code content — wraps in backticks and lengthens fence
 * if the input contains backticks.
 *
 * @param {string} text
 * @returns {string}
 */
export function escapeInlineCode(text) {
  if (typeof text !== "string") return "``";
  let max = 0;
  let run = 0;
  for (const ch of text) {
    if (ch === "`") {
      run += 1;
      if (run > max) max = run;
    } else {
      run = 0;
    }
  }
  const fence = "`".repeat(max + 1);
  const padded = /^`|`$/.test(text) ? ` ${text} ` : text;
  return `${fence}${padded}${fence}`;
}

/**
 * Escape pipe characters and newlines so a value is safe to drop into a
 * Markdown table cell.
 *
 * @param {string} text
 * @returns {string}
 */
export function escapeTableCell(text) {
  if (typeof text !== "string") return "";
  return text.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}
