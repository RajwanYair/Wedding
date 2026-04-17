#!/usr/bin/env node
/**
 * scripts/generate-changelog.mjs — Sprint 141
 *
 * Generate a Markdown CHANGELOG skeleton from git log.
 * Usage: node scripts/generate-changelog.mjs [--since <tag>] [--out <file>]
 *
 * Options:
 *   --since <tag>   Start from this git ref (default: last tag)
 *   --out <file>    Output file path (default: stdout)
 *   --dry-run       Print to stdout even if --out is set
 */

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const args = process.argv.slice(2);

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

const DRY_RUN = args.includes("--dry-run");
const outFile = getArg("--out");
let since    = getArg("--since");

if (!since) {
  try {
    since = execSync("git describe --tags --abbrev=0", { encoding: "utf8" }).trim();
  } catch {
    since = null;
  }
}

const range = since ? `${since}..HEAD` : "HEAD";

/** @type {string} */
let log;
try {
  log = execSync(
    `git log ${range} --pretty=format:"%h %s" --no-merges`,
    { encoding: "utf8" },
  ).trim();
} catch {
  console.error("Failed to read git log.");
  process.exit(1);
}

if (!log) {
  console.log("No commits since", since ?? "beginning");
  process.exit(0);
}

const lines = log.split("\n").map((line) => {
  const spaceIdx = line.indexOf(" ");
  const hash    = line.slice(0, spaceIdx);
  const subject = line.slice(spaceIdx + 1);
  return `- ${subject} (${hash})`;
});

const today = new Date().toISOString().slice(0, 10);
const version = getArg("--version") ?? "NEXT";
const output = [
  `## [${version}] — ${today}`,
  "",
  "### Changes",
  "",
  ...lines,
  "",
].join("\n");

if (outFile && !DRY_RUN) {
  writeFileSync(outFile, output, "utf8");
  console.log(`Wrote changelog to ${outFile}`);
} else {
  process.stdout.write(output);
}
