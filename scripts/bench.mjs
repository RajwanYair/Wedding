#!/usr/bin/env node
/**
 * scripts/bench.mjs — Store mutation micro-benchmark (Phase 11.2)
 *
 * Measures how long it takes to storeSet + read back N guests.
 * Usage: node scripts/bench.mjs [--sizes 1000,5000,10000]
 *
 * Output (example):
 *   Benchmark: storeSet("guests", N) + storeGet("guests")
 *   ┌──────────┬──────────┬────────────┐
 *   │  N items │  Time ms │  Items/ms  │
 *   ├──────────┼──────────┼────────────┤
 *   │    1 000 │     2.10 │  476.19    │
 *   │    5 000 │     8.84 │  565.61    │
 *   │   10 000 │    17.31 │  577.93    │
 *   └──────────┴──────────┴────────────┘
 */

import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import path from "node:path";

// ── Resolve shared node_modules from parent directory ─────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const _ROOT = path.resolve(__dirname, "..");

// ── Minimal in-memory store shim (no DOM/localStorage) ───────────────────
const _store = /** @type {Map<string, unknown>} */ (new Map());

function storeSet(key, value) {
  _store.set(key, value);
}
function storeGet(key) {
  return _store.get(key);
}

// ── Guest factory ─────────────────────────────────────────────────────────
function makeGuests(n) {
  const statuses = ["pending", "confirmed", "declined", "maybe"];
  const sides = ["groom", "bride", "mutual"];
  const meals = ["regular", "vegetarian", "vegan", "gluten_free"];
  const guests = [];
  for (let i = 0; i < n; i++) {
    guests.push({
      id: `g_${i}`,
      firstName: `Guest${i}`,
      lastName: `Family${i % 100}`,
      phone: `97250${String(i).padStart(7, "0")}`,
      status: statuses[i % statuses.length],
      side: sides[i % sides.length],
      meal: meals[i % meals.length],
      count: (i % 4) + 1,
      tableId: i % 20 === 0 ? null : `t_${i % 20}`,
    });
  }
  return guests;
}

// ── Benchmark runner ──────────────────────────────────────────────────────
const RUNS = 5; // warm-up + average

/**
 * @param {number} n
 * @returns {{ n: number, avgMs: number }}
 */
function runBench(n) {
  const guests = makeGuests(n);
  const times = [];
  for (let run = 0; run < RUNS; run++) {
    const t0 = performance.now();
    storeSet("guests", guests);
    const result = storeGet("guests");
    const t1 = performance.now();
    // Ensure result isn't optimised away
    if (!Array.isArray(result)) throw new Error("Store read failed");
    times.push(t1 - t0);
  }
  // Discard min + max, average the rest
  times.sort((a, b) => a - b);
  const trimmed = times.slice(1, RUNS - 1);
  const avg = trimmed.reduce((s, v) => s + v, 0) / trimmed.length;
  return { n, avgMs: avg };
}

// ── Parse CLI ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const sizesIdx = args.indexOf("--sizes");
const defaultSizes = [1000, 5000, 10000];
const sizes = sizesIdx >= 0
  ? (args[sizesIdx + 1] ?? "").split(",").map(Number).filter(Boolean)
  : defaultSizes;

// ── Run all benchmarks ────────────────────────────────────────────────────
console.log(`\nBenchmark: storeSet("guests", N) + storeGet("guests")`);
console.log(`Runs per size: ${RUNS} (trim min+max, average middle ${RUNS - 2})\n`);

const rows = sizes.map(runBench);

// ── Pretty print table ────────────────────────────────────────────────────
const COL_N   = 10;
const COL_MS  = 10;
const COL_IPS = 12;

function pad(str, len, right = false) {
  return right ? String(str).padStart(len) : String(str).padEnd(len);
}

const LINE = `${"─".repeat(COL_N + 2)}┼${"─".repeat(COL_MS + 2)}┼${"─".repeat(COL_IPS + 2)}`;

console.log(`┌${"─".repeat(COL_N + 2)}┬${"─".repeat(COL_MS + 2)}┬${"─".repeat(COL_IPS + 2)}┐`);
console.log(`│ ${pad("N items", COL_N)} │ ${pad("Time ms", COL_MS)} │ ${pad("Items/ms", COL_IPS)} │`);
console.log(`├${LINE}┤`);

for (const { n, avgMs } of rows) {
  const ips = avgMs > 0 ? (n / avgMs).toFixed(0) : "∞";
  console.log(`│ ${pad(n.toLocaleString(), COL_N, true)} │ ${pad(avgMs.toFixed(3), COL_MS, true)} │ ${pad(ips, COL_IPS, true)} │`);
}

console.log(`└${"─".repeat(COL_N + 2)}┴${"─".repeat(COL_MS + 2)}┴${"─".repeat(COL_IPS + 2)}┘\n`);
