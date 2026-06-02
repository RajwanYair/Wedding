// @ts-check
import { tmpdir } from "node:os";
import { join } from "node:path";

const TEMP_BASE = join(tmpdir(), "wedding-dev");

/**
 * Stryker Mutation Testing — Wedding Manager
 *
 * Scope: src/core/** + src/repositories/**
 * Runner: @stryker-mutator/vitest-runner
 *
 * Usage:
 *   npm run mutate          # full run
 *   npx stryker run --reporter clear-text
 */

/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
const config = {
  packageManager: "npm",
  testRunner: "vitest",
  testRunnerNodeArgs: ["--no-warnings"],

  // Vitest config file to use (inherits pool, environment, etc.)
  vitest: {
    configFile: "vite.config.js",
  },

  // Source files to mutate
  mutate: [
    "src/core/**/*.js",
    "src/repositories/**/*.js",
    // Exclude config/constants (no logic to mutate)
    "!src/core/config.js",
    "!src/core/constants.ts",
    "!src/core/defaults.js",
  ],

  // Test files Stryker should consider (unit tests only for speed)
  testFiles: [
    "tests/unit/**/*.test.mjs",
    "tests/unit/**/*.spec.mjs",
    "tests/integration/**/*.test.mjs",
    "tests/integration/**/*.spec.mjs",
  ],

  // Performance: use fork-based isolation (matches Vitest pool)
  concurrency: 2,
  timeoutMS: 30_000,
  timeoutFactor: 1.5,

  // Reporters
  reporters: ["clear-text", "html", "progress"],
  htmlReporter: {
    fileName: join(TEMP_BASE, "stryker-report/index.html"),
  },

  // Threshold — enforced for production readiness
  thresholds: {
    high: 80,
    low: 60,
    break: 60,
  },

  // Working dir for Stryker temp files
  tempDirName: join(TEMP_BASE, "stryker-tmp"),

  // Ignore these mutant types (they produce too many false positives)
  mutator: {
    excludedMutations: ["StringLiteral"],
  },
};

export default config;
