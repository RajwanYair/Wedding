#!/usr/bin/env node
/**
 * Trusted Types Audit (Phase 1, advisory) — ADR-018
 *
 * Greps `src/**` for known DOM sink usages that would violate a future
 * `require-trusted-types-for 'script'` policy. Currently advisory: emits a
 * JSON report and exits 0. Becomes a hard gate in v12.0.0 alongside the
 * named `wedding-html` policy in `src/utils/sanitize.js`.
 *
 * Sinks tracked (per W3C Trusted Types spec):
 *   - innerHTML / outerHTML assignments
 *   - document.write / document.writeln
 *   - insertAdjacentHTML
 *   - eval / new Function
 *   - setAttribute('on...', …) inline event handlers
 *
 * The script tolerates sinks routed through `src/utils/sanitize.js` because
 * that module is the chosen seam (it will host the named policy).
 */
import { readFileSync, statSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const ALLOWLIST_FILES = new Set([
  // Will host the named Trusted Types policy in Phase 2 (ADR-018).
  join("src", "utils", "sanitize.js"),
]);

const sinkPatterns = [
  { name: "innerHTML", re: /\.innerHTML\s*=/g },
  { name: "outerHTML", re: /\.outerHTML\s*=/g },
  { name: "insertAdjacentHTML", re: /\.insertAdjacentHTML\s*\(/g },
  { name: "document.write", re: /\bdocument\.writeln?\s*\(/g },
  { name: "eval", re: /\beval\s*\(/g },
  { name: "newFunction", re: /\bnew\s+Function\s*\(/g },
  { name: "inlineEvent", re: /setAttribute\s*\(\s*["']on\w+["']/g },
];

const findings = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (entry === "node_modules" || entry === "dist") continue;
      walk(p);
    } else if (s.isFile() && p.endsWith(".js")) {
      scanFile(p);
    }
  }
}

function scanFile(absPath) {
  const rel = relative(ROOT, absPath).split(sep).join("/");
  const relWindowsCheck = relative(ROOT, absPath);
  if (ALLOWLIST_FILES.has(relWindowsCheck)) return;
  const src = readFileSync(absPath, "utf8");
  for (const { name, re } of sinkPatterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) {
      const lineNo = src.slice(0, m.index).split("\n").length;
      findings.push({ file: rel, line: lineNo, sink: name, snippet: m[0] });
    }
  }
}

walk(SRC);

const grouped = findings.reduce((acc, f) => {
  acc[f.sink] = (acc[f.sink] ?? 0) + 1;
  return acc;
}, {});

const report = {
  total: findings.length,
  bySink: grouped,
  files: [...new Set(findings.map((f) => f.file))].sort(),
  findings: findings.slice(0, 50),
};

console.log(JSON.stringify(report, null, 2));
console.log(
  `audit:trusted-types — ${findings.length} potential sink usages across ${report.files.length} files (advisory; ADR-018 Phase 1).`,
);
process.exit(0);
