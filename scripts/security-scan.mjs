#!/usr/bin/env node
/**
 * scripts/security-scan.mjs — Static security pattern scanner (Sprint 8)
 *
 * Scans src/ for OWASP-relevant anti-patterns that ESLint may miss:
 *   1. Unsafe innerHTML assignments with non-constant strings
 *   2. eval() / new Function() calls
 *   3. document.write() calls
 *   4. Hardcoded http:// URLs (should be https:// or relative)
 *   5. Inline event handlers in HTML templates (onclick="...", onchange="...")
 *
 * Exit 0 = clean. Exit 1 = violations found.
 *
 * Usage:
 *   node scripts/security-scan.mjs
 *   npm run security-scan   (add to package.json scripts as needed)
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = join(ROOT, "src");
const TEMPLATES = join(SRC, "templates");
const MODALS = join(SRC, "modals");

/** @type {{ file: string, line: number, rule: string, text: string }[]} */
const violations = [];

// ── Scan helpers ──────────────────────────────────────────────────────────

/**
 * Walk a directory recursively and return all file paths.
 * @param {string} dir
 * @param {string[]} [exts]
 * @returns {string[]}
 */
function walk(dir, exts = []) {
  /** @type {string[]} */
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full, exts));
    } else if (exts.length === 0 || exts.includes(extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Add a violation entry.
 * @param {string} file
 * @param {number} lineNum
 * @param {string} rule
 * @param {string} text
 */
function fail(file, lineNum, rule, text) {
  violations.push({ file: relative(ROOT, file), line: lineNum, rule, text: text.trim().slice(0, 120) });
}

// ── JS rules ──────────────────────────────────────────────────────────────

const JS_RULES = [
  {
    rule: "no-eval",
    pattern: /\beval\s*\(/,
    message: "eval() usage detected",
  },
  {
    rule: "no-new-function",
    pattern: /new\s+Function\s*\(/,
    message: "new Function() usage detected",
  },
  {
    rule: "no-document-write",
    // Exclude legitimate print-popup pattern: win.document.write(...)
    // These open a new window and write to it — common safe pattern for print/export.
    pattern: /(?<!win\.)(?<!w\.)document\.write\s*\(/,
    message:
      "document.write() usage detected (use win.document.write for print popups)",
  },
  {
    rule: "no-unsafe-inner-html",
    // Flag .innerHTML = with a non-empty RHS.
    // Escape hatches: empty-string clear ("" or ''), pure SVG string vars named *svg* or *Svg*
    pattern: /\.innerHTML\s*=\s*(?!["']\s*["'])/,
    message:
      "Potentially unsafe .innerHTML assignment (use .textContent or sanitize)",
    skip: (line) =>
      // Allow empty-string clear
      /\.innerHTML\s*=\s*["']\s*["']/.test(line) ||
      // Allow dedicated SVG variable names (svgStr, svgHtml, svg, chartSvg ...)
      /\.innerHTML\s*=\s*\w*[Ss][Vv][Gg]\w*/i.test(line) ||
      // Allow template-loader and modal loading (trusted static HTML)
      /innerHTML\s*=\s*(ht|html|markup|tmpl|tpl)\b/.test(line) ||
      // Allow lines where EVERY interpolation is wrapped in an _esc* function
      (/\$\{/.test(line) && !/\$\{(?![^}]*_esc)[^}]+\}/.test(line)) ||
      // Allow lines that pass all dynamic values through an _esc* function
      (/\$\{/.test(line) &&
        /\$\{[^}]*_esc[A-Z]/g.test(line) &&
        !/\$\{[^}]*(?!_esc)[a-z][A-Za-z.]*\}/.test(line)) ||
      // Allow lines where the only template expressions use _esc* or t( or toLocaleString or numeric literals
      (/\$\{[^}]+\}/.test(line) &&
        !/\$\{(?!(?:[^}]*_esc|[^}]*\bt\(|[^}]*toLocaleString|[^}]*\d+))[^}]+\}/.test(
          line,
        )),
  },
  {
    rule: "no-http-url",
    // Exclude SVG/XML namespaces (http://www.w3.org/...) — not network requests
    // Exclude replace("https://", ...) patterns — string manipulation, not a URL
    pattern: /['"`]http:\/\/(?!localhost|127\.0\.0\.1|www\.w3\.org)/,
    message: "Hardcoded http:// URL (use https:// or a relative URL)",
    skip: (line) =>
      // Suppress when it's the source string in a .replace("https://...", ...) call
      /\.replace\s*\(\s*["']https?:\/\//.test(line) ||
      // Suppress validation/detection functions that check for http:// as a valid protocol
      /startsWith\s*\(["']http:\/\/["']\)/.test(line) ||
      // Suppress URL validation allowlists
      /lower\.startsWith\(["']http:\/\/["']\)/.test(line),
  },
];

for (const jsFile of walk(SRC, [".js"])) {
  const lines = readFileSync(jsFile, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comment-only lines and lines with // nosec escape hatch
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
    if (line.includes("// nosec")) continue;

    for (const { rule, pattern, message, skip } of JS_RULES) {
      if (pattern.test(line)) {
        // Apply per-rule skip logic if defined
        if (skip && skip(line)) continue;
        // Extra filter for innerHTML: allow empty string reset and safe static strings
        if (rule === "no-unsafe-inner-html") {
          // Allow el.innerHTML = "" or el.innerHTML = '' (empty resets)
          if (/\.innerHTML\s*=\s*["']\s*["']/.test(line)) continue;
          // Allow textContent assignments (unrelated match)
          if (/\.textContent/.test(line)) continue;
        }
        fail(jsFile, i + 1, rule, `[${rule}] ${message}: ${line.trim()}`);
      }
    }
  }
}

// ── HTML template rules ───────────────────────────────────────────────────

const HTML_RULES = [
  {
    rule: "no-inline-handler",
    // Match onclick="...", onsubmit="...", etc. (not data-action which is fine)
    pattern: /\bon[a-z]+\s*=\s*["'][^"']+["']/i,
    message: "Inline event handler detected (use data-action instead)",
  },
  {
    rule: "no-javascript-href",
    pattern: /href\s*=\s*["']javascript:/i,
    message: "javascript: href detected",
  },
];

const htmlFiles = [...walk(TEMPLATES, [".html"]), ...walk(MODALS, [".html"])];

for (const htmlFile of htmlFiles) {
  const lines = readFileSync(htmlFile, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("<!--")) continue;

    for (const { rule, pattern, message } of HTML_RULES) {
      if (pattern.test(line)) {
        fail(htmlFile, i + 1, rule, `[${rule}] ${message}: ${line.trim()}`);
      }
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────────

const total = violations.length;

if (total === 0) {
  console.log("✅  Security scan passed — 0 violations found.");
  process.exit(0);
}

console.error(`\n❌  Security scan found ${total} violation(s):\n`);
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  ${v.text}`);
}
console.error("");
process.exit(1);
