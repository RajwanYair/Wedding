/**
 * dedup-imports.mjs — Remove duplicate import statements from merged service files.
 * Used after S209 service consolidation merges.
 */
import { readFileSync, writeFileSync } from "node:fs";

const MERGED_FILES = [
  "src/services/dns-helpers.js",
  "src/services/message-tools.js",
  "src/services/state-tracking.js",
  "src/services/ci-helpers.js",
  "src/services/crypto-security.js",
  "src/services/db-diagnostics.js",
  "src/services/delivery-service.js",
];

const IMPORT_RE = /^import\s*\{([^}]+)\}\s*from\s*(['"][^'"]+['"])/;

for (const file of MERGED_FILES) {
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");
  /** @type {Map<string, Set<string>>} module specifier → seen names */
  const seen = new Map();
  /** @type {Map<string, number>} module specifier → line index in output */
  const lineIdx = new Map();
  const out = [];
  let dupes = 0;

  for (const line of lines) {
    const m = IMPORT_RE.exec(line);
    if (m) {
      const names = m[1]
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean)
        .sort();
      const mod = m[2];
      if (!seen.has(mod)) {
        seen.set(mod, new Set(names));
        lineIdx.set(mod, out.length);
        out.push(line);
      } else {
        const existing = seen.get(mod);
        const newNames = names.filter((n) => !existing.has(n));
        if (newNames.length > 0) {
          const idx = lineIdx.get(mod);
          const prev = IMPORT_RE.exec(out[idx]);
          if (prev) {
            const allNames = [
              ...prev[1].split(",").map((n) => n.trim()).filter(Boolean),
              ...newNames,
            ].sort();
            out[idx] = `import { ${allNames.join(", ")} } from ${mod};`;
            newNames.forEach((n) => existing.add(n));
          }
        }
        dupes++;
      }
    } else {
      out.push(line);
    }
  }

  if (dupes > 0) {
    writeFileSync(file, out.join("\n"), "utf8");
    console.log(`Deduped ${dupes} duplicate import(s) in ${file}`);
  } else {
    console.log(`No duplicates in ${file}`);
  }
}
