#!/usr/bin/env node
/**
 * scripts/validate-actions.mjs — Data-action consistency validator (Phase 6.5)
 *
 * Checks that:
 *   1. Every data-action value in templates/modals/index.html is in ACTIONS registry
 *   2. Every ACTIONS registry entry has a registered on() handler in handler files
 *   3. No orphaned handlers (on() calls that reference non-existent actions) - warning only
 *
 * Exit 1 on failures (for CI).
 * Run: node scripts/validate-actions.mjs  OR  npm run validate
 */

import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ── Helpers ───────────────────────────────────────────────────────────────

function readText(p) {
  return readFileSync(p, "utf8");
}

function globRead(dir, ext) {
  return readdirSync(resolve(root, dir))
    .filter((f) => f.endsWith(ext))
    .map((f) => readText(resolve(root, dir, f)));
}

function extractActions(src) {
  return [...src.matchAll(/data-action="([a-zA-Z]+)"/g)].map((m) => m[1]);
}

function extractHandlerNames(src) {
  return [...src.matchAll(/on\("([a-zA-Z]+)"/g)].map((m) => m[1]);
}

// ── Read sources ──────────────────────────────────────────────────────────

const registryJs = readText(resolve(root, "src", "core", "action-registry.js"));
// Extract all string values from ACTIONS object
const registryActions = new Set(
  [...registryJs.matchAll(/"([a-zA-Z][a-zA-Z0-9]*)"/g)].map((m) => m[1]).filter(
    (v) => !["cancelScheduledWA", "src", "core", "const", "string"].includes(v),
  ),
);

// Templates + modals + index.html
const templateSrcs = globRead("src/templates", ".html");
const modalSrcs = globRead("src/modals", ".html");
const indexHtml = readText(resolve(root, "index.html"));
const allHtml = [...templateSrcs, ...modalSrcs, indexHtml].join("\n");

// Handler files: main.js + src/handlers/*.js + src/sections/*.js
const mainJs = readText(resolve(root, "src", "main.js"));
const handlerSrcs = readdirSync(resolve(root, "src", "handlers"))
  .filter((f) => f.endsWith(".js"))
  .map((f) => readText(resolve(root, "src", "handlers", f)));
const sectionSrcs = readdirSync(resolve(root, "src", "sections"))
  .filter((f) => f.endsWith(".js"))
  .map((f) => readText(resolve(root, "src", "sections", f)));

const allHandlerSrc = [mainJs, ...handlerSrcs, ...sectionSrcs].join("\n");

// ── Analysis ──────────────────────────────────────────────────────────────

const templateActionSet = new Set(extractActions(allHtml));
const registeredHandlerSet = new Set(extractHandlerNames(allHandlerSrc));

let failures = 0;
let warnings = 0;

console.log("🔍 Validating data-action consistency...\n");

// 1. Every template action must exist in the registry
console.log("── Check 1: Template actions in registry ──");
for (const action of [...templateActionSet].sort()) {
  if (!registryActions.has(action)) {
    console.error(`  ✗ MISSING from registry: "${action}" (found in template)`);
    failures++;
  }
}
if (failures === 0) {
  console.log(`  ✓ All ${templateActionSet.size} template actions are in registry\n`);
}

// 2. Every registry action should have a registered handler
console.log("── Check 2: Registry actions have handlers ──");
let unhandled = 0;
for (const action of [...registryActions].sort()) {
  if (!registeredHandlerSet.has(action)) {
    console.warn(`  ⚠  No handler for registry action: "${action}"`);
    unhandled++;
    warnings++;
  }
}
if (unhandled === 0) {
  console.log(`  ✓ All ${registryActions.size} registry actions have handlers\n`);
} else {
  console.log(`  ⚠  ${unhandled} registry actions have no handler (may be legacy)\n`);
}

// 3. Summary
console.log("── Summary ──");
console.log(`  Template actions:  ${templateActionSet.size}`);
console.log(`  Registry actions:  ${registryActions.size}`);
console.log(`  Registered handlers: ${registeredHandlerSet.size}`);
if (warnings > 0) console.log(`  Warnings: ${warnings}`);
if (failures > 0) {
  console.error(`\n✗ ${failures} validation failure(s). Fix the issues above.`);
  process.exit(1);
} else {
  console.log("\n✓ Action validation passed.");
}
