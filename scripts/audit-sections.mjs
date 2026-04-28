#!/usr/bin/env node
/**
 * scripts/audit-sections.mjs — BaseSection adoption checker (Sprint 40 / B1)
 *
 * Scans every src/sections/*.js file and reports whether it:
 *   ✅ Uses storeSubscribeScoped (preferred scoped lifecycle)
 *   ✅ Uses cleanupScope (proper mount/unmount teardown)
 *   ⚠  Uses legacy manual _unsubs pattern
 *   ❌ Has no scoped lifecycle at all
 *
 * Exit 0 always (advisory). CI sees this as an informational pass.
 * Run: node scripts/audit-sections.mjs
 */

import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SECTIONS_DIR = join(ROOT, "src", "sections");

const ANSI_RESET = "\x1b[0m";
const ANSI_GREEN = "\x1b[32m";
const ANSI_YELLOW = "\x1b[33m";
const ANSI_BOLD = "\x1b[1m";

/**
 * @param {string} color
 * @param {string} text
 */
const paint = (color, text) => `${color}${text}${ANSI_RESET}`;

const files = (await readdir(SECTIONS_DIR)).filter((f) => f.endsWith(".js"));

/** @type {{ file: string, status: string, icon: string }[]} */
const results = [];
let adoptedCount = 0;
let legacyCount = 0;
let noneCount = 0;

for (const file of files) {
  const src = await readFile(join(SECTIONS_DIR, file), "utf8");
  const hasScoped = src.includes("storeSubscribeScoped");
  const hasCleanup = src.includes("cleanupScope");
  const hasBaseSection = src.includes("BaseSection") && src.includes("fromSection");
  const hasLegacy = src.includes("_unsubs");

  let icon, status, category;
  if (hasScoped && hasCleanup) {
    icon = "✅";
    status = "fully adopted (storeSubscribeScoped + cleanupScope)";
    category = "adopted";
    adoptedCount++;
  } else if (hasBaseSection) {
    icon = "✅";
    status = "fully adopted (BaseSection + fromSection — scoped via section-base.js)";
    category = "adopted";
    adoptedCount++;
  } else if (hasScoped || hasCleanup) {
    icon = "🔶";
    status = `partial — ${hasScoped ? "has storeSubscribeScoped" : ""}${hasCleanup ? " has cleanupScope" : ""}`;
    category = "partial";
    legacyCount++;
  } else if (hasLegacy) {
    icon = "⚠️ ";
    status = "legacy _unsubs pattern (manual teardown)";
    category = "legacy";
    legacyCount++;
  } else {
    icon = "ℹ️ ";
    status = "no store subscriptions";
    category = "none";
    noneCount++;
  }

  results.push({ file, status, icon, category });
}

console.log(paint(ANSI_BOLD, `\n📋 Section Lifecycle Audit — ${files.length} sections scanned\n`));

for (const r of results) {
  const relPath = relative(ROOT, join(SECTIONS_DIR, r.file)).replaceAll("\\", "/");
  const coloredFile =
    r.category === "adopted"
      ? paint(ANSI_GREEN, relPath)
      : r.category === "legacy" || r.category === "partial"
        ? paint(ANSI_YELLOW, relPath)
        : relPath;
  console.log(`  ${r.icon} ${coloredFile}\n     └─ ${r.status}`);
}

console.log(
  `\n${paint(ANSI_BOLD, "Summary:")}  ${paint(ANSI_GREEN, `${adoptedCount} fully adopted`)}  ·  ${paint(ANSI_YELLOW, `${legacyCount} legacy/partial`)}  ·  ${noneCount} no-subscriptions\n`,
);

// Always exit 0 (advisory)
process.exit(0);
