import { defineConfig } from "vite";
import { join, resolve } from "node:path";
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
    // Stub optional peer deps that are not installed in the test environment.
    // @sentry/browser is lazy-imported in observability.js; the .catch(() => null)
    // handles the runtime case, but vite:import-analysis needs a resolvable path.
    alias: [{ find: "@sentry/browser", replacement: resolve("tests/stubs/sentry-browser.mjs") }],
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
        // S303: ratcheted to floor(actual). Stmts | Branch | Funcs | Lines column order.
        // Measured: stmts 49.84%, branches 45.46%, functions 55.98%, lines 50.27%.
        // S314 uplift (v13.13.0): stmts ~50.8%, branches ~45.6%, functions ~56.6%, lines ~51.3%.
        // S324 uplift (v13.14.0): stmts ~52.62%, branches ~46.76%, functions ~59.31%, lines ~53.17%.
        lines: 53,
        branches: 46,
        functions: 58,
        statements: 52,
        // S234 + S289: per-directory ratchet to measured floors (floor(actual)).
        "src/utils/**": { lines: 90, branches: 80, functions: 86, statements: 88 },
        "src/repositories/**": { lines: 95, branches: 54, functions: 97, statements: 83 },
        "src/services/**": { lines: 75, branches: 64, functions: 74, statements: 73 },
        "src/core/**": { lines: 69, branches: 58, functions: 58, statements: 65 },
        "src/sections/**": { lines: 20, branches: 20, functions: 32, statements: 20 },
      },
    },
  },
});
