#!/usr/bin/env node
/**
 * scripts/check-bundle-size.mjs — Per-chunk gzip budget audit (ADR-024).
 *
 * Walks `dist/` after `npm run build`, gzips each .js/.css file, and reports
 * any chunk that exceeds its budget.
 *
 * Advisory mode (default): always exits 0.
 * Enforcing mode: pass `--enforce` to exit 1 on any over-budget chunk.
 *
 * Budgets are gzip kilobytes (1024-byte KB).
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, extname, basename, dirname, resolve as pResolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const DIST = "dist";
const BUDGETS = {
  initial: 60, // entry + critical CSS combined
  perRoute: 25, // any single section JS chunk
  perModal: 10, // any modal chunk
  total: 220, // sum of all gzip chunks
};

const OVERRIDE_FILE = pResolve(
  dirname(fileURLToPath(import.meta.url)),
  "bundle.budget.json",
);

function loadOverrides() {
  if (!existsSync(OVERRIDE_FILE)) return {};
  try {
    return JSON.parse(readFileSync(OVERRIDE_FILE, "utf8")).overrides ?? {};
  } catch {
    return {};
  }
}

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (/\.(js|css)$/i.test(entry)) out.push(full);
  }
  return out;
}

function gzipKb(file) {
  const buf = readFileSync(file);
  return gzipSync(buf, { level: 9 }).length / 1024;
}

function classify(file) {
  const name = basename(file).toLowerCase();
  if (name.startsWith("modal") || name.includes("-modal")) return "perModal";
  if (name.startsWith("index") || name.startsWith("main") || name.startsWith("entry")) return "initial";
  if (extname(name) === ".css") return "initial";
  return "perRoute";
}

function main() {
  const args = new Set(process.argv.slice(2));
  const enforce = args.has("--enforce");
  const overrides = loadOverrides();

  const files = walk(DIST);
  if (files.length === 0) {
    console.log("[bundle-size] no dist/ found — run `npm run build` first.");
    process.exit(enforce ? 1 : 0);
  }

  let total = 0;
  const violations = [];
  console.log("\n[bundle-size] gzip report (KB):");
  console.log("─".repeat(60));
  for (const f of files) {
    const kb = gzipKb(f);
    total += kb;
    const tier = classify(f);
    const name = basename(f);
    const budget = overrides[name] ?? BUDGETS[tier];
    const flag = kb > budget ? " ⚠️  OVER" : "";
    console.log(`  ${name.padEnd(40)} ${kb.toFixed(1).padStart(6)} / ${String(budget).padStart(3)} (${tier})${flag}`);
    if (kb > budget) violations.push({ name, kb, budget, tier });
  }
  console.log("─".repeat(60));
  console.log(`  ${"TOTAL".padEnd(40)} ${total.toFixed(1).padStart(6)} / ${String(BUDGETS.total).padStart(3)}`);
  if (total > BUDGETS.total) violations.push({ name: "TOTAL", kb: total, budget: BUDGETS.total, tier: "total" });

  if (violations.length === 0) {
    console.log("\n[bundle-size] ✅ all budgets met.");
    process.exit(0);
  }
  console.log(`\n[bundle-size] ⚠️  ${violations.length} budget violation(s).`);
  process.exit(enforce ? 1 : 0);
}

main();
