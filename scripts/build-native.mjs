#!/usr/bin/env node
/**
 * scripts/build-native.mjs — S698 Capacitor native build helper
 *
 * Validates environment, prints build steps, and optionally invokes
 * Capacitor CLI when the tools are available.
 *
 * Usage:
 *   node scripts/build-native.mjs                  # both platforms
 *   node scripts/build-native.mjs --platform ios
 *   node scripts/build-native.mjs --platform android
 *   node scripts/build-native.mjs --dry-run         # print steps only
 */

import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── Argument parsing ─────────────────────────────────────────────────────

const args = process.argv.slice(2);
const platformArg = args.find((a) => a.startsWith("--platform="))?.slice("--platform=".length)
  ?? (args.includes("--platform") ? args[args.indexOf("--platform") + 1] : null);
const dryRun = args.includes("--dry-run");
const platforms = platformArg ? [platformArg] : ["ios", "android"];

// ── Config check ─────────────────────────────────────────────────────────

const configPath = resolve(ROOT, "capacitor.config.json");
if (!existsSync(configPath)) {
  console.error("[build-native] ERROR: capacitor.config.json not found.");
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, "utf8"));
const appId = config.appId;
const appName = config.appName;
const webDir = config.webDir ?? "dist";

console.log(`\n[build-native] Capacitor Native Build`);
console.log(`  App ID    : ${appId}`);
console.log(`  App Name  : ${appName}`);
console.log(`  Web Dir   : ${webDir}`);
console.log(`  Platforms : ${platforms.join(", ")}`);
console.log(`  Dry run   : ${dryRun}`);
console.log("");

// ── Dist check ───────────────────────────────────────────────────────────

const distPath = resolve(ROOT, webDir);
if (!existsSync(distPath)) {
  if (dryRun) {
    console.log(`[build-native] [dry] Would run: npm run build`);
  } else {
    console.log(`[build-native] Running: npm run build ...`);
    const result = spawnSync("npm", ["run", "build"], { cwd: ROOT, stdio: "inherit", shell: true });
    if (result.status !== 0) {
      console.error("[build-native] ERROR: Vite build failed.");
      process.exit(result.status ?? 1);
    }
  }
}

// ── Capacitor availability check ─────────────────────────────────────────

/**
 * Check if a command is available.
 * @param {string} cmd
 * @returns {boolean}
 */
function commandAvailable(cmd) {
  try {
    execSync(`${cmd} --version`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

const hasCapCli = commandAvailable("npx cap");

// ── Build steps ──────────────────────────────────────────────────────────

/** @type {Array<{label: string, cmd: string, platform?: string}>} */
const steps = [
  { label: "cap sync (all)", cmd: "npx cap sync" },
  ...platforms.map((p) => ({ label: `cap add ${p}`, cmd: `npx cap add ${p}`, platform: p })),
  ...platforms.map((p) => ({ label: `cap sync ${p}`, cmd: `npx cap sync ${p}`, platform: p })),
  ...platforms.map((p) => ({
    label: `Build ${p}`,
    cmd: p === "android"
      ? "cd android && ./gradlew bundleRelease --no-daemon"
      : "xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Release -sdk iphoneos archive -archivePath ios/App/App.xcarchive",
    platform: p,
  })),
];

for (const step of steps) {
  if (step.platform && !platforms.includes(step.platform)) continue;

  if (dryRun || !hasCapCli) {
    console.log(`[build-native] [${dryRun ? "dry" : "skip — cap CLI not found"}] ${step.label}`);
    console.log(`    $ ${step.cmd}`);
  } else {
    console.log(`[build-native] Running: ${step.label}`);
    const r = spawnSync(step.cmd, { cwd: ROOT, stdio: "inherit", shell: true });
    if (r.status !== 0) {
      console.error(`[build-native] ERROR: Step "${step.label}" failed with exit code ${r.status}.`);
      process.exit(r.status ?? 1);
    }
  }
}

console.log("\n[build-native] Native build complete.");
console.log("  Next steps:");
if (platforms.includes("ios")) {
  console.log("    iOS  → open Xcode: npx cap open ios");
  console.log("    iOS  → TestFlight → Transporter or Xcode Organizer");
}
if (platforms.includes("android")) {
  console.log("    Android → open Android Studio: npx cap open android");
  console.log("    Android → Internal Testing → Google Play Console upload .aab");
}
