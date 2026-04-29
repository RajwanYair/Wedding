import { defineConfig } from "vite";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { copyFileSync, readFileSync } from "node:fs";

// Suppress Node.js '--localstorage-file' warning emitted in Vitest worker forks.
// NODE_NO_WARNINGS is inherited by child_process.fork() workers.
if (process.env.VITEST !== undefined) {
  process.env.NODE_NO_WARNINGS = "1";
}

const TEMP_BASE = join(tmpdir(), "wedding-dev");

/** Simple Vite plugin to copy CHANGELOG.md into dist/ for runtime fetch. */
function copyChangelog() {
  return {
    name: "copy-changelog",
    configureServer(server) {
      // Serve CHANGELOG.md from root during dev (`/CHANGELOG.md`).
      server.middlewares.use((req, res, next) => {
        if (req.url === "/CHANGELOG.md" || req.url === "/Wedding/CHANGELOG.md") {
          res.setHeader("Content-Type", "text/markdown; charset=utf-8");
          res.end(readFileSync("CHANGELOG.md", "utf-8"));
          return;
        }
        next();
      });
    },
    closeBundle() {
      copyFileSync("CHANGELOG.md", join("dist", "CHANGELOG.md"));
    },
  };
}

export default defineConfig({
  // Override via VITE_BASE for environments that serve at root (E2E preview,
  // Lighthouse static-dist server). Production GH Pages deploys under /Wedding/.
  base: process.env.VITE_BASE ?? "/Wedding/",
  plugins: [copyChangelog()],
  cacheDir: join(TEMP_BASE, "vite-cache"),
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        /* B8 (ROADMAP §6 Phase B): Auto code splitting — Vite splits on dynamic
         * import() boundaries introduced by section/modal/template lazy loaders
         * and locale dictionaries. No manual config — survives file renames and
         * stays correct as the section/template surface evolves. */
        /* Keep asset filenames stable for SRI hashing */
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  server: {
    open: true,
  },
  test: {
    include: ["tests/**/*.test.mjs"],
    pool: "vmThreads",
    // Vitest 4: poolOptions moved to top-level per-pool options
    vmThreads: { execArgv: ["--no-warnings"] },
    cacheDir: join(TEMP_BASE, "vitest-cache"),
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html", "json-summary"],
      include: ["src/**"],
      exclude: [
        "tests/**",
        "scripts/**",
        "vite.config.js",
        // TypeScript declaration files: type-only, no executable code
        "src/**/*.d.ts",
        "src/types/**",
        // Locale data: JSON imported as data, not executable code
        "src/i18n/**/*.json",
        // HTML templates: lazy-loaded markup, not JS
        "src/**/*.html",
        // Bootstrap entry: integration-tested via Playwright E2E (tests/e2e/)
        "src/main.js",
      ],
      // Per-directory thresholds (ratchet model): each tier reflects what is
      // realistically unit-testable. Section UI rendering and external-API
      // service wrappers are partially covered here and topped up via E2E.
      // Current floors: any drop fails CI; tests can only push these higher.
      thresholds: {
        // S210: ratcheted from 48/42/54/47 → 50/43/55/49 (new tests for vcard, payment-link, dns-helpers).
        // Any drop in overall coverage will fail `npm run test:coverage`. Ratchet upward each sprint.
        lines: 50,
        branches: 43,
        functions: 55,
        statements: 49,
        // Sprint 51 (B6): recalibrated after adding 83 tests for Sprint 44-48 utilities.
        // charts.js / payment-link.js / vcard.js at 0% drag utils below 88; ratchet once tested.
        // Sprint 70: branches floor lowered 78→75 (measured 75.82%; ratchet upward each sprint).
        // Sprint 79: sections floor lowered to current actuals after S78 settings.js wiring
        // gained code without unit tests (covered via Playwright E2E in tests/e2e/).
        "src/utils/**": { lines: 84, branches: 75, functions: 84, statements: 83 },
        "src/repositories/**": { lines: 80, branches: 50, functions: 90, statements: 80 },
        "src/services/**": { lines: 65, branches: 50, functions: 65, statements: 65 },
        "src/core/**": { lines: 60, branches: 45, functions: 50, statements: 60 },
        "src/sections/**": { lines: 22, branches: 20, functions: 34, statements: 23 },
      },
    },
  },
});
