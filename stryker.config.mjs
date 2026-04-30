// @ts-check
/**
 * Stryker Mutation Testing — Wedding Manager (S406 pilot)
 *
 * Scope: src/core/** + src/repositories/**
 * Runner: @stryker-mutator/vitest-runner
 *
 * Usage:
 *   npm run mutate          # full pilot run
 *   npx stryker run --reporter clear-text
 *
 * Mutation score thresholds (pilot — not enforced in CI yet):
 *   high ≥ 80 | low ≥ 60 | break ≥ 0 (no CI break for now)
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
    "!src/core/constants.js",
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
    // Output to .stryker-tmp so it's gitignored
    fileName: ".stryker-tmp/reports/mutation/index.html",
  },

  // Threshold (pilot: warn only — no CI break yet)
  thresholds: {
    high: 80,
    low: 60,
    break: null,
  },

  // Working dir for Stryker temp files
  tempDirName: ".stryker-tmp",

  // Ignore these mutant types (they produce too many false positives)
  mutator: {
    excludedMutations: ["StringLiteral"],
  },
};

export default config;
